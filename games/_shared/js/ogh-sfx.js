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
  };

  return {
    unlock: ensure,
    play(name) {
      const fn = patterns[name];
      if (fn) fn();
    },
  };
}
