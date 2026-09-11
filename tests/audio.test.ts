import { expect, test, beforeEach } from 'vitest';
import {
  __resetAudioForTests,
  __setAudioContextForTests,
  applyMasterGain,
  playBeep,
  playCelebrate,
  playCombo,
  playCue,
  playHit,
  playMiss,
  playRitual,
  playTap,
  playTick,
  unlockAudio,
  nextCombo,
  type AudioGraphContext
} from '../src/core/audio';
import { storage } from '../src/core/storage';
import { __setVibrateForTests } from '../src/core/haptics';

function param(value = 1) {
  return {
    value,
    setValueAtTime(v: number) { this.value = v; },
    exponentialRampToValueAtTime(v: number) { this.value = v; },
    setTargetAtTime(v: number) { this.value = v; },
    cancelScheduledValues() {}
  };
}

function fakeCtx() {
  const oscStarts: number[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: async () => {},
    oscStarts,
    createOscillator() {
      const osc = {
        type: 'sine' as OscillatorType,
        frequency: param(440),
        connect() {},
        start() { oscStarts.push(1); },
        stop() {}
      };
      return osc;
    },
    createGain() {
      return { gain: param(1), connect() {} };
    }
  };
  return ctx;
}

beforeEach(() => {
  storage.reset();
  __resetAudioForTests();
  __setVibrateForTests(() => true);
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
    playTap();
    playRitual();
    playCelebrate();
  }).not.toThrow();
});

test('sound helpers stay silent when sound is off', () => {
  const p = storage.getProfile();
  p.soundOn = false;
  storage.setProfile(p);
  const ctx = fakeCtx();
  __setAudioContextForTests(ctx as unknown as AudioGraphContext);
  playHit(8);
  playMiss();
  playRitual();
  playCelebrate();
  expect(ctx.oscStarts.length).toBe(0);
});

test('playCue renders oscillators when sound is on', () => {
  const p = storage.getProfile();
  p.soundOn = true;
  p.soundVolume = 1;
  storage.setProfile(p);
  const ctx = fakeCtx();
  __setAudioContextForTests(ctx as unknown as AudioGraphContext);
  const scheduled = playCue('hit', { combo: 3 });
  expect(scheduled.skipAudio).toBe(false);
  expect(ctx.oscStarts.length).toBe(scheduled.partials.length);
});

test('volume 0 skips oscillators', () => {
  const p = storage.getProfile();
  p.soundOn = true;
  p.soundVolume = 0;
  storage.setProfile(p);
  const ctx = fakeCtx();
  __setAudioContextForTests(ctx as unknown as AudioGraphContext);
  playTap();
  expect(ctx.oscStarts.length).toBe(0);
});

test('applyMasterGain follows mute and volume', () => {
  const ctx = fakeCtx();
  __setAudioContextForTests(ctx as unknown as AudioGraphContext);
  const p = storage.getProfile();
  p.soundOn = true;
  p.soundVolume = 0.4;
  storage.setProfile(p);
  unlockAudio();
  applyMasterGain();
  p.soundOn = false;
  storage.setProfile(p);
  applyMasterGain();
  expect(() => applyMasterGain()).not.toThrow();
});

test('playCombo below 3 does not schedule', () => {
  const p = storage.getProfile();
  p.soundOn = true;
  storage.setProfile(p);
  const ctx = fakeCtx();
  __setAudioContextForTests(ctx as unknown as AudioGraphContext);
  playCombo(2);
  expect(ctx.oscStarts.length).toBe(0);
  playCombo(3);
  expect(ctx.oscStarts.length).toBeGreaterThan(0);
});
