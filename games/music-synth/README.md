# Music Synth

**Solo instrument / sandbox.** An on-screen piano keyboard driven entirely by the
**Web Audio API** — no sample files, no downloads, everything is synthesized live
from oscillators, gain envelopes, and filters, the same way `games/_shared/js/ogh-sfx.js`
makes its beeps, just a lot more of it.

## Instrument voices

Six instruments, each a genuinely different synthesis recipe (not the same tone with
a different oscillator type):

| Instrument | Family | Recipe |
|---|---|---|
| **Piano** | sustained | 3 oscillators (sine + triangle + a quiet octave-up sine), each slightly detuned for chorus-like warmth, through an ADSR envelope (~5ms attack, decay to a moderate sustain, release on note-off). A lowpass filter starts bright and mellows over the decay. |
| **Kalimba** | percussive | Fundamental sine + two **inharmonic** partials (~×2.0 and ×3.76, not clean ×2/×4) for a metallic, bell-like tine timbre. Near-instant attack, no sustain phase — pure trigger-and-decay, 0.8–2s depending on pitch (lower notes ring longer). A quick downward pitch envelope over the first ~15ms mimics the tine's mechanical "twang," and a lowpass filter closes as the note decays. |
| **Organ** | sustained | 5 sine oscillators stacked at clean integer "drawbar" ratios (½, 1, 2, 3, 4× the fundamental). Instant on / instant off amplitude envelope — no decay while held, essentially no release tail. |
| **Bells** | percussive | A second plucked/struck idiophone, deliberately different from Kalimba: 4 partials at different inharmonic ratios (~×2.76 / ×5.4 / ×7.1), a brighter and more open filter, a shorter decay range (0.6–1.4s), faster attack, and no pitch-drop twang (struck, not plucked). |
| **Lead** | sustained | Sine + square blend (soft body + buzzy edge) with a slow (~5.5Hz) vibrato LFO modulating oscillator detune, fading in over the first half-second. Standard ADSR. |
| **Bass** | sustained | Sawtooth + square + a sub-sine an octave down, through a resonant lowpass filter with its own fast envelope (bright pluck → dark). Short and punchy even while the key is held. |

**Hold behavior:** Piano/Organ/Lead/Bass are proper press-and-hold instruments — the
note sustains while the key is down and only releases when you let go. Kalimba/Bells
are pure trigger-and-decay: once plucked/struck, the decay plays out in full no matter
how long you hold the key, exactly like a real kalimba tine keeps ringing after your
finger leaves it. Releasing the key early never cuts the sound short — it only clears
the key so it can be re-triggered.

**Polyphony:** every `noteOn` builds a brand-new oscillator/gain/filter graph — nothing
is reused across notes — so chords, overlapping notes, and rapid re-triggers of the same
pitch all sound correctly. Each voice self-schedules its own cleanup (stop + disconnect)
once its envelope finishes, so a long play session doesn't accumulate audio nodes.

**Reverb & volume:** a small `DynamicsCompressor` keeps chords from clipping, and a
convolution reverb built from a **procedurally generated** noise impulse response (no
downloaded IR file) is mixed in via the Reverb slider — it's especially flattering on
Kalimba. Both Volume and Reverb are plain `GainNode`s on the master bus.

## Controls

| Input | Action |
|---|---|
| Tap / click a key | Play that note |
| Drag across keys (touch or mouse, button held) | Glissando — each new key the pointer crosses plays |
| Multiple fingers | Real chords — each pointer is tracked independently |
| `A S D F G H J K` | White keys: C D E F G A B C |
| `W E T Y U` | Black keys: C# D# F# G# A# |
| `Z` / `X` | Shift the computer-keyboard octave down / up |
| Instrument row | Switch voice — never affects notes already ringing |
| Octave buttons | Same as `Z`/`X`, for touch |
| Volume / Reverb sliders | Master output level / reverb wet mix |

The on-screen keyboard always shows 2 octaves (15 white + 10 black keys); the
computer-keyboard shortcuts always map to the lower of those two octaves, so shifting
octaves with `Z`/`X` (or the on-screen buttons) slides the whole visible window and
keeps the shortcut mapping in view.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/music-synth/client/
```

## Files

```text
client/
├── index.html   ← layout: header, instrument row, octave/volume/reverb controls, keyboard
├── style.css    ← neon theme + piano key geometry (flex white keys, absolutely-positioned black keys)
├── synth.js     ← Web Audio engine: the six instrument recipes, voice tracking, cleanup, reverb bus
├── app.js       ← UI: keyboard DOM, pointer glissando, QWERTY shortcuts, i18n wiring
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware)
```

MIT licensed, same as the hub.
