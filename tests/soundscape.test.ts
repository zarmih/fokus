import { expect, test, describe } from 'vitest';
import {
  CUE_IDS,
  CUE_GRAPH,
  COMBO_MILESTONES,
  clampVolume,
  comboAtMilestone,
  detectReducedMotion,
  masterGainValue,
  nextCombo,
  rawPartials,
  readSoundPrefs,
  scheduleCue,
  scaleFreq,
  isTonicDegree,
  streakDegree,
  streakFreq,
  SCALE_NAME,
  SCALE_ROOT_HZ,
  SCALE_STEPS,
  STREAK_PHRASE,
  type CueId,
  type SoundPrefs
} from '../src/core/soundscape';

const audible: SoundPrefs = {
  muted: false,
  volume: 1,
  hapticsOn: true,
  reducedMotion: false
};

describe('cue graph', () => {
  test('exposes tap/hit/miss/combo/ritual/celebrate', () => {
    expect([...CUE_IDS]).toEqual(['tap', 'hit', 'miss', 'combo', 'ritual', 'celebrate']);
    for (const id of CUE_IDS) {
      expect(CUE_GRAPH[id].id).toBe(id);
      expect(CUE_GRAPH[id].haptic).toBeDefined();
      expect(rawPartials(id).length).toBeGreaterThan(0);
    }
  });

  test('ducking edges', () => {
    expect(CUE_GRAPH.tap.ducks).toEqual([]);
    expect(CUE_GRAPH.hit.ducks).toEqual([]);
    expect(CUE_GRAPH.miss.ducks).toEqual(['hit']);
    expect(CUE_GRAPH.combo.ducks).toEqual([]);
    expect(CUE_GRAPH.ritual.ducks).toEqual(['tap']);
    expect(CUE_GRAPH.celebrate.ducks).toEqual(['tap', 'hit', 'miss', 'combo', 'ritual']);
  });

  test('feedback vs flourish', () => {
    expect(CUE_GRAPH.tap.kind).toBe('feedback');
    expect(CUE_GRAPH.hit.kind).toBe('feedback');
    expect(CUE_GRAPH.miss.kind).toBe('feedback');
    expect(CUE_GRAPH.combo.kind).toBe('flourish');
    expect(CUE_GRAPH.ritual.kind).toBe('flourish');
    expect(CUE_GRAPH.celebrate.kind).toBe('flourish');
  });
});

describe('prefs', () => {
  test('clampVolume', () => {
    expect(clampVolume(0.4)).toBe(0.4);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(NaN)).toBe(1);
    expect(clampVolume(undefined)).toBe(1);
    expect(clampVolume('0.5')).toBe(1);
  });

  test('readSoundPrefs mute, volume, haptics defaults', () => {
    expect(readSoundPrefs({ soundOn: true }, false)).toMatchObject({
      muted: false,
      volume: 1,
      hapticsOn: true,
      reducedMotion: false
    });
    expect(readSoundPrefs({ soundOn: false, soundVolume: 0.3, hapticsOn: false }, true)).toEqual({
      muted: true,
      volume: 0.3,
      hapticsOn: false,
      reducedMotion: true
    });
  });

  test('masterGainValue is 0 when muted regardless of slider', () => {
    expect(masterGainValue({ ...audible, muted: true, volume: 1 })).toBe(0);
    expect(masterGainValue({ ...audible, volume: 0.25 })).toBe(0.25);
    expect(masterGainValue({ ...audible, volume: 0 })).toBe(0);
  });
});

describe('scheduleCue', () => {
  test('mute and zero volume skip audio but keep haptic when enabled', () => {
    const muted = scheduleCue('hit', { ...audible, muted: true });
    expect(muted.skipAudio).toBe(true);
    expect(muted.partials).toEqual([]);
    expect(muted.skipHaptic).toBe(false);
    expect(muted.haptic).toBe(12);

    const quiet = scheduleCue('tap', { ...audible, volume: 0 });
    expect(quiet.skipAudio).toBe(true);
    expect(quiet.haptic).toBe(8);
  });

  test('hapticsOn false skips vibration only', () => {
    const s = scheduleCue('miss', { ...audible, hapticsOn: false });
    expect(s.skipAudio).toBe(false);
    expect(s.partials.length).toBeGreaterThan(0);
    expect(s.skipHaptic).toBe(true);
    expect(s.haptic).toBeNull();
  });

  test('hit pitch climbs with combo along the scale', () => {
    const low = scheduleCue('hit', audible, { combo: 1 });
    const high = scheduleCue('hit', audible, { combo: 10 });
    expect(low.partials[0].freq).toBe(293.66);
    expect(high.partials[0].freq).toBe(scaleFreq(8));
    expect(high.partials[0].freq).toBeGreaterThan(low.partials[0].freq);
  });

  test('combo below 3 is silent', () => {
    const s = scheduleCue('combo', audible, { combo: 2 });
    expect(s.partials).toEqual([]);
    expect(s.skipAudio).toBe(true);
  });

  test('combo is a four-note tonic arpeggio of crystal voices', () => {
    const s = scheduleCue('combo', audible, { combo: 5 });
    const fundamentals = s.partials.filter((_, i) => i % 3 === 0);
    expect(fundamentals).toHaveLength(4);
    expect(fundamentals.map((p) => p.freq)).toEqual([scaleFreq(5), scaleFreq(7), scaleFreq(8), scaleFreq(10)]);
    const delays = [...new Set(s.partials.map((p) => p.delay))];
    expect(delays).toEqual([0.06, 0.13, 0.2, 0.27]);
  });

  test('reduce-motion skips combo flourish and collapses ritual/celebrate', () => {
    const rm: SoundPrefs = { ...audible, reducedMotion: true };
    const combo = scheduleCue('combo', rm, { combo: 8 });
    expect(combo.skipAudio).toBe(true);
    expect(combo.skipHaptic).toBe(true);
    expect(combo.partials).toEqual([]);

    const ritual = scheduleCue('ritual', rm);
    expect(ritual.partials).toHaveLength(1);
    expect(ritual.partials[0].type).toBe('sine');
    expect(ritual.partials[0].dur).toBeLessThanOrEqual(0.08);
    expect(ritual.skipHaptic).toBe(true);

    const celebrate = scheduleCue('celebrate', rm);
    expect(celebrate.partials).toHaveLength(1);
    expect(celebrate.skipHaptic).toBe(true);
  });

  test('reduce-motion keeps short feedback hit/miss and their haptics', () => {
    const rm: SoundPrefs = { ...audible, reducedMotion: true };
    const hit = scheduleCue('hit', rm, { combo: 4 });
    expect(hit.skipAudio).toBe(false);
    expect(hit.skipHaptic).toBe(false);
    expect(hit.partials.every((p) => p.dur <= 0.08)).toBe(true);
    expect(hit.partials.every((p) => p.freqEnd === undefined)).toBe(true);

    const miss = scheduleCue('miss', rm);
    expect(miss.skipHaptic).toBe(false);
    expect(miss.haptic).toBe(28);
    expect(miss.partials[0].freqEnd).toBeUndefined();
  });

  test('volume is not baked into scheduled partials', () => {
    const full = scheduleCue('tap', audible);
    const half = scheduleCue('tap', { ...audible, volume: 0.5 });
    expect(half.partials[0].gain).toBe(full.partials[0].gain);
    expect(masterGainValue({ ...audible, volume: 0.5 })).toBe(0.5);
  });
});

describe('combo helpers', () => {
  test('nextCombo and milestones', () => {
    expect(nextCombo(0, true)).toBe(1);
    expect(nextCombo(4, true)).toBe(5);
    expect(nextCombo(5, false)).toBe(0);
    expect([...COMBO_MILESTONES]).toEqual([3, 5, 8, 12]);
    expect(comboAtMilestone(3)).toBe(true);
    expect(comboAtMilestone(4)).toBe(false);
    expect(comboAtMilestone(12)).toBe(true);
  });
});

describe('detectReducedMotion', () => {
  test('reads injected media and defaults to false without matchMedia', () => {
    expect(detectReducedMotion({ matches: true })).toBe(true);
    expect(detectReducedMotion({ matches: false })).toBe(false);
  });
});

describe('every cue schedules under default prefs', () => {
  test.each(CUE_IDS as unknown as CueId[])('%s has audio and haptic', (id) => {
    const s = scheduleCue(id, audible, { combo: 5 });
    expect(s.skipAudio).toBe(false);
    expect(s.partials.length).toBeGreaterThan(0);
    expect(s.skipHaptic).toBe(false);
    expect(s.haptic).not.toBeNull();
  });
});

describe('quiet light key and timbre', () => {
  test('single key: D major pentatonic from D4', () => {
    expect(SCALE_NAME).toBe('D major pentatonic');
    expect(SCALE_ROOT_HZ).toBeCloseTo(293.66, 2);
    expect([...SCALE_STEPS]).toEqual([0, 2, 4, 7, 9]);
    expect([0, 1, 2, 3, 4, 5].map(scaleFreq)).toEqual([293.66, 329.63, 369.99, 440, 493.88, 587.33]);
    expect(scaleFreq(-5)).toBeCloseTo(146.83, 1);
    expect(scaleFreq(10)).toBeCloseTo(1174.66, 1);
    expect(isTonicDegree(0)).toBe(true);
    expect(isTonicDegree(5)).toBe(true);
    expect(isTonicDegree(-5)).toBe(true);
    expect(isTonicDegree(3)).toBe(false);
  });

  const inKey = (f: number) => {
    const semis = 12 * Math.log2(f / SCALE_ROOT_HZ);
    const pc = ((Math.round(semis) % 12) + 12) % 12;
    return (SCALE_STEPS as readonly number[]).includes(pc);
  };

  test.each(CUE_IDS as unknown as CueId[])('%s: sine-only, soft attack, lowpassed, fundamentals in key', (id) => {
    const parts = rawPartials(id, { combo: 5 });
    for (const p of parts) {
      expect(p.type).toBe('sine');
      expect(p.attack).toBeGreaterThanOrEqual(0.005);
      expect(p.attack).toBeLessThanOrEqual(0.01);
      expect(p.lowpass).toBeGreaterThan(0);
      expect(p.lowpass).toBeLessThanOrEqual(4000);
      expect(p.gain).toBeLessThanOrEqual(0.06);
      expect(p.dur).toBeGreaterThan(p.attack ?? 0);
    }
    // the loudest partial of each note is the in-key fundamental
    const loud = parts.filter((p) => p.gain >= Math.max(...parts.map((q) => q.gain)) * 0.5);
    for (const p of loud) expect(inKey(p.freq)).toBe(true);
  });

  test('overtones are quieter and decay faster than the fundamental', () => {
    const [f, ...ov] = rawPartials('hit', { combo: 2 });
    expect(ov.length).toBeGreaterThan(0);
    for (const o of ov) {
      expect(o.gain).toBeLessThan(f.gain);
      expect(o.dur).toBeLessThan(f.dur);
      expect(o.freq).toBeGreaterThan(f.freq);
    }
  });

  test('miss is a soft low muted tone, not a buzz', () => {
    const parts = rawPartials('miss');
    expect(parts[0].freq).toBeLessThan(200);
    expect(parts.every((p) => p.type === 'sine')).toBe(true);
    expect(parts.every((p) => (p.lowpass ?? 0) <= 800)).toBe(true);
    // gentle droop only (no wide sweep)
    expect(parts[0].freqEnd! / parts[0].freq).toBeGreaterThan(0.9);
  });
});

describe('streak melody', () => {
  test('phrase walks the scale and resolves on the tonic at every milestone', () => {
    expect(STREAK_PHRASE).toHaveLength(12);
    for (const m of COMBO_MILESTONES) expect(isTonicDegree(streakDegree(m))).toBe(true);
    for (let n = 1; n <= 12; n++) {
      if (!comboAtMilestone(n) && n !== 1) expect(isTonicDegree(streakDegree(n))).toBe(false);
    }
    // each segment between milestones rises
    const segments = [[1, 3], [4, 5], [6, 8], [9, 12]];
    for (const [a, b] of segments) {
      for (let n = a; n < b; n++) expect(streakFreq(n + 1)).toBeGreaterThan(streakFreq(n));
    }
  });

  test('streak resets on miss to the phrase start', () => {
    let combo = 0;
    const notes: number[] = [];
    for (const ok of [true, true, true, true, false, true]) {
      combo = nextCombo(combo, ok);
      if (ok) notes.push(streakFreq(combo));
    }
    expect(notes).toEqual([scaleFreq(0), scaleFreq(2), scaleFreq(5), scaleFreq(3), scaleFreq(0)]);
  });

  test('long streaks loop a four-note cadence ending on the tonic', () => {
    expect([13, 14, 15, 16].map(streakDegree)).toEqual([7, 8, 9, 10]);
    expect(streakDegree(16 + 4)).toBe(10);
    expect(streakDegree(0)).toBe(0);
    expect(streakDegree(NaN)).toBe(0);
  });

  test('hit at a milestone rings a little longer', () => {
    const resolve = rawPartials('hit', { combo: 3 })[0];
    const step = rawPartials('hit', { combo: 2 })[0];
    expect(resolve.dur).toBeGreaterThan(step.dur);
  });

  test('reduced motion keeps attack/lowpass on shortened feedback', () => {
    const hit = scheduleCue('hit', { ...audible, reducedMotion: true }, { combo: 3 });
    expect(hit.partials.every((p) => p.attack !== undefined && p.lowpass !== undefined)).toBe(true);
  });
});
