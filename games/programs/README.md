# Programs

Utility apps (not competitive “gameplay packs”). They use the same LAN host,
catalog, browser clients, and shared kit as games.

| Kind | Folder | Catalog field |
|------|--------|----------------|
| Game | `games/<id>/` | `"kind": "game"` (default) |
| Program | `games/programs/<id>/` | `"kind": "program"` |

Both appear in the hub at `/games/` (filter by type). A program's catalog
`entry` and `manifest` stay relative to the program-pack root, for example
`lan-chat/client/index.html` and `lan-chat/manifest.json`.

The shared kit lives in `games/_shared/`. From
`games/programs/<id>/client/`, import it as `../../../_shared/...`; link back
to the library as `../../../hub/`. Relative links work both through the PC
host and through a static server started from `games/`.

Canonical PC-host URL:
`/games/programs/<id>/client/` (the PC host redirects legacy
`/programs/<id>/client/` links there).

## Packs

| ID | Name | Purpose |
|----|------|---------|
| [`lan-chat`](lan-chat/) | LAN Chat & Radio | text + push-to-talk |
| [`video-convert`](video-convert/) | Video Convert | convert · compress · trim · GIF · frames · audio · rotate · speed (100% in-browser) |
| [`p2p-share`](p2p-share/) | P2P File Share | browser-to-browser file transfer |
| [`media-player`](media-player/) | Media Player | local audio and video playback |
| [`speech-tools`](speech-tools/) | Speech Tools | browser speech utilities |
| [`video-broadcast`](video-broadcast/) | Video Broadcast | room-based camera and microphone broadcast |
| [`flashlight`](flashlight/) | Flashlight | screen and device torch controls |
| compass | Compass | (your pack — add when ready) |

## Scaffold note

`tools/new_game.py` currently scaffolds games. For a program, copy an existing
program pack or create `games/programs/<id>/`, set `"kind": "program"` in its
catalog row, and keep `entry`/`manifest` relative to the program-pack root.
