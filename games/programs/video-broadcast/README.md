# Video Broadcast

Program (utility) for Offline Games Hub: any one participant, several, or all of them can
broadcast live camera + mic to everyone else in the room, **full mesh** — every browser
connects directly to every other browser's `RTCPeerConnection` and pushes its own tracks
onto it, exactly like [`games/programs/p2p-share/`](../p2p-share/) does for file transfers, just
with continuous media tracks instead of file chunks. There is no media relay/SFU server;
see "Known limitations" below for what that means at scale.

## How it works

1. Everyone opens this page with the same `?room=`. Just joining the room doesn't start
   your camera — broadcasting is an explicit opt-in per participant (tap **Start
   broadcasting**), so a room can have anywhere from zero to everyone broadcasting at
   once, in any combination.
2. Tapping **Start broadcasting** calls `getUserMedia({ video: { facingMode: 'user' },
   audio: true })`, then:
   - opens a `RTCPeerConnection` to every peer **already in the room** (if one doesn't
     already exist), and
   - adds the local audio/video tracks to **every** connection (existing and
     just-opened).
   Each connection is negotiated using the room's existing `ogh-net` relay — see
   [`docs/architecture/MULTIPLAYER.md`](../../../docs/architecture/MULTIPLAYER.md) and
   P2P File Share's README for how that relay and the perfect-negotiation glare handling
   work; this program reuses that plumbing unchanged (see `peer-manager.js`).
3. If someone **joins the room after you've already started broadcasting**, the same
   connect-and-attach step runs again for just that new peer — otherwise a late joiner
   would never see an already-broadcasting participant, since nothing would trigger the
   connection from either side. This is the trickiest part of the whole program; see the
   comment at the top of `peer-manager.js` for exactly how one mechanism
   (`getOrCreatePeer` always re-syncing the current local stream onto whatever connection
   it touches) covers both "connect to everyone already here" and "connect to whoever
   shows up later" without special-casing either one.
4. On the receiving side, `pc.ontrack` delivers a remote `MediaStream`, which gets
   attached to a `<video>` tile labelled with that participant's name.
5. Muting your mic or turning your camera off doesn't renegotiate anything — it just
   flips `track.enabled`, which sends silence / black frames instead of stopping the
   track. Since that alone doesn't tell anyone *why* they're seeing black or hearing
   nothing, a small `media-state` message is broadcast alongside it so every other tile
   can show an explicit "muted" / "camera off" badge instead of receivers having to guess
   from audio levels or a black rectangle.
6. **Stopping** broadcasting removes your tracks from every connection
   (`pc.removeTrack`) and stops the underlying camera/mic hardware — but does **not**
   close the peer connections themselves, because they may still be carrying an incoming
   broadcast *from* those peers. Turning off your own camera isn't the same as leaving
   the room. Connections only close when a peer actually leaves the room, on a
   `connectionState` of `failed`/`closed`, or when you unload the page.

## Signaling protocol (over `ogh-net`)

| Action | Payload | Meaning |
|---|---|---|
| `webrtc-offer` | `{ to, sdp }` | SDP offer for a new/renegotiated connection |
| `webrtc-answer` | `{ to, sdp }` | SDP answer |
| `webrtc-ice` | `{ to, candidate }` | One trickled ICE candidate |
| `media-state` | `{ audio, video, broadcasting }` | Broadcast (not `to`-addressed) whenever a participant's mute/camera-off/broadcasting state changes, and re-sent whenever a new peer joins while broadcasting so late joiners learn the current state immediately |

`to` on the WebRTC actions is the target's `net.playerId`; everything not addressed to
the local player is ignored, including signaling from other programs that happen to
share the same room (rooms aren't partitioned by program, only by room name — see P2P
File Share's README, "Mixed-program rooms"; the same reasoning applies here and the
action names are deliberately reused as-is).

`media-state` is not addressed to anyone in particular — every room member needs to know
it, so it's just broadcast. `audio`/`video` are exactly what P2P File Share's sibling
spec describes: the sender's current mic/camera-enabled booleans. `broadcasting` is a
small superset added here so a tile can be removed the instant someone stops
broadcasting entirely, rather than a receiver having to infer "stopped" from
lower-level (and cross-browser-inconsistent) WebRTC track-removal/renegotiation events —
the same "don't make receivers guess" reasoning the mute/camera-off state already uses.

## No STUN/TURN, on purpose

Same as P2P File Share: `RTCPeerConnection` is created with `iceServers: []`. Peers here
are always on the same LAN room, so only ICE **host candidates** are ever gathered —
there's nothing to relay through. See that program's README for the full reasoning and
the "client isolation" caveat, which applies identically here.

## Controls

- **Start broadcasting / Stop broadcasting** — explicit toggle, off by default. Not
  everyone in the room has to broadcast; any subset works, including just one person
  broadcasting to a silent room, or everyone at once.
- **Mute** — toggles the outgoing mic track's `enabled` flag and tells everyone else via
  `media-state`.
- **Camera off** — toggles the outgoing video track's `enabled` flag (black frames, no
  renegotiation) and tells everyone else via `media-state`, which shows an avatar/name
  placeholder over the tile instead of a plain black rectangle.
- **Flip camera** — only shown when `navigator.mediaDevices.enumerateDevices()` reports
  more than one `videoinput` (most laptops/desktops have exactly one camera and don't get
  a dead button). Requests a fresh track with the opposite `facingMode`, then swaps it
  into every peer connection with `RTCRtpSender.replaceTrack()` — no renegotiation, the
  connection stays up throughout. The local self-preview is mirrored
  (`transform: scaleX(-1)`) only while using the front/`user`-facing camera, matching
  standard video-chat convention; the back/`environment` camera is shown un-mirrored.
- Language switcher (top right) covers English, Russian, Chinese, Spanish, Arabic
  (right-to-left layout) and French — every visible string is translated, including the
  secure-context and permission-error messages below.

## Secure context requirement

Camera/mic access (`getUserMedia`) only works in a **secure context**: `https://` or
`http://localhost` — not a plain `http://` LAN IP, which is otherwise this project's
normal mode of use on phones. If the page detects `window.isSecureContext === false`, it
shows a translated banner up front and disables **Start broadcasting** before the user
even tries, rather than letting them hit a confusing failure. **Receiving/watching**
other broadcasters still works fine over plain HTTP LAN, same as every other `ogh-net`
program — only sending your own camera needs the secure context. To broadcast from a
phone over LAN, either run the host with HTTPS enabled (`pc/host.py --https`, or the
Android host's HTTPS toggle) or open this page directly on the host device
(`localhost`).

`getUserMedia` failures are also classified into specific translated messages rather
than a generic failure: permission denied (`NotAllowedError`/`SecurityError`), no camera
or mic present (`NotFoundError`), and the device already in use by another app/tab
(`NotReadableError`). Anything else falls back to a generic message that still includes
the browser's own error text.

## Run / test

```bash
cd pc && ./start.sh
# Tab A: http://127.0.0.1:8080/games/programs/video-broadcast/client/?name=Alice&room=test
# Tab B: http://127.0.0.1:8080/games/programs/video-broadcast/client/?name=Bob&room=test
```

Open both, tap **Start broadcasting** on one, confirm the other tab renders a live tile
for it (and vice versa once both broadcast). Open a third tab with a different `?name=`
*after* the first is already broadcasting to confirm the late-joiner case in "How it
works" step 3 actually works. `?name=` overrides the local nickname (which otherwise
comes from `OGHProfile`) — the same convention every program in this hub uses.

## Design notes / why some things are the way they are

- **One connection per peer pair, reused for both directions.** Exactly like P2P File
  Share: there's a single `RTCPeerConnection` between any two participants that carries
  whatever tracks either side has added, not one connection per broadcaster→viewer
  direction. That's why stopping your own broadcast can't simply close the connection —
  it might still be carrying the other side's broadcast to you.
- **`getOrCreatePeer` is the one place that matters.** Both "connect to everyone already
  in the room" (at Start-broadcasting time) and "connect to a peer who joins later"
  (while already broadcasting) funnel through the same function, which always re-attaches
  the current local stream to whatever connection it creates or returns. See the comment
  block at the top of `peer-manager.js`.
- **`replaceTrack`, not remove+add, for camera flip.** Removing and re-adding a track
  triggers a fresh offer/answer renegotiation and a brief gap; `replaceTrack()` swaps the
  encoder's source with no signaling round trip and no interruption to the other side's
  `connectionState`.
- **Tile state is single-sourced through one function.** `setTileState()` is called both
  from the local mute/camera button handlers (for your own tile) and from the
  `media-state` receive handler (for everyone else's) — `net.send()` never echoes back to
  the sender, so without the local call your own tile's mute/camera-off badge would never
  update.

## Known limitations

- **No media relay/SFU — full mesh only.** Every additional simultaneous broadcaster
  means every other participant's device has to decode one more incoming video stream
  *and* every broadcaster's device has to encode and send one outgoing stream per other
  participant. This scales reasonably to roughly **4-6 simultaneous broadcasters** on
  typical phones/laptops; beyond that, CPU and LAN bandwidth will strain noticeably
  (dropped frames, fan noise, battery drain). This is an inherent, documented limitation
  of the no-backend, no-build architecture this whole project is built on, not a bug —
  building a proper SFU/media-relay server is out of scope here.
- **Mixed-program rooms.** Same caveat as P2P File Share: the roster shows everyone in
  the room, not just people who happen to have this program open.
- **LAN reachability isn't guaranteed.** Same ICE-host-candidates-only caveat as P2P File
  Share — no STUN/TURN fallback for networks with client isolation or blocked mDNS.
- **No recording, no screen share.** This is a live camera/mic broadcast tool only.

## Privacy

Video and audio flow **directly peer-to-peer over your LAN**, end-to-end encrypted by
WebRTC's mandatory DTLS/SRTP — the host's WebSocket relay only ever carries small
signaling messages (SDP/ICE) and small status messages (`media-state`), never your
camera or microphone data. Nothing is uploaded to the internet.
