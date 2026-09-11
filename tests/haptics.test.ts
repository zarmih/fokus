import { expect, test, beforeEach } from 'vitest';
import { __setVibrateForTests, canVibrate, vibrateForCue, vibratePattern } from '../src/core/haptics';
import type { SoundPrefs } from '../src/core/soundscape';

const on: SoundPrefs = { muted: false, volume: 1, hapticsOn: true, reducedMotion: false };

beforeEach(() => {
  __setVibrateForTests(undefined);
});

test('canVibrate is false when implementation is missing or prefs disable it', () => {
  __setVibrateForTests(null);
  expect(canVibrate()).toBe(false);
  __setVibrateForTests(() => true);
  expect(canVibrate()).toBe(true);
  expect(canVibrate({ hapticsOn: false })).toBe(false);
});

test('vibrateForCue no-ops without API and does not throw', () => {
  __setVibrateForTests(null);
  expect(vibrateForCue('hit', on)).toBe(false);
  expect(vibratePattern(12)).toBe(false);
});

test('vibrateForCue sends the graph pattern', () => {
  const calls: (number | number[])[] = [];
  __setVibrateForTests((pattern) => {
    calls.push(pattern);
    return true;
  });
  expect(vibrateForCue('hit', on)).toBe(true);
  expect(vibrateForCue('miss', on)).toBe(true);
  expect(vibrateForCue('combo', on, { combo: 5 })).toBe(true);
  expect(calls).toEqual([12, 28, [12, 40, 12]]);
});

test('flourish haptics skip under reduce-motion; feedback remains', () => {
  const calls: (number | number[])[] = [];
  __setVibrateForTests((pattern) => {
    calls.push(pattern);
    return true;
  });
  const rm: SoundPrefs = { ...on, reducedMotion: true };
  expect(vibrateForCue('hit', rm)).toBe(true);
  expect(vibrateForCue('combo', rm, { combo: 8 })).toBe(false);
  expect(vibrateForCue('ritual', rm)).toBe(false);
  expect(vibrateForCue('celebrate', rm)).toBe(false);
  expect(calls).toEqual([12]);
});

test('hapticsOn false skips all patterns', () => {
  __setVibrateForTests(() => true);
  expect(vibrateForCue('miss', { ...on, hapticsOn: false })).toBe(false);
});

test('vibrate swallows implementation errors', () => {
  __setVibrateForTests(() => {
    throw new Error('nope');
  });
  expect(vibratePattern(16)).toBe(false);
  expect(vibrateForCue('tap', on)).toBe(false);
});
