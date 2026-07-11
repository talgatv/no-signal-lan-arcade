/**
 * Tiny Web Audio beeps — no sample files.
 * Usage: const sfx = createOghSfx(); sfx.play('pickup');
 */
export function createOghSfx() {
  let ctx = null;
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  function tone(freq, dur, type = 'sine', gain = 0.06, slideTo = null) {
    try {
      const c = ensure();
      const t0 = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch (_) { /* autoplay / unsupported */ }
  }

  const patterns = {
    tap: () => tone(520, 0.04, 'triangle', 0.04),
    place: () => tone(180, 0.08, 'sine', 0.05, 90),
    pickup: () => { tone(660, 0.06, 'sine', 0.05); setTimeout(() => tone(990, 0.08, 'sine', 0.04), 40); },
    win: () => { tone(523, 0.1); setTimeout(() => tone(659, 0.1), 90); setTimeout(() => tone(784, 0.16), 180); },
    die: () => tone(220, 0.28, 'sawtooth', 0.04, 60),
    tick: () => tone(880, 0.02, 'square', 0.02),
    screech: () => tone(920, 0.22, 'sawtooth', 0.035, 480),
    // Added for games/penguin-fling — launch/bounce/slide/land cues, same
    // plain-oscillator-sweep approach as `screech` above (a tone sweep
    // approximating a textured sound, not a sample).
    thwack: () => { tone(150, 0.1, 'triangle', 0.09, 55); tone(720, 0.03, 'square', 0.035); },
    boing: () => tone(210, 0.16, 'sine', 0.055, 380),
    whoosh: () => tone(600, 0.5, 'sine', 0.03, 140),
    land: () => tone(120, 0.14, 'sine', 0.05, 65),
    // Added for games/cross-the-road — forward-hop and ambient-traffic-honk
    // cues. `hop` is a quick two-note upward chirp (distinct from the flatter
    // generic `tap`) so the very-frequent "advance one lane" action reads as
    // a bouncy character hop rather than a UI click. `honk` is a short
    // two-tone car-horn blip (a plain square/triangle interval, same
    // no-sample approach as everything else here) used sparingly as ambient
    // traffic flavor, not tied to collision.
    hop: () => { tone(430, 0.045, 'triangle', 0.045, 640); setTimeout(() => tone(760, 0.035, 'triangle', 0.03), 35); },
    honk: () => { tone(340, 0.09, 'square', 0.05); setTimeout(() => tone(270, 0.11, 'square', 0.045), 70); },
    // Added for games/mini-golf — wall-bounce and water-hazard cues. Putt
    // and sink feedback deliberately reuse existing patterns instead of
    // adding more: `thwack` (penguin-fling's launch cue) already reads as a
    // clean putter strike, and `win`'s ascending chime already reads as
    // "success" for sinking the cup. `bounce` is a short percussive knock
    // (kept brief since a single shot can trigger several in a row off
    // walls/obstacles) and `splash` is a soft descending sweep plus a small
    // higher droplet tick — the hub's first "water" sound, so unlike the
    // two reused patterns above there was no existing wet/splashy cue to
    // borrow.
    bounce: () => tone(300, 0.05, 'triangle', 0.06, 150),
    splash: () => { tone(260, 0.22, 'sine', 0.05, 70); setTimeout(() => tone(900, 0.035, 'sine', 0.025), 90); },
    // Added for games/billiards — ball-ball and pocket cues. The cue-strike
    // and rail-bounce sounds deliberately reuse existing patterns instead of
    // adding more (`thwack` already reads as a clean strike, `bounce` already
    // reads as a knock off a hard boundary); `clack` and `pocket` are the two
    // genuinely new sounds this genre needs. `clack` is a very short, sharp,
    // high square-wave click (two hard balls meeting) — kept brief since a
    // single break can trigger many in quick succession. `pocket` is a
    // quick high blip sliding into a soft low thud, reading as "dropped
    // into a hole" (paired with the existing `win` chime for clearing a
    // rack / winning a match, not a new pattern of its own).
    clack: () => tone(1500, 0.035, 'square', 0.05, 900),
    pocket: () => { tone(500, 0.05, 'sine', 0.05, 220); setTimeout(() => tone(140, 0.12, 'sine', 0.06, 90), 40); },
    // Added for games/paintball — marker-fire and paint-impact cues. Reload
    // and wave-clear/penalty feedback deliberately reuse existing patterns
    // instead of adding more (`whoosh`/`land` already read as a pull-back-
    // and-seat reload, `win`/`die` already read as clear/penalty, `pickup`
    // already reads as a resource grab for the ammo-crate refill); `pop`
    // and `splat` are the two genuinely new sounds this genre needs. `pop`
    // is a short, high, fast-downward-sliding square blip (a pneumatic
    // marker shot) kept brief since a full magazine can fire in quick
    // succession. `splat` is a soft low sine thud with a quick downward
    // slide plus a faint high tick, reading as a wet paint impact rather
    // than a hard collision (contrast with `bounce`/`clack`, which are
    // deliberately harder/sharper for rigid-object hits elsewhere).
    pop: () => tone(720, 0.045, 'square', 0.045, 260),
    splat: () => { tone(190, 0.09, 'sine', 0.06, 70); setTimeout(() => tone(850, 0.025, 'sine', 0.02), 25); },
  };

  return {
    unlock: ensure,
    play(name) {
      const fn = patterns[name];
      if (fn) fn();
    },
  };
}
