# Video Convert

A **100% in-browser** video toolkit — the offline analog of online converters like
vidocean.ru, but your files **never leave the device**. No uploads, no servers,
no `ffmpeg.wasm`, no CDN. Pure browser APIs (`MediaRecorder`, `canvas.captureStream`,
`AudioContext`, `WebCodecs`-ready).

Runs inside the Offline Games Hub host (LAN or local), works on phones and desktop.

## Why

Online video sites ship your video to a server. This pack does everything on-device:

- Decode with the browser's native `<video>` decoder
- Re-encode with `MediaRecorder` (VP8/VP9/Opus → `.webm`, or `.mp4` where supported)
- Quantize + LZW for GIFs (hand-written encoder, ~no dependencies)

Result: private, offline, instant, and fits in tens of KB.

## Operations

| Tool | What it does |
|------|--------------|
| **Convert / Re-encode** | Change container, resolution (1080p–360p), framerate, bitrate |
| **Compress** | Quick size/quality presets to shrink the file |
| **Trim** | Keep only a start→end range |
| **Extract audio** | Output an audio-only file (Opus/WebM) |
| **Make GIF** | Animated GIF (median-cut palette + Floyd–Steinberg dithering) |
| **Grab frames** | Evenly sampled PNG/JPEG frames, downloadable as `.zip` |
| **Rotate / Flip** | 90° / 180° / 270°, mirror H/V |
| **Change speed** | 0.25×–4× |
| **Mute** | Strip the audio track (checkbox in Convert) |

## How to run

```bash
cd pc && ./start.sh            # or ./start.sh --https for phone sensors
```

- Library: `http://127.0.0.1:8080/games/` → launch **Video Convert**
- Direct:  `http://127.0.0.1:8080/games/programs/video-convert/client/`

## Notes & limits

- Re-encode runs in **real time** (browser plays the clip through once) — a 30s clip
  takes ~30s. Frame extraction and GIF are **faster than real time** (seek-based).
- Output codec depends on the browser: Chromium → WebM (VP9), Safari → MP4.
  The UI only offers formats `MediaRecorder.isTypeSupported()` reports.
- Very large 4K sources may hit canvas/memory limits — downscale in options.
- Everything is local — no progress is sent anywhere.

## Files

```text
client/
├── index.html   ← UI
├── style.css    ← neon theme (uses games/_shared tokens)
├── app.js       ← engine: re-encode, audio, frames, trim, rotate, speed, zip
└── gif.js       ← compact GIF encoder (median cut + LZW)
```

MIT licensed, same as the hub.
