import { expect, test, beforeEach } from 'vitest';
import { nextCombo, playHit, playMiss, playCombo, playBeep, playTick, unlockAudio } from '../src/core/audio';
import { storage } from '../src/core/storage';

beforeEach(() => {
  storage.reset();
});

test('combo grows on hits and resets on miss', () => {
  expect(nextCombo(0, true)).toBe(1);
  expect(nextCombo(4, true)).toBe(5);
  expect(nextCombo(5, false)).toBe(0);
  expect(nextCombo(0, false)).toBe(0);
});

test('sound helpers do not throw when AudioContext is missing', () => {
  const p = storage.getProfile();
  p.soundOn = true;
  storage.setProfile(p);
  expect(() => {
    unlockAudio();
    playHit(3);
    playMiss();
    playCombo(5);
    playBeep(true);
    playBeep(false);
    playTick();
  }).not.toThrow();
});

test('sound helpers stay silent when sound is off', () => {
  const p = storage.getProfile();
  p.soundOn = false;
  storage.setProfile(p);
  expect(() => playHit(8)).not.toThrow();
  expect(() => playMiss()).not.toThrow();
});
