/**
 * Music Synth — procedural Web Audio synthesis engine.
 *
 * No sample files anywhere: every instrument voice below is built live
 * from OscillatorNode + GainNode + BiquadFilterNode graphs (see each
 * build*Voice() function). This mirrors the pattern in
 * games/_shared/js/ogh-sfx.js (oscillator + gain envelope), scaled up to
 * six distinct multi-oscillator instruments with real ADSR/decay shaping.
 *
 * Voice lifecycle
 * ----------------
 * Each call to noteOn() builds a *fresh* node graph — nothing is reused
 * across notes — so overlapping notes/chords and rapid re-triggers of the
 * same pitch each get an independent voice (real polyphony).
 *
 * Instruments come in two behavioral families (see INSTRUMENTS below):
 *
 *  - "Sustained" (piano, organ, lead, bass): the amplitude envelope holds
 *    at a sustain level for as long as the key is down. noteOff() runs the
 *    voice's release() phase (a fade-out), which is what actually silences
 *    the note.
 *
 *  - "Percussive" (kalimba, bells): a real plucked/struck idiophone doesn't
 *    care how long you hold it — the strike happens once and the decay
 *    plays out on its own. noteOn() schedules the *entire* envelope
 *    (attack through full decay to silence) up front. noteOff() on a
 *    percussive voice never touches the audio graph at all; it only clears
 *    the trigger->voice bookkeeping so the same physical key can be
 *    re-plucked. The decay is never cut short by an early key release.
 *
 * Every voice self-schedules its own cleanup (stop + disconnect all nodes)
 * once its envelope finishes, so long play sessions don't accumulate
 * unbounded audio nodes.
 */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** MIDI note number -> frequency in Hz (A4 = MIDI 69 = 440Hz, equal temperament). */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Scientific-pitch octave + semitone-from-C (0-11) -> MIDI note number. C4 = 60. */
export function noteToMidi(octave, semitone) {
  return (octave + 1) * 12 + semitone;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Procedurally generated reverb impulse response — no downloaded IR file. */
function makeImpulseResponse(ctx, duration, decayPower) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * duration));
  const buf = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Exponentially-decaying white noise = a plausible generic room/plate IR.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayPower);
    }
  }
  return buf;
}

/* ------------------------------------------------------------------------ *
 * Instrument voice recipes.
 *
 * Each builder takes (ctx, freq, velocity) and returns a voice handle:
 *   {
 *     percussive: boolean,
 *     output: GainNode,                 // connect this to the mix bus
 *     oscillators: [{node, gainNode, type, ratio}],  // for inspection/tests
 *     filters: [BiquadFilterNode, ...],
 *     lfo: OscillatorNode | null,
 *     stopAt: number,                   // ctx time by which all osc. stop
 *     release(atTime): number,          // start release; returns new stopAt
 *   }
 * ------------------------------------------------------------------------ */

// --- Piano -----------------------------------------------------------------
// 3 oscillators (sine + triangle + a quiet octave-up sine) slightly detuned
// from each other for chorus-like warmth, ADSR amplitude envelope (fast
// attack, decay to a moderate sustain, release on note-off), and a lowpass
// filter that starts bright and mellows over the decay (piano hammers hit
// hard then the tone loses brightness).
function buildPianoVoice(ctx, freq, velocity) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.7;
  const brightStart = clamp(freq * 5 + 1800, 1200, 9000);
  const brightEnd = clamp(freq * 1.6 + 500, 400, 3200);
  filter.frequency.setValueAtTime(brightStart, t0);
  filter.frequency.exponentialRampToValueAtTime(brightEnd, t0 + 0.9);

  const specs = [
    { type: 'sine', ratio: 1, detune: -4, gain: 0.55 },
    { type: 'triangle', ratio: 1, detune: 5, gain: 0.35 },
    { type: 'sine', ratio: 2, detune: 2, gain: 0.09 },
  ];
  const oscillators = specs.map((s) => {
    const o = ctx.createOscillator();
    o.type = s.type;
    o.frequency.value = freq * s.ratio;
    o.detune.value = s.detune;
    const g = ctx.createGain();
    g.gain.value = s.gain;
    o.connect(g).connect(filter);
    o.start(t0);
    return { node: o, gainNode: g, type: s.type, ratio: s.ratio };
  });
  filter.connect(out);

  const peak = 0.85 * velocity;
  const sustainLevel = Math.max(0.0001, 0.32 * velocity);
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(peak, t0 + 0.005); // ~5ms attack
  out.gain.exponentialRampToValueAtTime(sustainLevel, t0 + 0.55); // decay to sustain

  const stopAt = t0 + 8; // generous ceiling if release() never runs
  oscillators.forEach((o) => o.node.stop(stopAt));

  return {
    percussive: false,
    output: out,
    oscillators,
    filters: [filter],
    lfo: null,
    stopAt,
    release(atTime) {
      const rt = Math.max(atTime, ctx.currentTime);
      out.gain.cancelScheduledValues(rt);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), rt);
      out.gain.exponentialRampToValueAtTime(0.0001, rt + 0.32);
      out.gain.linearRampToValueAtTime(0, rt + 0.4);
      filter.frequency.cancelScheduledValues(rt);
      filter.frequency.setValueAtTime(Math.max(200, filter.frequency.value), rt);
      filter.frequency.exponentialRampToValueAtTime(220, rt + 0.4);
      const endAt = rt + 0.42;
      oscillators.forEach((o) => o.node.stop(endAt));
      return endAt;
    },
  };
}

// --- Kalimba -----------------------------------------------------------------
// Plucked metal-tine idiophone. Near-instant attack, NO sustain phase — a
// pure trigger-and-decay pluck. Fundamental sine + two INHARMONIC partials
// (~2.0x and ~3.76x, not clean ~2x/~4x) give the metallic/bell-like
// timbre; a quick downward pitch envelope over the first ~15ms mimics the
// mechanical "twang" of a released tine; a lowpass filter closes as the
// note decays. Lower notes ring longer than higher ones.
function buildKalimbaVoice(ctx, freq, velocity) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 1;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.5;
  const brightStart = clamp(freq * 6 + 2200, 1800, 11000);
  const brightEnd = clamp(freq * 1.8 + 300, 300, 2600);

  // Lower notes ring longer: inverse relationship with frequency, clamped
  // to the ~0.8-2.0s range a real kalimba tine rings for.
  const decay = clamp(1.75 * Math.pow(220 / freq, 0.32), 0.8, 2.0);

  filter.frequency.setValueAtTime(brightStart, t0);
  filter.frequency.exponentialRampToValueAtTime(brightEnd, t0 + decay);

  const partials = [
    { ratio: 1, gain: 0.9, decayMul: 1.0, pitchDrop: 0.03 },
    { ratio: 2.0, gain: 0.32, decayMul: 0.55, pitchDrop: 0.05 },
    { ratio: 3.76, gain: 0.16, decayMul: 0.35, pitchDrop: 0.07 },
  ];
  const oscillators = partials.map((p) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f = freq * p.ratio;
    // Quick downward pitch "twang" over the first ~15ms.
    o.frequency.setValueAtTime(f * (1 + p.pitchDrop), t0);
    o.frequency.exponentialRampToValueAtTime(f, t0 + 0.015);

    const g = ctx.createGain();
    const partialDecay = Math.max(0.15, decay * p.decayMul);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(p.gain * velocity, t0 + 0.002); // 1-3ms attack
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + partialDecay);

    o.connect(g).connect(filter);
    o.start(t0);
    const stopAt = t0 + partialDecay + 0.05;
    o.stop(stopAt);
    return { node: o, gainNode: g, type: 'sine', ratio: p.ratio, stopAt };
  });
  filter.connect(out);

  const stopAt = Math.max(...oscillators.map((o) => o.stopAt));

  return {
    percussive: true,
    output: out,
    oscillators,
    filters: [filter],
    lfo: null,
    stopAt,
    // Real kalimba tines keep ringing after your finger leaves them —
    // noteOff() intentionally does not touch this voice's envelope at all.
    release() {
      return stopAt;
    },
  };
}

// --- Organ -------------------------------------------------------------------
// Stacked sine oscillators at clean integer harmonic ("drawbar") ratios.
// Instant on / instant off amplitude envelope — no decay while held, no
// release tail to speak of (just enough of a ramp to avoid a click).
function buildOrganVoice(ctx, freq, velocity) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0;

  const drawbars = [
    { ratio: 0.5, gain: 0.16 }, // sub-octave (16')
    { ratio: 1, gain: 0.34 },   // unison (8')
    { ratio: 2, gain: 0.24 },   // octave (4')
    { ratio: 3, gain: 0.14 },   // twelfth (2 2/3')
    { ratio: 4, gain: 0.1 },    // two octaves (2')
  ];
  const oscillators = drawbars.map((d) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * d.ratio;
    const g = ctx.createGain();
    g.gain.value = d.gain;
    o.connect(g).connect(out);
    o.start(t0);
    return { node: o, gainNode: g, type: 'sine', ratio: d.ratio };
  });

  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(0.75 * velocity, t0 + 0.006); // instant on

  const stopAt = t0 + 8;
  oscillators.forEach((o) => o.node.stop(stopAt));

  return {
    percussive: false,
    output: out,
    oscillators,
    filters: [],
    lfo: null,
    stopAt,
    release(atTime) {
      const rt = Math.max(atTime, ctx.currentTime);
      out.gain.cancelScheduledValues(rt);
      out.gain.setValueAtTime(out.gain.value, rt);
      out.gain.linearRampToValueAtTime(0, rt + 0.02); // instant off
      const endAt = rt + 0.03;
      oscillators.forEach((o) => o.node.stop(endAt));
      return endAt;
    },
  };
}

// --- Bells / Marimba ----------------------------------------------------------
// A second plucked/struck idiophone, deliberately differentiated from
// Kalimba: more partials, brighter and DIFFERENT inharmonic ratios
// (~2.76x / ~5.4x / ~7.1x instead of Kalimba's ~2.0x / ~3.76x), a shorter
// decay range, a brighter filter that stays more open, faster attack, and
// no pitch-drop twang (struck, not plucked).
function buildBellsVoice(ctx, freq, velocity) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 1;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.3;
  const brightStart = clamp(freq * 9 + 4000, 3000, 14000);
  const brightEnd = clamp(freq * 3 + 900, 700, 5000);

  const decay = clamp(1.1 * Math.pow(180 / freq, 0.28), 0.6, 1.4);
  filter.frequency.setValueAtTime(brightStart, t0);
  filter.frequency.exponentialRampToValueAtTime(brightEnd, t0 + decay);

  const partials = [
    { ratio: 1, gain: 0.8, decayMul: 1.0 },
    { ratio: 2.76, gain: 0.4, decayMul: 0.7 },
    { ratio: 5.4, gain: 0.22, decayMul: 0.4 },
    { ratio: 7.1, gain: 0.1, decayMul: 0.22 },
  ];
  const oscillators = partials.map((p) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * p.ratio;
    const g = ctx.createGain();
    const partialDecay = Math.max(0.12, decay * p.decayMul);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(p.gain * velocity, t0 + 0.001); // ~1ms strike
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + partialDecay);
    o.connect(g).connect(filter);
    o.start(t0);
    const stopAt = t0 + partialDecay + 0.05;
    o.stop(stopAt);
    return { node: o, gainNode: g, type: 'sine', ratio: p.ratio, stopAt };
  });
  filter.connect(out);

  const stopAt = Math.max(...oscillators.map((o) => o.stopAt));

  return {
    percussive: true,
    output: out,
    oscillators,
    filters: [filter],
    lfo: null,
    stopAt,
    release() {
      return stopAt;
    },
  };
}

// --- Lead / electric piano -----------------------------------------------------
// Sine + square blend (soft body + buzzy edge) with a slow vibrato LFO
// modulating oscillator detune. Standard ADSR, held while the key is down.
function buildLeadVoice(ctx, freq, velocity) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = clamp(freq * 6 + 2500, 1500, 8000);
  filter.Q.value = 1;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5.5; // slow vibrato rate
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0, t0);
  lfoGain.gain.linearRampToValueAtTime(9, t0 + 0.5); // depth in cents, fades in
  lfo.connect(lfoGain);
  lfo.start(t0);

  const specs = [
    { type: 'sine', gain: 0.6 },
    { type: 'square', gain: 0.22 },
  ];
  const oscillators = specs.map((s) => {
    const o = ctx.createOscillator();
    o.type = s.type;
    o.frequency.value = freq;
    lfoGain.connect(o.detune);
    const g = ctx.createGain();
    g.gain.value = s.gain;
    o.connect(g).connect(filter);
    o.start(t0);
    return { node: o, gainNode: g, type: s.type, ratio: 1 };
  });
  filter.connect(out);

  const peak = 0.8 * velocity;
  const sustainLevel = Math.max(0.0001, 0.5 * velocity);
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(peak, t0 + 0.015);
  out.gain.exponentialRampToValueAtTime(sustainLevel, t0 + 0.25);

  const stopAt = t0 + 8;
  oscillators.forEach((o) => o.node.stop(stopAt));
  lfo.stop(stopAt);

  return {
    percussive: false,
    output: out,
    oscillators,
    filters: [filter],
    lfo,
    stopAt,
    release(atTime) {
      const rt = Math.max(atTime, ctx.currentTime);
      out.gain.cancelScheduledValues(rt);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), rt);
      out.gain.exponentialRampToValueAtTime(0.0001, rt + 0.25);
      out.gain.linearRampToValueAtTime(0, rt + 0.3);
      const endAt = rt + 0.32;
      oscillators.forEach((o) => o.node.stop(endAt));
      lfo.stop(endAt);
      return endAt;
    },
  };
}

// --- Bass ----------------------------------------------------------------------
// Sawtooth + square + a sub-sine an octave down, through a resonant lowpass
// filter with its own fast envelope (bright pluck -> dark) — short and
// punchy, but still a proper held voice (sustains at a low level while the
// key is down, like the other non-percussive instruments).
function buildBassVoice(ctx, freq, velocity) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 8;
  const fEnvStart = clamp(freq * 6 + 1800, 900, 4500);
  const fEnvEnd = clamp(freq * 1.4 + 220, 150, 900);
  filter.frequency.setValueAtTime(fEnvStart, t0);
  filter.frequency.exponentialRampToValueAtTime(fEnvEnd, t0 + 0.18);

  const specs = [
    { type: 'sawtooth', ratio: 1, gain: 0.55 },
    { type: 'square', ratio: 1, gain: 0.25 },
    { type: 'sine', ratio: 0.5, gain: 0.3 }, // sub-oscillator, one octave down
  ];
  const oscillators = specs.map((s) => {
    const o = ctx.createOscillator();
    o.type = s.type;
    o.frequency.value = freq * s.ratio;
    const g = ctx.createGain();
    g.gain.value = s.gain;
    o.connect(g).connect(filter);
    o.start(t0);
    return { node: o, gainNode: g, type: s.type, ratio: s.ratio };
  });
  filter.connect(out);

  const peak = 0.9 * velocity;
  const sustainLevel = Math.max(0.0001, 0.22 * velocity);
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(peak, t0 + 0.003);
  out.gain.exponentialRampToValueAtTime(sustainLevel, t0 + 0.14); // decays fast even while held

  const stopAt = t0 + 8;
  oscillators.forEach((o) => o.node.stop(stopAt));

  return {
    percussive: false,
    output: out,
    oscillators,
    filters: [filter],
    lfo: null,
    stopAt,
    release(atTime) {
      const rt = Math.max(atTime, ctx.currentTime);
      out.gain.cancelScheduledValues(rt);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), rt);
      out.gain.exponentialRampToValueAtTime(0.0001, rt + 0.1);
      out.gain.linearRampToValueAtTime(0, rt + 0.13);
      filter.frequency.cancelScheduledValues(rt);
      filter.frequency.setValueAtTime(Math.max(150, filter.frequency.value), rt);
      filter.frequency.exponentialRampToValueAtTime(150, rt + 0.12);
      const endAt = rt + 0.14;
      oscillators.forEach((o) => o.node.stop(endAt));
      return endAt;
    },
  };
}

const BUILDERS = {
  piano: buildPianoVoice,
  kalimba: buildKalimbaVoice,
  organ: buildOrganVoice,
  bells: buildBellsVoice,
  lead: buildLeadVoice,
  bass: buildBassVoice,
};

// Keep in sync with BUILDERS above — `percussive` here mirrors what each
// builder actually returns, used by the UI layer (button badges etc.).
export const INSTRUMENTS = [
  { id: 'piano', percussive: false },
  { id: 'kalimba', percussive: true },
  { id: 'organ', percussive: false },
  { id: 'bells', percussive: true },
  { id: 'lead', percussive: false },
  { id: 'bass', percussive: false },
];

export class SynthEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.reverbSend = null;
    this.convolver = null;
    this.reverbReturn = null;
    /** @type {Map<number, object>} voiceId -> voice handle */
    this.voices = new Map();
    /** @type {Map<string, number>} triggerId (pointer/key) -> voiceId */
    this.voicesByTrigger = new Map();
    this._nextVoiceId = 1;
  }

  /** Lazily create (or resume) the AudioContext. Must run from a user gesture. */
  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    // A gentle limiter so polyphony/chords across instruments don't clip.
    this.compressor = ctx.createDynamicsCompressor();
    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);

    // Procedural convolution reverb bus (generated impulse response, no IR file).
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.18 * 0.6;
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = makeImpulseResponse(ctx, 2.6, 3.0);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.9;
    this.reverbSend.connect(this.convolver);
    this.convolver.connect(this.reverbReturn);
    this.reverbReturn.connect(this.master);

    return ctx;
  }

  setMasterVolume(v) {
    const ctx = this.ensureContext();
    this.master.gain.setTargetAtTime(clamp(v, 0, 1), ctx.currentTime, 0.01);
  }

  setReverbAmount(v) {
    const ctx = this.ensureContext();
    this.reverbSend.gain.setTargetAtTime(clamp(v, 0, 1) * 0.6, ctx.currentTime, 0.02);
  }

  /**
   * Trigger a note. `triggerId` identifies the physical input holding the
   * note (e.g. `key:KeyA` or `ptr:3`) so noteOff() can find it again.
   * Always builds a brand-new node graph — never reuses oscillators.
   */
  noteOn(triggerId, midi, instrumentId, velocity = 1) {
    const ctx = this.ensureContext();
    const build = BUILDERS[instrumentId] || BUILDERS.piano;
    const freq = midiToFreq(midi);
    const voice = build(ctx, freq, clamp(velocity, 0.05, 1));
    voice.output.connect(this.master);
    voice.output.connect(this.reverbSend);

    const voiceId = this._nextVoiceId++;
    voice.id = voiceId;
    voice.instrumentId = instrumentId;
    voice.midi = midi;
    voice.freq = freq;
    voice.triggerId = triggerId;

    this.voices.set(voiceId, voice);
    this.voicesByTrigger.set(triggerId, voiceId);
    this._scheduleCleanup(voiceId, voice, voice.stopAt);
    return voice;
  }

  /**
   * Release the note currently held by `triggerId`. For sustained voices
   * this starts the release/fade-out. For percussive voices (kalimba,
   * bells) this is deliberately a no-op on the audio graph — the pluck
   * keeps ringing on its own schedule; only the trigger->voice bookkeeping
   * is cleared, so the same key can be plucked again.
   */
  noteOff(triggerId, atTime) {
    const voiceId = this.voicesByTrigger.get(triggerId);
    if (voiceId == null) return null;
    this.voicesByTrigger.delete(triggerId);
    const voice = this.voices.get(voiceId);
    if (!voice) return null;
    if (!voice.percussive) {
      const t = atTime != null ? atTime : this.ctx.currentTime;
      const endAt = voice.release(t);
      this._scheduleCleanup(voiceId, voice, endAt);
    }
    return voice;
  }

  _scheduleCleanup(voiceId, voice, atCtxTime) {
    if (voice._cleanupTimer) clearTimeout(voice._cleanupTimer);
    const ms = Math.max(0, (atCtxTime - this.ctx.currentTime) * 1000) + 80;
    voice._cleanupTimer = setTimeout(() => {
      voice.oscillators.forEach((o) => {
        try { o.node.stop(); } catch (_e) { /* already stopped */ }
        try { o.node.disconnect(); } catch (_e) { /* noop */ }
        try { o.gainNode.disconnect(); } catch (_e) { /* noop */ }
      });
      voice.filters.forEach((f) => {
        try { f.disconnect(); } catch (_e) { /* noop */ }
      });
      if (voice.lfo) {
        try { voice.lfo.stop(); } catch (_e) { /* noop */ }
        try { voice.lfo.disconnect(); } catch (_e) { /* noop */ }
      }
      try { voice.output.disconnect(); } catch (_e) { /* noop */ }
      if (this.voices.get(voiceId) === voice) this.voices.delete(voiceId);
    }, ms);
  }
}
