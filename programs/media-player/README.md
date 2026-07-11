# Media Player

A **100% in-browser** media player — pick or drop your own video/audio files and
play them with custom, touch-friendly controls. Your files **never leave the
device**. No uploads, no servers, no transcoding, no CDN. Pure browser APIs
(`<video>`, `URL.createObjectURL`, `AudioContext`/`AnalyserNode`).

Runs inside the Offline Games Hub host (LAN or local), works on phones and desktop.

## Why

You don't need a native app (or a browser tab full of trackers) just to play a
video or song that's already sitting on your device. This pack is a lightweight
player, not a converter — it leans entirely on whatever codecs your browser's
`<video>`/`<audio>` engine already supports, and never sends a byte anywhere.
(If you need to *change* a file's format, see the sibling **Video Convert** program.)

## What it plays

Whatever your browser's native decoder supports — this varies by browser, but
typically includes:

- **Video:** MP4/H.264 (+AAC), WebM (VP8/VP9/AV1 + Opus/Vorbis), Ogg/Theora
- **Audio:** MP3, AAC/M4A, FLAC, WAV, Opus, Ogg Vorbis

If a file's container or codec isn't supported, the player says so clearly —
naming the file and the likely reason — instead of leaving a blank, frozen screen.

## Features

- Drop zone + file picker, multi-select — builds a playlist from one or more files
- Single playback engine (`<video>`) handles both video and audio-only files;
  audio-only tracks get a gradient placeholder with a live frequency-bar
  visualizer (`AudioContext` + `AnalyserNode`)
- Custom controls: play/pause, seek (with buffered-range indicator),
  volume/mute, playback speed (0.5×–2×), loop (single-track repeat),
  fullscreen, next/prev
- Playlist panel: name, duration, file size per track; click to play, remove
  with one tap, auto-advance to the next track when one ends
- Attach an external `.vtt` subtitle file per track
- Keyboard shortcuts: `Space` play/pause, `←`/`→` seek ±5s, `↑`/`↓` volume
  ±10%, `F` fullscreen, `M` mute (ignored while a form field has focus)
- English, Russian, Chinese, Spanish, Arabic (RTL), French UI

## How to run

```bash
cd pc && ./start.sh            # or ./start.sh --https for phone secure-context features
```

- Library: `http://127.0.0.1:8080/games/` → launch **Media Player**
- Direct:  `http://127.0.0.1:8080/programs/media-player/client/`

## Notes & limits

- No transcoding happens here — this is a player, not a converter. Format
  support is exactly whatever `canPlayType()`/actual playback allows in the
  browser you're using.
- The heuristic `canPlayType()` pre-check is a hint only (shown as a small
  note in the playlist row); the authoritative signal is always the media
  element's own `error` event once a file is actually loaded, since a
  container's MIME type alone can't reveal an unsupported codec inside it
  (e.g. an MKV with an exotic audio track).
- Subtitles only work via an explicit external `.vtt` file attached per
  track — tracks muxed inside a container aren't extracted (out of scope).
- Everything is local — nothing about your files or playback is sent anywhere.

## Files

```text
client/
├── index.html   ← UI
├── style.css    ← neon theme (uses games/_shared tokens)
├── app.js       ← playback engine, playlist, controls, visualizer
└── i18n.js      ← UI strings (en/ru/zh/es/ar/fr)
```

MIT licensed, same as the hub.
