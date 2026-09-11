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

  test('hit pitch climbs with combo', () => {
    const low = scheduleCue('hit', audible, { combo: 1 });
    const high = scheduleCue('hit', audible, { combo: 10 });
    expect(low.partials[0].freq).toBe(522);
    expect(high.partials[0].freq).toBe(900);
    expect(high.partials[0].freq).toBeGreaterThan(low.partials[0].freq);
  });

  test('combo below 3 is silent', () => {
    const s = scheduleCue('combo', audible, { combo: 2 });
    expect(s.partials).toEqual([]);
    expect(s.skipAudio).toBe(true);
  });

  test('combo triad has three delayed notes', () => {
    const s = scheduleCue('combo', audible, { combo: 5 });
    expect(s.partials).toHaveLength(3);
    expect(s.partials.map((p) => p.delay)).toEqual([0, 0.055, 0.11]);
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
