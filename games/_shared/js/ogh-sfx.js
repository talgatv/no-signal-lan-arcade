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
    // Added for games/hill-rider — engine, coin, crash and landing feedback
    // all reuse existing patterns unchanged (`whoosh` at a fixed interval
    // while gas is held reads as an engine note, same cadence trick as
    // void-drift's thrust sound; `pickup` already reads as a bright coin
    // chime; `die` already reads as a crash; `land` already reads as a
    // wheels-down thud; `tick` already reads as a soft/neutral end-of-run
    // cue for coasting out of fuel). `refuel` is the one genuinely new sound
    // this genre needs: a low two-note descending "glug", pitched well
    // below `pickup`'s bright ascending chime so a coin and a fuel canister
    // never sound alike, reading as liquid filling a tank rather than a
    // score event.
    refuel: () => { tone(260, 0.08, 'sine', 0.05, 190); setTimeout(() => tone(230, 0.1, 'sine', 0.045, 160), 70); },
    // Added for games/gem-swap — swap/match/special-gem/invalid-swap
    // feedback all reuse existing patterns unchanged (`tap` for a swap
    // attempt, `pickup` already reads as a bright "matched" chime, `win`
    // already reads as an achievement fanfare for creating a special gem,
    // `whoosh` already reads as a sweep for a row/col special clearing its
    // line, `tick` already reads as a soft/neutral cue for a board
    // reshuffle, and `screech` — an abrupt reversal — already reads as
    // "that swap had to be undone" for an invalid swap snapping back, so no
    // dedicated buzz/error tone was added). `chain` and `boom` are the two
    // genuinely new sounds this genre needs. `chain` is a fast two-note
    // ascending sparkle, pitched higher and quicker than `pickup`, for a
    // cascade step (a match caused by falling gems, not the direct swap) —
    // distinct enough that a combo escalating reads as more exciting than a
    // plain match. `boom` is a low punchy hit (a descending sub-bass tone
    // plus a brief high crack, same dual-tone shape as `thwack` but pitched
    // lower/longer) for a color bomb activating — the genre's biggest,
    // rarest payoff, so it gets the most physically "large" sound here.
    chain: () => { tone(760, 0.05, 'triangle', 0.05, 1080); setTimeout(() => tone(1080, 0.06, 'triangle', 0.045, 1400), 45); },
    boom: () => { tone(90, 0.32, 'sawtooth', 0.09, 35); tone(600, 0.04, 'square', 0.05, 120); },
    // Added for games/siege-break — a block/masonry shattering into rubble.
    // The catapult release, heavy boulder impact, target-defeated and
    // level-clear/fail cues all deliberately reuse existing patterns instead
    // of adding more (`thwack` already reads as a launch/release, `boom` — a
    // low punchy sub-bass hit — already reads as a heavy stone slamming home,
    // `pickup` already reads as a bright "got one" for a felled target, and
    // `win`/`die` already read as clear/fail). `crumble` is the one genuinely
    // new sound this genre needs: a short two-note downward crackle
    // (sawtooth then square, both sliding down) reading as brittle stone
    // breaking apart — distinct from the harder single-hit `boom`/`clack`
    // because it's the sound of something disintegrating, not two solid
    // bodies meeting. Kept brief since a collapse can shatter several blocks
    // in quick succession.
    crumble: () => { tone(300, 0.09, 'sawtooth', 0.05, 90); setTimeout(() => tone(190, 0.08, 'square', 0.045, 70), 42); },
    // Added for games/storm-warden — controlled-bolt-cast and wild-bolt-
    // strike cues. Charge-building telegraph deliberately reuses the
    // existing `tick` pattern unchanged (a soft neutral pulse played at an
    // accelerating cadence as a threat's charge nears peak already reads as
    // an urgent countdown), and a wrong/wasted cast reuses `screech`
    // (already established elsewhere as "that action was invalid/reversed",
    // e.g. gem-swap's invalid-swap snap-back) — so `zap` and `thunder` are
    // the two genuinely new sounds this genre needs. `zap` is a bright,
    // fast upward crackle (two overlapping square/sawtooth sweeps a beat
    // apart) for a well-timed controlled cast — distinct from `pop`'s
    // flatter single blip because a lightning discharge should sound more
    // electric/textured than a mechanical shot. `thunder` is a low
    // rumbling crack built from a short sharp high tick (the initial
    // "crack" transient) layered under three detuned low-frequency
    // oscillators (sawtooth/square/sine) swept further downward, reading as
    // a booming, noise-like peal rather than a single clean tone — the
    // hub's most physically "large" sound, so a struck building lands with
    // real weight.
    zap: () => { tone(360, 0.07, 'square', 0.05, 1400); setTimeout(() => tone(900, 0.05, 'sawtooth', 0.035, 1800), 30); },
    thunder: () => {
      tone(1200, 0.02, 'square', 0.05);
      tone(140, 0.5, 'sawtooth', 0.09, 32);
      tone(95, 0.6, 'square', 0.07, 24);
      tone(60, 0.7, 'sine', 0.08, 18);
    },
    // Added for games/drop-smash — a ball impact that dents a tower layer
    // without breaking it (its crack visibly deepens). The drop release,
    // no-damage bounce, ball-ball knock, full-layer break and exit-the-
    // bottom cues all deliberately reuse existing patterns instead of
    // adding more (`whoosh` already reads as something released to fall,
    // `bounce` already reads as a plain rebound, `clack` already reads as
    // two hard round bodies meeting, `crumble` — siege-break's masonry-
    // shattering cue — already reads as a layer breaking outright, and
    // `land` already reads as a solid touchdown for a ball leaving the
    // bottom of the frame), so `crack` is the one genuinely new sound this
    // genre needs: a single short, dry, high snap (one quick square blip
    // sliding down in pitch) distinct from `bounce` (no pitch slide, reads
    // as a neutral knock) and from `crumble` (two lower notes, longer,
    // reads as full collapse) — a hit landed and did damage, but the layer
    // is still standing.
    crack: () => tone(950, 0.045, 'square', 0.045, 650),
    // Added for games/dash-runner — a 3-lane endless runner. Jump/land,
    // lane-change, coin, crash, power-up and UI-tap cues all deliberately
    // reuse existing patterns instead of adding more (`hop` — cross-the-
    // road's forward-hop chirp — already reads as a jump lift-off; `land`
    // already reads as a real-gravity touchdown; `tick` already reads as a
    // lateral move, the exact precedent set by cross-the-road's own
    // within-lane dodge; `pickup` already reads as a bright coin chime;
    // `die` already reads as a crash; `win` already reads as an
    // achievement fanfare, reused here for both a power-up activating and
    // a new best distance; `boom` already reads as a big, satisfying
    // payoff hit, reused for smashing through an obstacle while
    // invincible), so `duck` is the one genuinely new sound this genre
    // needs: nothing existing captures a quick crouch/slide-down motion.
    // It's a fast downward pitch sweep from a mid-high tone — distinct
    // from `land` (a short, low, punchy thud with almost no slide, reading
    // as an impact) because ducking is a deliberate dodge, not a landing.
    duck: () => tone(480, 0.09, 'sine', 0.045, 160),
    // Added for games/blade-fruit — a blade slicing through a fruit
    // mid-air. Combo-continuation, bomb-explosion, miss and game-over
    // feedback all deliberately reuse existing patterns instead of adding
    // more (`chain` — gem-swap's cascade sparkle — already reads perfectly
    // as "another hit landed in the same streak", reused here for the 2nd+
    // fruit sliced within one continuous swipe; `boom` already reads as a
    // big, dangerous payoff hit, reused for the bomb going off; `screech`
    // already reads as "that was a mistake" for a missed fruit costing a
    // life; `die` already reads as the run-ending sting regardless of
    // cause), so `slice` is the one genuinely new sound this genre needs:
    // nothing existing captures a fast, bright blade swish. It's a very
    // short upward-then-downward pitch sweep (two overlapping fast tone()
    // sweeps a beat apart, same "sweep approximates a texture" approach as
    // `zap`/`hop`) — distinct from `clack` (a flat, non-sliding click for
    // two hard round bodies meeting) because a fruit slice should sound
    // fast and airy, not like an impact.
    slice: () => { tone(1400, 0.035, 'sine', 0.05, 2200); setTimeout(() => tone(2000, 0.03, 'sine', 0.035, 900), 18); },
  };

  return {
    unlock: ensure,
    play(name) {
      const fn = patterns[name];
      if (fn) fn();
    },
  };
}
