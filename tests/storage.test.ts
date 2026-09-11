import { expect, test, beforeEach } from 'vitest';
import { Storage, CURRENT_SCHEMA_VERSION } from '../src/core/storage';

class MockBackend {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

let backend: MockBackend;
let storage: Storage;

beforeEach(() => {
  backend = new MockBackend();
  storage = new Storage(backend as any);
});

test('storage defaults', () => {
  const p = storage.getProfile();
  expect(p.sessionLengthSec).toBe(300);
  expect(p.soundOn).toBe(true);
  expect(p.soundVolume).toBe(1);
  expect(p.hapticsOn).toBe(true);
});

test('storage update', () => {
  const p = storage.getProfile();
  p.sessionLengthSec = 480;
  storage.setProfile(p);
  expect(storage.getProfile().sessionLengthSec).toBe(480);
});

test('storage export/import roundtrip', () => {
  storage.setProfile({...storage.getProfile(), sessionLengthSec: 720});
  const json = storage.exportJson();
  expect(json).toContain('720');
  
  backend.removeItem('fokus.v1');
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().sessionLengthSec).toBe(300); // defaults
  
  s2.importJson(json);
  expect(s2.getProfile().sessionLengthSec).toBe(720); // restored
});

test('storage migrate (mock)', () => {
  backend.setItem('fokus.v1', JSON.stringify({profile: {schemaVersion: 1, calibrated: true, sessionLengthSec: 999}}));
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(s2.getProfile().onboarded).toBe(true);
});

test('old profiles pick up soundVolume and hapticsOn defaults', () => {
  backend.setItem('fokus.v1', JSON.stringify({
    profile: { schemaVersion: 3, soundOn: true, sessionLengthSec: 300, name: 'User', createdAt: 'x', locale: 'ru' }
  }));
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().soundVolume).toBe(1);
  expect(s2.getProfile().hapticsOn).toBe(true);
});

test('storage migrate v2 to v3 (sources and mastery)', () => {
  backend.setItem('fokus.v1', JSON.stringify({
    profile: {schemaVersion: 2},
    skills: [{ skill: 'visual_memory', value: 500 }],
    exerciseStates: [{ exerciseId: 'grid-memory', level: 1 }]
  }));
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  
  const skills = s2.getSkills();
  expect(skills[0].sources).toEqual([]);
  
  const states = s2.getExerciseStates();
  expect(states[0].mastery).toBe(0);
  expect(states[0].stability).toBe(0.5);
  expect(states[0].consecutivePlateau).toBe(0);
});
