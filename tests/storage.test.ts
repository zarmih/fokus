import { expect, test, beforeEach } from 'vitest';
import { Storage, CURRENT_SCHEMA_VERSION } from '../src/core/storage';

class MockBackend {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
  keys() { return Object.keys(this.data); }
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

test('storage export can redact name and lifestyle', () => {
  storage.setProfile({
    ...storage.getProfile(),
    name: 'Михаил',
    displayName: 'Михаил',
    lastLifestyle: { sleep: 'low', stress: 'high', date: '2026-09-11' }
  });
  storage.addDaySummary({
    date: '2026-09-11',
    totalScore: 10,
    domainDeltas: {},
    streak: 1,
    skipped: false,
    lifestyle: { sleep: 'low', stress: 'high' }
  });
  const full = storage.exportJson();
  expect(full).toContain('Михаил');
  expect(full).toContain('lastLifestyle');
  const redacted = storage.exportJson({ redact: true });
  expect(redacted).not.toContain('Михаил');
  expect(redacted).not.toContain('lastLifestyle');
  expect(redacted).not.toMatch(/"lifestyle"/);
  expect(redacted).toContain('"name":"User"');
});

test('storage import accepts a redacted dump', () => {
  storage.setProfile({
    ...storage.getProfile(),
    name: 'Михаил',
    displayName: 'Михаил',
    sessionLengthSec: 720
  });
  const redacted = storage.exportJson({ redact: true });
  backend.removeItem('fokus.v1');
  const s2 = new Storage(backend as any);
  expect(s2.importJson(redacted)).toBe(true);
  expect(s2.getProfile().sessionLengthSec).toBe(720);
  expect(s2.getProfile().name).toBe('User');
  expect(s2.getProfile().displayName).toBeUndefined();
});

test('storage reset removes every fokus.* key', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'Ada' });
  backend.setItem('fokus.reminder.last', '2026-09-11');
  backend.setItem('fokus.orphan', 'x');
  backend.setItem('other.app', 'keep');
  storage.reset();
  expect(backend.getItem('fokus.v1')).toBeNull();
  expect(backend.getItem('fokus.reminder.last')).toBeNull();
  expect(backend.getItem('fokus.orphan')).toBeNull();
  expect(backend.getItem('other.app')).toBe('keep');
});

test('storage resetProgress keeps theme and wipes sessions', () => {
  storage.setProfile({
    ...storage.getProfile(),
    name: 'Ada',
    displayName: 'Ada',
    theme: 'light',
    language: 'en',
    sessionLengthSec: 720,
    onboarded: true,
    xp: 40
  });
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-11T10:00:00.000Z',
    finishedAt: '2026-09-11T10:05:00.000Z',
    durationSec: 300,
    items: []
  });
  storage.resetProgress();
  const p = storage.getProfile();
  expect(p.name).toBe('User');
  expect(p.displayName).toBeUndefined();
  expect(p.theme).toBe('light');
  expect(p.language).toBe('en');
  expect(p.sessionLengthSec).toBe(720);
  expect(p.onboarded).toBe(true);
  expect(p.xp).toBe(0);
  expect(storage.getSessions()).toEqual([]);
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
