# Speech Tools

Two of the browser's built-in speech APIs, wired up with a touch-friendly UI:
**Text → Speech** (`SpeechSynthesis`) and **Speech → Text**
(`SpeechRecognition`). No servers, no uploads, no CDN.

Runs inside the Offline Games Hub host (LAN or local), works on phones and desktop.

## Why

Every modern browser already ships a speech synthesizer and (on Chromium
browsers, at least) a speech recognizer — most people never see a UI for
either. This pack is just that UI: type text and hear it, or talk and see it
transcribed live, using whatever the browser and OS already provide.

## The two panels

### Text → Speech

- Big textarea for input text.
- Voice picker, populated from `speechSynthesis.getVoices()` — grouped into
  voices matching the current UI language and everything else. Voice lists
  load asynchronously in most browsers, so this reads synchronously first,
  listens for `voiceschanged`, and falls back to a short poll for browsers
  that never fire it.
- Rate (0.5×–2×), pitch (0–2), and volume (0–1) sliders.
- Play / Pause / Resume / Stop, wired to `speechSynthesis.speak/pause/resume/cancel`
  and enabled/disabled based on live playback state.
- **Fully offline** — synthesis uses voices installed in the OS/browser, no
  network round trip, ever.
- There is no "download as audio file" button: the Web Speech API gives
  scripts no access to the raw synthesized audio, so that feature simply
  isn't possible to build here.

### Speech → Text

- Big "Start / Stop listening" toggle with a pulsing mic indicator.
- Recognition language picker (`en-US`, `ru-RU`, `zh-CN`, `es-ES`, `ar-SA`,
  `fr-FR`) — defaults to match the current UI language but is independently
  changeable, since the language you're dictating in and the language of
  the button labels are two different things.
- Continuous listening with live interim results (shown greyed/italic) that
  commit to the transcript as final results arrive.
- Copy to clipboard, Save as `.txt` (local Blob download, same pattern used
  elsewhere in this repo), and Clear.
- Specific, translated error messages for `no-speech`, `network`,
  `not-allowed`, and `service-not-allowed` — not a generic "something went
  wrong."

## Two things to know before you rely on Speech → Text

1. **It needs a secure context.** `SpeechRecognition` needs microphone
   access, which browsers only grant on `https://` or `http://localhost` —
   *not* plain `http://192.168.x.x:8080`, which is exactly how this hub is
   normally reached from a phone on the LAN. Open this page over HTTPS
   (`pc/host.py --https`, or the Android host's HTTPS toggle) or directly on
   the host device via `localhost`. The panel detects this
   (`window.isSecureContext`) and explains it up front instead of leaving a
   dead "Start listening" button.
2. **It may not be offline.** Unlike everything else in this hub, most
   browsers' `SpeechRecognition` sends your audio to a cloud recognition
   service (Chrome uses Google's) for most languages — a few newer Chrome
   builds support on-device recognition for some locales, but it isn't
   universal. With no internet uplink, Speech → Text may simply not work
   even on a fully local LAN, while Text → Speech keeps working regardless.
   The panel says so, permanently, right under the tab.

Browser support for `SpeechRecognition` itself is also inconsistent —
Firefox in particular has had absent or partial support historically. The
panel detects `!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)`
and explains that too, rather than showing a silently broken toggle.

## How to run

```bash
cd pc && ./start.sh            # or ./start.sh --https for phones (mic needs a secure context)
```

- Library: `http://127.0.0.1:8080/games/` → launch **Speech Tools**
- Direct:  `http://127.0.0.1:8080/programs/speech-tools/client/`

## Notes & limits

- Pause/Resume behavior for `SpeechSynthesis` varies by browser/OS — desktop
  Chrome and Firefox handle it well; some mobile engines only reliably
  support Stop.
- `SpeechRecognition` sessions can end on their own after a period of
  silence or a fixed time limit even with `continuous: true` — this is a
  known quirk of some engines, not a bug in this page. The toggle just
  reflects whatever state the browser reports.
- Everything is local except the STT cloud round trip described above — no
  progress or text is sent to this hub's host.

## Files

```text
client/
├── index.html   ← UI: tabbed Text → Speech / Speech → Text panels
├── style.css    ← neon theme (uses games/_shared tokens)
├── app.js       ← SpeechSynthesis + SpeechRecognition wiring, i18n glue
└── i18n.js      ← UI strings (en/ru/zh/es/ar/fr)
```

MIT licensed, same as the hub.
