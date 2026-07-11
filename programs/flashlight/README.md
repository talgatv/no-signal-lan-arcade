# Flashlight

Deliberately simple, "classic 2010-era" phone flashlight: before phones had
a real hardware torch API, every flashlight app was just the screen turned
solid white at full brightness, held near what you wanted lit. That's the
whole app, plus an SOS blink mode. No servers, no uploads, no CDN, no
camera permission.

Runs inside the Offline Games Hub host (LAN or local), works on phones and
desktop.

## What it does

- **Off state**: a dark screen with a big **Turn on** button and a
  separate **SOS** button.
- **On**: the entire screen becomes solid `#ffffff` white (with
  `color-scheme: light`, so browser chrome doesn't fight the white fill).
  Tap/click anywhere on the lit screen to turn it back off — the whole
  screen is the off-button, the classic UX for this kind of app.
- **SOS**: blinks the international Morse SOS pattern (`··· −−− ···`) —
  three short flashes, three long flashes, three short flashes, a longer
  pause, then repeats. A small "Stop SOS" button stays visible in a corner
  while it runs, and tapping anywhere (during a bright flash or a dark gap)
  stops it immediately too.

## Screen brightness caveat

This cannot change your device's actual screen-brightness setting — it can
only fill the screen with white. The off-state UI says so in a small note.
For the brightest effect, turn your device's own brightness all the way up
before using it.

## Safety: flash-rate limit on SOS

A full-screen, rapidly-flashing white light is a genuine
photosensitive-epilepsy risk if the timing is careless. SOS uses these
exact, fixed values (see `SOS_TIMING` in `client/app.js`):

| Symbol / gap | Duration |
|---|---|
| Dot (short flash), on-duration | 200ms |
| Dash (long flash), on-duration | 600ms |
| Gap between symbols in a letter | 200ms |
| Gap between letters | 600ms |
| Gap before the pattern repeats | 1400ms |

The dot phase's 200ms-on/200ms-off cycle works out to **2.5 flashes per
second**, which stays under the ~3-flashes/second threshold commonly used
for photosensitive-epilepsy safety guidance (the same threshold
[WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)
uses). These values are a deliberate, reviewed choice — not a placeholder —
and should not be sped up.

## Screen wake lock

While the light or SOS is on, the page requests a
[Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
(`navigator.wakeLock.request('screen')`) so the display doesn't time out
mid-use, and releases it when turned off. This is feature-detected
(`'wakeLock' in navigator`) — browsers that don't support it are simply
skipped, no error, no broken UI. If it's unsupported, the off-state shows a
small, non-nagging note suggesting you check your own device's
screen-timeout setting.

## How to run

```bash
cd pc && ./start.sh
```

- Library: `http://127.0.0.1:8080/games/` → launch **Flashlight**
- Direct:  `http://127.0.0.1:8080/programs/flashlight/client/`

## Files

```text
client/
├── index.html   ← off-state chrome (buttons, disclaimer) + SOS corner button
├── style.css    ← dark off-state theme; lit states are plain white/black fills
├── app.js       ← on/SOS state machine, SOS timing, wake lock
└── i18n.js      ← UI strings (en/ru/zh/es/ar/fr)
```

MIT licensed, same as the hub.
