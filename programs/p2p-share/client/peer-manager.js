/**
 * peer-manager.js — WebRTC transport for P2P File Share.
 *
 * One RTCPeerConnection per remote room member ("peer"), created lazily the
 * first time we need to talk to them (either we initiate a send, or we
 * receive a signaling message from them). Every subsequent file transfer to
 * an already-connected peer opens a fresh RTCDataChannel on the *same*
 * connection — additional data channels are negotiated in-band (DCEP) once
 * the underlying SCTP association exists, so no extra signaling round trip
 * is needed per file. If a browser ever *did* require renegotiation for a
 * later channel, `onnegotiationneeded` fires again and is handled by the
 * same offer/answer path below, so correctness does not depend on which
 * behavior a given browser implements.
 *
 * Signaling (offer/answer/ICE) rides the existing OGHNet room relay — see
 * README.md and docs/architecture/MULTIPLAYER.md. No STUN/TURN is
 * configured on purpose: this app only ever talks to devices on the same
 * LAN room, and ICE will only ever gather "host" candidates.
 *
 * Glare (both sides opening a connection to each other at once, before
 * either exists yet) is resolved with the standard "perfect negotiation"
 * pattern: for any peer pair, the side with the lexicographically smaller
 * player id is "polite" and rolls back its own offer in favor of the
 * incoming one; the other side ignores the incoming offer and keeps its own.
 * Both sides compute the same polite/impolite roles independently, with no
 * extra messages needed.
 */

const CHUNK_SIZE = 16 * 1024; // 16 KiB per chunk — chunked well below the
// browser datachannel message ceiling (commonly cited as ~256 KiB) so
// backpressure/progress stay fine-grained and behavior is consistent across
// the range of devices this project targets (see README "Design notes").
const HIGH_WATER = 1024 * 1024; // pause sending above this much buffered
const LOW_WATER = 256 * 1024; // resume once buffered drops below this
const CONNECT_TIMEOUT_MS = 15000; // give up on an unopened data channel
const RTC_CONFIG = { iceServers: [] }; // LAN-only by design — no STUN/TURN

function makeTransferId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Prefix a 4-byte big-endian sequence number onto a chunk's bytes. */
function packChunk(seq, bytes) {
  const buf = new ArrayBuffer(4 + bytes.byteLength);
  new DataView(buf).setUint32(0, seq, false);
  new Uint8Array(buf, 4).set(new Uint8Array(bytes));
  return buf;
}

function unpackChunk(buf) {
  const seq = new DataView(buf).getUint32(0, false);
  return { seq, data: buf.slice(4) };
}

function waitForOpen(channel, timeoutMs) {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => {
      channel.removeEventListener('open', onOpen);
      channel.removeEventListener('error', onErr);
      reject(new Error('timeout'));
    }, timeoutMs);
    const onOpen = () => {
      clearTimeout(to);
      channel.removeEventListener('error', onErr);
      resolve();
    };
    const onErr = (e) => {
      clearTimeout(to);
      channel.removeEventListener('open', onOpen);
      reject(e);
    };
    channel.addEventListener('open', onOpen, { once: true });
    channel.addEventListener('error', onErr, { once: true });
  });
}

function waitBufferedLow(channel) {
  return new Promise((resolve) => {
    channel.bufferedAmountLowThreshold = LOW_WATER;
    channel.addEventListener(
      'bufferedamountlow',
      () => resolve(),
      { once: true }
    );
  });
}

/**
 * @param {{ net: object, hooks?: object }} opts
 */
export function createPeerManager({ net, hooks = {} }) {
  const peers = new Map(); // peerId -> entry

  function call(name, arg) {
    try {
      hooks[name]?.(arg);
    } catch (e) {
      console.warn('[p2p] hook error', name, e);
    }
  }

  function isPolite(peerId) {
    return String(net.playerId) < String(peerId);
  }

  function getOrCreatePeer(peerId) {
    let entry = peers.get(peerId);
    if (entry && (entry.pc.connectionState === 'failed' || entry.pc.connectionState === 'closed')) {
      removePeer(peerId);
      entry = null;
    }
    if (entry) return entry;

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
      console.log('[p2p] negotiationneeded', peerId, 'signalingState=', pc.signalingState);
      try {
        entry.makingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        console.log('[p2p] sent offer', peerId);
        net.send('webrtc-offer', { to: peerId, sdp: pc.localDescription.sdp });
      } catch (err) {
        console.warn('[p2p] negotiationneeded error', peerId, err);
      } finally {
        entry.makingOffer = false;
      }
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      console.log('[p2p] local candidate', peerId, ev.candidate.type, ev.candidate.candidate);
      net.send('webrtc-ice', { to: peerId, candidate: ev.candidate.toJSON() });
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[p2p] ice state', peerId, pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[p2p] connection state', peerId, pc.connectionState);
      if (pc.connectionState === 'connected') call('onPeerState', { peerId, state: 'connected' });
      else if (pc.connectionState === 'failed') call('onPeerState', { peerId, state: 'failed' });
      else if (pc.connectionState === 'closed') call('onPeerState', { peerId, state: 'closed' });
      else if (pc.connectionState === 'connecting') call('onPeerState', { peerId, state: 'connecting' });
    };

    pc.ondatachannel = (ev) => wireIncomingChannel(entry, ev.channel);

    return entry;
  }

  function wireIncomingChannel(entry, channel) {
    channel.binaryType = 'arraybuffer';
    let recv = null;
    channel.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === 'meta') {
          recv = {
            transferId: msg.transferId,
            name: String(msg.name || 'file'),
            size: Number(msg.size) || 0,
            mime: msg.mime || 'application/octet-stream',
            totalChunks: Number(msg.totalChunks) || 0,
            chunks: new Array(Number(msg.totalChunks) || 0),
            bytesReceived: 0,
          };
          call('onIncomingStart', {
            transferId: recv.transferId,
            peerId: entry.peerId,
            name: recv.name,
            size: recv.size,
            mime: recv.mime,
          });
        } else if (msg.type === 'end' && recv && recv.transferId === msg.transferId) {
          finishIncoming(entry, recv, channel);
          recv = null;
        }
        return;
      }
      if (!recv) return; // stray binary frame before meta — ignore defensively
      const { seq, data } = unpackChunk(ev.data);
      recv.chunks[seq] = data;
      recv.bytesReceived += data.byteLength;
      call('onIncomingProgress', {
        transferId: recv.transferId,
        peerId: entry.peerId,
        received: recv.bytesReceived,
        total: recv.size,
      });
    };
    channel.onerror = (ev) => console.warn('[p2p] datachannel error (incoming)', entry.peerId, ev);
  }

  function finishIncoming(entry, r, channel) {
    const missing = r.chunks.length !== r.totalChunks || r.chunks.some((c) => c === undefined);
    const blob = missing ? null : new Blob(r.chunks, { type: r.mime });
    if (missing || !blob || blob.size !== r.size) {
      call('onIncomingError', {
        transferId: r.transferId,
        peerId: entry.peerId,
        name: r.name,
        error: 'size-mismatch',
      });
    } else {
      call('onIncomingComplete', {
        transferId: r.transferId,
        peerId: entry.peerId,
        name: r.name,
        size: r.size,
        mime: r.mime,
        blob,
      });
    }
    setTimeout(() => {
      try {
        channel.close();
      } catch {
        /* already closed */
      }
    }, 500);
  }

  async function sendFile(peerId, file) {
    const entry = getOrCreatePeer(peerId);
    const transferId = makeTransferId();
    console.log('[p2p] sendFile', peerId, transferId, 'pc.connectionState=', entry.pc.connectionState, 'signalingState=', entry.pc.signalingState);
    const channel = entry.pc.createDataChannel(`file:${transferId}`, { ordered: true });
    channel.binaryType = 'arraybuffer';

    call('onOutgoingStart', { transferId, peerId, name: file.name, size: file.size, file });

    try {
      await waitForOpen(channel, CONNECT_TIMEOUT_MS);
    } catch {
      call('onOutgoingError', { transferId, peerId, name: file.name, error: 'connect-timeout' });
      try {
        channel.close();
      } catch {
        /* already closed */
      }
      return;
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    channel.send(
      JSON.stringify({
        type: 'meta',
        transferId,
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        totalChunks,
      })
    );

    try {
      let offset = 0;
      let seq = 0;
      while (offset < file.size) {
        if (channel.readyState !== 'open') throw new Error('channel-closed');
        if (channel.bufferedAmount > HIGH_WATER) {
          await waitBufferedLow(channel);
        }
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buf = await slice.arrayBuffer();
        channel.send(packChunk(seq, buf));
        offset += buf.byteLength;
        seq += 1;
        call('onOutgoingProgress', { transferId, peerId, sent: offset, total: file.size });
      }
      channel.send(JSON.stringify({ type: 'end', transferId }));
      call('onOutgoingDone', { transferId, peerId, name: file.name });
      setTimeout(() => {
        try {
          channel.close();
        } catch {
          /* already closed */
        }
      }, 2000);
    } catch (err) {
      console.warn('[p2p] send failed', peerId, err);
      call('onOutgoingError', { transferId, peerId, name: file.name, error: String(err?.message || err) });
      try {
        channel.close();
      } catch {
        /* already closed */
      }
    }
  }

  function sendFileToAll(peerIds, file) {
    return Promise.all(peerIds.map((id) => sendFile(id, file)));
  }

  async function flushCandidates(entry) {
    const queue = entry.candidateQueue;
    entry.candidateQueue = [];
    for (const c of queue) {
      try {
        await entry.pc.addIceCandidate(c);
      } catch (err) {
        console.warn('[p2p] queued candidate error', entry.peerId, err);
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
        console.log('[p2p] ignoring colliding offer from', peerId, '(impolite)');
        return;
      }
      try {
        if (collision && entry.polite) {
          console.log('[p2p] rolling back local offer, accepting incoming offer from', peerId, '(polite)');
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
        console.warn('[p2p] signal handling error', peerId, err);
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
        if (!entry.ignoreOffer) console.warn('[p2p] addIceCandidate error', peerId, err);
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
  }

  return { sendFile, sendFileToAll, handleSignal, removePeer, destroy };
}
