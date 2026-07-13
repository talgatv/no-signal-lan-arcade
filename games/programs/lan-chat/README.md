# LAN Chat & Radio

Program (utility) for Offline Games Hub: **text chat** and **walkie-talkie** (push-to-talk) on the same LAN room as the PC host.

## Modes

| Mode | How |
|------|-----|
| **Text** | Type message → Send. Everyone in the room sees it. |
| **Radio (PTT)** | Hold **TALK**, speak, release. Short audio clip is sent to others. |

Requires host WebSocket (`pc/start.sh`). Offline mode only shows a local note.

## Controls

- Enter / Send — text message  
- Hold TALK — record up to ~8 s  
- Room from `?room=` (lobby/hub)  

## Privacy

Audio and text go only through the **LAN host** to peers in the room.  
Not stored on the server disk; not uploaded to the internet.

## Run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/programs/lan-chat/client/?name=Ada&room=main
```

Open two browsers with the same `room` to test.

## Mic permission

Browsers require HTTPS **or** localhost for getUserMedia.  
On a phone via `http://LAN_IP`, some browsers block the mic — text chat still works.  
Chrome flags / secure context limitations vary by OS.
