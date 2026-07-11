# P2P File Share

Program (utility) for Offline Games Hub: send files **directly between browsers** on the
same LAN room. The host WebSocket only carries WebRTC *signaling* (SDP offer/answer +
ICE candidates) — file bytes travel straight from sender to receiver over an
`RTCDataChannel` and never touch the host.

## How it works

1. Everyone opens this page with the same `?room=`.
2. Pick a file (drag-and-drop or the picker), then tap a person's **Send**, or
   **Send to everyone**.
3. The sender opens a `RTCPeerConnection` to the target (if one doesn't already exist)
   and negotiates it using the room's existing `ogh-net` relay — see
   [`docs/architecture/MULTIPLAYER.md`](../../docs/architecture/MULTIPLAYER.md) for how
   that relay works. Every `net.send(action, payload)` call goes to everyone else in the
   room; this program addresses messages with a `payload.to` player id and ignores
   anything not addressed to it, the same convention used for the offer/answer/ICE
   examples in the project brief.
4. Once connected, the file is split into 16 KiB chunks, each prefixed with a 4-byte
   sequence number, and streamed over a dedicated `RTCDataChannel` created just for that
   transfer (label `file:<transferId>`). A JSON `meta` message announces the filename,
   size, MIME type and chunk count before the binary chunks; a JSON `end` message follows
   the last chunk.
5. The receiver buffers chunks by sequence number, and on `end` re-assembles them into a
   `Blob`. It verifies the reassembled size matches the size the sender announced before
   offering a **Save** link — if it doesn't match, the transfer is shown as failed
   instead of a download link.
6. A peer connection, once established, is reused for every subsequent transfer between
   that pair (in either direction) — new data channels don't require a fresh
   offer/answer round, so sending a second or third file (or a reply file going the
   other way) starts immediately.

## Signaling protocol (over `ogh-net`)

| Action | Payload | Meaning |
|---|---|---|
| `webrtc-offer` | `{ to, sdp }` | SDP offer for a new/renegotiated connection |
| `webrtc-answer` | `{ to, sdp }` | SDP answer |
| `webrtc-ice` | `{ to, candidate }` | One trickled ICE candidate |

`to` is the target's `net.playerId`; everything not addressed to the local player is
ignored (including signaling from other programs sharing the same room — rooms are not
partitioned by program, only by room name).

Glare (both sides opening a connection to each other for the first time at the same
moment) is resolved with the standard ["perfect negotiation"](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)
pattern: for any pair, the player with the lexicographically smaller id is "polite" and
rolls back its own offer in favor of an incoming one; both sides derive this role
independently, no extra message needed.

## No STUN/TURN, on purpose

`RTCPeerConnection` is created with `iceServers: []`. This project never depends on
internet reachability, and peers here are always on the same LAN room, so only ICE
**host candidates** (the browser's own local interface addresses) are ever gathered —
there is nothing to relay through. If two devices on the same Wi-Fi genuinely can't
reach each other directly (e.g. an access point with client isolation enabled, or a
network that blocks the multicast/mDNS traffic Chrome uses to publish local-network ICE
candidates), the connection will simply fail to establish; that's expected and is not
worked around with an external STUN/TURN server. See **Known limitations** below.

## Controls

- Drag a file onto the drop zone, or tap **Choose file** — multiple files can be staged
  at once.
- Tap a room member's **Send** to send all staged files to just them, or
  **Send to everyone** to send to the whole room.
- Outgoing/received panels show live progress; a failed outgoing transfer gets a
  **Retry** button; a completed incoming transfer gets a **Save** link.
- Language switcher (top right) covers English, Russian, Chinese, Spanish, Arabic
  (right-to-left layout) and French — every visible string is translated, not just the
  title.

## Run / test

```bash
cd pc && ./start.sh
# Tab A: http://127.0.0.1:8080/programs/p2p-share/client/?name=A&room=test
# Tab B: http://127.0.0.1:8080/programs/p2p-share/client/?name=B&room=test
```

Open both, confirm each sees the other in the room list, stage a file on one side and
send it to the other. `?name=` overrides the local nickname (which otherwise comes from
`OGHProfile`) — useful for giving two tabs in the *same* browser distinct identities
while testing, and it's exactly what the hub already does when it links into any
program (`?name=<your nickname>&room=<room>`).

## Design notes / why some numbers are what they are

- **16 KiB chunks.** `RTCDataChannel.send()` has a per-message size ceiling that varies
  by browser and is commonly cited as being safe up to roughly 256 KiB. This program
  chunks well below that ceiling — smaller chunks mean smoother progress updates, finer
  backpressure control, and one less variable to worry about across the range of
  devices this project targets (including phones). Being more conservative here only
  costs a few thousand extra small messages for a multi-ten-MB file; it can't cause a
  correctness problem.
- **Backpressure.** Before queuing more chunks, the sender checks
  `channel.bufferedAmount` against a 1 MB high-water mark and waits for the channel's
  `bufferedamountlow` event (threshold 256 KB) if it's over that, so a fast sender can't
  balloon memory or overrun a slower receiver.
- **One data channel per transfer.** Each file gets its own channel
  (`file:<transferId>`), so concurrent transfers (two files to the same person, or
  simultaneous sends to several people) don't need to multiplex messages from different
  files over one stream.
- **Whole file reassembled in memory.** The receiver holds all chunks until the final
  `end` message, then builds one `Blob`. That's the right tradeoff for the "tens of MB"
  files this is designed for; it is not meant for multi-hundred-MB/GB transfers.

## Known limitations

- **Mixed-program rooms.** A room is shared by whatever programs/games are open in it —
  the roster (and thus the send-target list) shows *everyone* in the room, not just
  people who happen to have this program open. Sending to someone not actually running
  P2P File Share will time out after 15 seconds with a "couldn't connect" state on that
  transfer (the same way it would if their device simply isn't reachable). This mirrors
  how every other `ogh-net` program in this repo already works — rooms aren't
  partitioned by program.
- **No resume.** If a page reloads mid-transfer, that transfer is gone; the sender has
  to send again from scratch. There's no chunk-level resume/dedup.
- **LAN reachability isn't guaranteed by this app.** As noted above, without a
  STUN/TURN server, two devices need a genuinely direct path (including successful mDNS
  resolution of Chrome's local-network ICE candidates, when applicable) to connect. Most
  home/LAN-party Wi-Fi allows this; some managed/guest networks with client isolation
  will not, and there is intentionally no fallback for that case.
- **Very simultaneous mutual first-sends are a rare edge case.** If two people who have
  never connected before both hit Send *to each other* within the same
  offer/negotiation window, the perfect-negotiation glare handling resolves the
  connection itself correctly, but in the unlikely case a specific in-flight transfer
  attempt stalls during that exact race, retrying (clicking Send again) works — by then
  the underlying connection is already established.

## Privacy

File bytes go **only** peer-to-browser-to-peer over your LAN, end-to-end encrypted by
WebRTC's mandatory DTLS — the host never sees file contents, only the small
connection-setup messages. Nothing is uploaded to the internet.
