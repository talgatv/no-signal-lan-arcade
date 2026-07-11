/**
 * peer-manager.js — WebRTC transport for Video Broadcast.
 *
 * One RTCPeerConnection per remote room member ("peer"), exactly like P2P
 * File Share (programs/p2p-share/client/peer-manager.js) — this file is
 * adapted directly from that one. The connection-setup, glare-handling and
 * signaling plumbing below is intentionally near-verbatim: it doesn't care
 * whether the connection ends up carrying a data channel or media tracks.
 *
 * What's different from P2P File Share: broadcasting is ambient/continuous
 * rather than a one-off action, so connections can't be created lazily "the
 * first time we need to talk to them" the way a file send can. Two
 * situations need a *proactive* connection:
 *
 *   1. Start-broadcasting: the app must call getOrCreatePeer() for every
 *      peer already in the room, then setLocalStream() to attach tracks to
 *      all of them.
 *   2. A new peer joins while we're already broadcasting: the app must call
 *      getOrCreatePeer() for just that new peer.
 *
 * Both situations funnel through the same mechanism: getOrCreatePeer()
 * always calls syncLocalStream() on the connection it creates or returns,
 * which attaches whatever the current local stream's tracks are (a no-op if
 * they're already attached, or if there's no local stream because we're not
 * broadcasting). That single rule is what makes a late joiner able to see
 * an already-broadcasting participant — nothing else has to special-case
 * "new peer" vs. "existing peer".
 *
 * Signaling (offer/answer/ICE) rides the existing OGHNet room relay, same
 * as P2P File Share — see that program's README.md and
 * docs/architecture/MULTIPLAYER.md. No STUN/TURN is configured on purpose:
 * this app only ever talks to devices on the same LAN room, and ICE will
 * only ever gather "host" candidates. The action names (`webrtc-offer`,
 * `webrtc-answer`, `webrtc-ice`) are reused unchanged from P2P File Share —
 * that's safe even if both programs are open in the same room at once,
 * because delivery is already gated by an exact `payload.to === playerId`
 * match, not by action name (see P2P File Share's README, "Mixed-program
 * rooms").
 *
 * Glare (both sides opening a connection to each other at once) is resolved
 * with the standard "perfect negotiation" pattern: for any peer pair, the
 * side with the lexicographically smaller player id is "polite" and rolls
 * back its own offer in favor of the incoming one; the other side ignores
 * the incoming offer and keeps its own. Both sides compute the same
 * polite/impolite roles independently, no extra messages needed. This is
 * exactly as likely here as in P2P File Share — e.g. two participants who
 * both click "Start broadcasting" at the same moment will each try to open
 * a connection to the other simultaneously.
 *
 * Media instead of data: pc.addTrack(track, stream) replaces
 * pc.createDataChannel(...); pc.ontrack replaces pc.ondatachannel. addTrack
 * triggers onnegotiationneeded automatically, same as opening a fresh data
 * channel would, so the offer/answer plumbing needs no changes to work for
 * either transport. pc.getSenders()...replaceTrack() (used for camera flip)
 * swaps the outgoing video with no renegotiation at all — that's the point
 * of using it instead of removeTrack+addTrack for a flip.
 *
 * IMPORTANT — Stop-broadcasting does not close connections: clearLocalStream()
 * removes/stops our own outgoing tracks on every connection, but deliberately
 * leaves the RTCPeerConnection itself open. The same connection may still be
 * carrying an incoming broadcast *from* that peer (stopping your own camera
 * doesn't mean you stop watching everyone else's), so closing it here would
 * be wrong. Connections are only closed on actual room-leave (removePeer,
 * driven by an ogh-net players/presence change), connectionState
 * 'failed'/'closed', or page unload (destroy()).
 */

const RTC_CONFIG = { iceServers: [] }; // LAN-only by design — no STUN/TURN

/**
 * @param {{ net: object, hooks?: object }} opts
 */
export function createPeerManager({ net, hooks = {} }) {
  const peers = new Map(); // peerId -> entry
  let localStream = null; // current outgoing MediaStream, or null while not broadcasting

  function call(name, arg) {
    try {
      hooks[name]?.(arg);
    } catch (e) {
      console.warn('[video-broadcast] hook error', name, e);
    }
  }

  function isPolite(peerId) {
    return String(net.playerId) < String(peerId);
  }

  /** Attach every local track to this one connection that isn't already attached to it. */
  function syncLocalStream(entry) {
    if (!localStream) return;
    const attached = new Set(entry.pc.getSenders().map((s) => s.track).filter(Boolean));
    for (const track of localStream.getTracks()) {
      if (!attached.has(track)) {
        try {
          entry.pc.addTrack(track, localStream);
        } catch (err) {
          console.warn('[video-broadcast] addTrack error', entry.peerId, err);
        }
      }
    }
  }

  function getOrCreatePeer(peerId) {
    let entry = peers.get(peerId);
    if (entry && (entry.pc.connectionState === 'failed' || entry.pc.connectionState === 'closed')) {
      removePeer(peerId);
      entry = null;
    }
    if (entry) {
      syncLocalStream(entry); // idempotent — no-op if already attached or nothing to broadcast
      return entry;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    entry = {
      pc,
      peerId,
      polite: isPolite(peerId),
      makingOffer: false,
      ignoreOffer: false,
      remoteSet: false,
      candidateQueue: [],
    };
    peers.set(peerId, entry);
    call('onPeerState', { peerId, state: 'connecting' });

    pc.onnegotiationneeded = async () => {
      console.log('[video-broadcast] negotiationneeded', peerId, 'signalingState=', pc.signalingState);
      try {
        entry.makingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        console.log('[video-broadcast] sent offer', peerId);
        net.send('webrtc-offer', { to: peerId, sdp: pc.localDescription.sdp });
      } catch (err) {
        console.warn('[video-broadcast] negotiationneeded error', peerId, err);
      } finally {
        entry.makingOffer = false;
      }
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      net.send('webrtc-ice', { to: peerId, candidate: ev.candidate.toJSON() });
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[video-broadcast] ice state', peerId, pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[video-broadcast] connection state', peerId, pc.connectionState);
      if (pc.connectionState === 'connected') call('onPeerState', { peerId, state: 'connected' });
      else if (pc.connectionState === 'failed') call('onPeerState', { peerId, state: 'failed' });
      else if (pc.connectionState === 'closed') call('onPeerState', { peerId, state: 'closed' });
      else if (pc.connectionState === 'connecting') call('onPeerState', { peerId, state: 'connecting' });
    };

    pc.ontrack = (ev) => {
      console.log('[video-broadcast] ontrack', peerId, ev.track.kind);
      call('onTrack', { peerId, stream: ev.streams[0] || null, track: ev.track });
    };

    // Proactively attach current local media, if any — covers both the
    // "connecting to everyone already in the room at Start-broadcasting
    // time" and "someone new joined while we're already broadcasting"
    // cases with one mechanism (see file header).
    syncLocalStream(entry);

    return entry;
  }

  /** Start (or restart) broadcasting: attach every track of `stream` to every existing connection. */
  function setLocalStream(stream) {
    localStream = stream;
    for (const entry of peers.values()) syncLocalStream(entry);
  }

  /**
   * Stop broadcasting: remove our outgoing tracks from every connection.
   * Connections themselves stay open — see file header "Stop-broadcasting
   * does not close connections".
   */
  function clearLocalStream() {
    for (const entry of peers.values()) {
      for (const sender of entry.pc.getSenders()) {
        if (sender.track) {
          try {
            entry.pc.removeTrack(sender);
          } catch (err) {
            console.warn('[video-broadcast] removeTrack error', entry.peerId, err);
          }
        }
      }
    }
    localStream = null;
  }

  /** Camera flip: swap the outgoing video track on every connection, no renegotiation needed. */
  function replaceVideoTrack(newTrack) {
    for (const entry of peers.values()) {
      const sender = entry.pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender
          .replaceTrack(newTrack)
          .catch((err) => console.warn('[video-broadcast] replaceTrack error', entry.peerId, err));
      }
    }
  }

  async function flushCandidates(entry) {
    const queue = entry.candidateQueue;
    entry.candidateQueue = [];
    for (const c of queue) {
      try {
        await entry.pc.addIceCandidate(c);
      } catch (err) {
        console.warn('[video-broadcast] queued candidate error', entry.peerId, err);
      }
    }
  }

  async function handleSignal({ action, payload, from }) {
    if (!payload || payload.to !== net.playerId || !from) return;
    const peerId = from;
    if (action === 'webrtc-offer' || action === 'webrtc-answer') {
      const entry = getOrCreatePeer(peerId);
      const isOffer = action === 'webrtc-offer';
      const description = { type: isOffer ? 'offer' : 'answer', sdp: payload.sdp };
      const collision = isOffer && (entry.makingOffer || entry.pc.signalingState !== 'stable');
      entry.ignoreOffer = !entry.polite && collision;
      if (entry.ignoreOffer) {
        console.log('[video-broadcast] ignoring colliding offer from', peerId, '(impolite)');
        return;
      }
      try {
        if (collision && entry.polite) {
          console.log('[video-broadcast] rolling back local offer, accepting incoming offer from', peerId, '(polite)');
          await Promise.all([
            entry.pc.setLocalDescription({ type: 'rollback' }),
            entry.pc.setRemoteDescription(description),
          ]);
        } else {
          await entry.pc.setRemoteDescription(description);
        }
        entry.remoteSet = true;
        await flushCandidates(entry);
        if (isOffer) {
          const answer = await entry.pc.createAnswer();
          await entry.pc.setLocalDescription(answer);
          net.send('webrtc-answer', { to: peerId, sdp: entry.pc.localDescription.sdp });
        }
      } catch (err) {
        console.warn('[video-broadcast] signal handling error', peerId, err);
      }
    } else if (action === 'webrtc-ice') {
      const entry = getOrCreatePeer(peerId);
      if (!payload.candidate) return;
      if (!entry.remoteSet) {
        entry.candidateQueue.push(payload.candidate);
        return;
      }
      try {
        await entry.pc.addIceCandidate(payload.candidate);
      } catch (err) {
        if (!entry.ignoreOffer) console.warn('[video-broadcast] addIceCandidate error', peerId, err);
      }
    }
  }

  function removePeer(peerId) {
    const entry = peers.get(peerId);
    if (!entry) return;
    try {
      entry.pc.close();
    } catch {
      /* already closed */
    }
    peers.delete(peerId);
  }

  function destroy() {
    for (const id of Array.from(peers.keys())) removePeer(id);
    localStream = null;
  }

  return {
    getOrCreatePeer,
    setLocalStream,
    clearLocalStream,
    replaceVideoTrack,
    handleSignal,
    removePeer,
    destroy,
  };
}
