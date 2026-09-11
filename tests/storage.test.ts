import { expect, test, beforeEach } from 'vitest';
import { Storage, CURRENT_SCHEMA_VERSION, STORAGE_KEY, BACKUP_KEY, SNAPSHOT_KEY, parseBackup } from '../src/core/storage';
import { fnv1a } from '../src/core/offline-sync';

class MockBackend {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

class QuotaBackend extends MockBackend {
  limit = 800;
  setItem(k: string, v: string) {
    if (v.length > this.limit) {
      const err: Error & { name: string } = new Error('exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.data[k] = v;
  }
}

let backend: MockBackend;
let storage: Storage;

beforeEach(() => {
  backend = new MockBackend();
  storage = new Storage(backend as any, () => '2026-09-11T12:00:00.000Z');
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
  expect(storage.getMeta()?.rev).toBe(1);
  expect(storage.getMeta()?.deviceId).toMatch(/^f-/);
});

test('storage export/import roundtrip', () => {
  storage.setProfile({...storage.getProfile(), sessionLengthSec: 720});
  const json = storage.exportJson();
  expect(json).toContain('720');
  const parsed = parseBackup(json);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.legacy).toBe(false);

  backend.removeItem(STORAGE_KEY);
  backend.removeItem(BACKUP_KEY);
  backend.removeItem(SNAPSHOT_KEY);
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().sessionLengthSec).toBe(300);

  s2.importJson(json);
  expect(s2.getProfile().sessionLengthSec).toBe(720);
});

test('storage migrate (mock)', () => {
  backend.setItem('fokus.v1', JSON.stringify({profile: {schemaVersion: 1, calibrated: true, sessionLengthSec: 999}}));
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(s2.getProfile().onboarded).toBe(true);
  expect(s2.getMeta()?.schemaVersion).toBe(4);
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

test('corrupt live blob is restored from bak', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'First' });
  storage.setProfile({ ...storage.getProfile(), name: 'Second', sessionLengthSec: 720 });
  expect(backend.getItem(BACKUP_KEY)).toBeTruthy();
  backend.setItem(STORAGE_KEY, '{this is not json');
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().name).toBe('First');
  expect(s2.getProfile().sessionLengthSec).toBe(300);
});

test('quota failure leaves previous live state', () => {
  const q = new QuotaBackend();
  q.limit = 4000;
  const s = new Storage(q as any);
  s.setProfile({ ...s.getProfile(), name: 'Ok', sessionLengthSec: 300 });
  const liveBefore = q.getItem(STORAGE_KEY);
  q.limit = 50;
  const err = console.error;
  console.error = () => {};
  s.setProfile({ ...s.getProfile(), name: 'TooBig', sessionLengthSec: 720 });
  console.error = err;
  expect(q.getItem(STORAGE_KEY)).toBe(liveBefore);
  expect(s.getProfile().name).toBe('Ok');
});

test('import merge keeps local-only sessions and snapshots previous live', () => {
  storage.addSession({ id: 'local-1', startedAt: 'a', finishedAt: 'a', durationSec: 10, items: [] });
  const other = new Storage(new MockBackend() as any);
  other.addSession({ id: 'other-1', startedAt: 'b', finishedAt: 'b', durationSec: 10, items: [] });
  other.setProfile({ ...other.getProfile(), name: 'Other', xp: 50 });

  const result = storage.importBackup(other.exportJson(), 'merge');
  expect(result.ok).toBe(true);
  expect(storage.getSessions().map((s) => s.id).sort()).toEqual(['local-1', 'other-1']);
  expect(storage.hasSnapshot()).toBe(true);

  storage.addSession({ id: 'after', startedAt: 'c', finishedAt: 'c', durationSec: 1, items: [] });
  expect(storage.restoreSnapshot()).toBe(true);
  expect(storage.getSessions().map((s) => s.id)).toEqual(['local-1']);
});

test('import replace overwrites sessions and can restore snapshot', () => {
  storage.addSession({ id: 'local-1', startedAt: 'a', finishedAt: 'a', durationSec: 10, items: [] });
  const other = new Storage(new MockBackend() as any);
  other.addSession({ id: 'other-1', startedAt: 'b', finishedAt: 'b', durationSec: 10, items: [] });
  const ok = storage.importJson(other.exportJson(), { mode: 'replace' });
  expect(ok).toBe(true);
  expect(storage.getSessions().map((s) => s.id)).toEqual(['other-1']);
  expect(storage.restoreSnapshot()).toBe(true);
  expect(storage.getSessions().map((s) => s.id)).toEqual(['local-1']);
});

test('legacy raw import still migrates', () => {
  const raw = JSON.stringify({
    profile: { schemaVersion: 1, calibrated: true, sessionLengthSec: 480, name: 'Legacy' },
    sessions: [{ id: 'old', startedAt: 't', finishedAt: 't', durationSec: 1, items: [] }]
  });
  expect(storage.importJson(raw)).toBe(true);
  expect(storage.getProfile().onboarded).toBe(true);
  expect(storage.getProfile().sessionLengthSec).toBe(480);
  expect(storage.getSessions()[0].id).toBe('old');
  expect(storage.getProfile().schemaVersion).toBe(4);
});

test('future backup is rejected and does not clobber live', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'Safe' });
  const payload = { profile: { schemaVersion: 99, name: 'Future' } };
  const env = {
    kind: 'fokus-backup',
    format: 1,
    exportedAt: 't',
    checksum: fnv1a(JSON.stringify(payload)),
    payload
  };
  expect(storage.importJson(JSON.stringify(env))).toBe(false);
  expect(storage.getProfile().name).toBe('Safe');
});

test('inspectImport reports new sessions', () => {
  storage.addSession({ id: 'a', startedAt: 't', finishedAt: 't', durationSec: 1, items: [] });
  const other = new Storage(new MockBackend() as any);
  other.addSession({ id: 'a', startedAt: 't', finishedAt: 't', durationSec: 1, items: [] });
  other.addSession({ id: 'b', startedAt: 'u', finishedAt: 'u', durationSec: 1, items: [] });
  const inspected = storage.inspectImport(other.exportJson());
  expect(inspected.ok).toBe(true);
  if (inspected.ok) {
    expect(inspected.preview.sessions).toBe(2);
    expect(inspected.preview.sessionsNew).toBe(1);
  }
});

test('history is not truncated at 30', () => {
  for (let i = 0; i < 40; i++) {
    storage.addHistory({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, minutes: 5, score: i, accuracy: 1, domainDeltas: {} });
  }
  expect(storage.getHistory()).toHaveLength(40);
});

test('reset clears live, bak and snapshot', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'X' });
  storage.setProfile({ ...storage.getProfile(), name: 'Y' });
  storage.importBackup(storage.exportJson(), 'replace');
  expect(backend.getItem(STORAGE_KEY)).toBeTruthy();
  storage.reset();
  expect(backend.getItem(STORAGE_KEY)).toBeNull();
  expect(backend.getItem(BACKUP_KEY)).toBeNull();
  expect(backend.getItem(SNAPSHOT_KEY)).toBeNull();
});

test('getHealth after first write', () => {
  expect(storage.getHealth().empty).toBe(true);
  storage.setProfile({ ...storage.getProfile(), name: 'Ada' });
  const h = storage.getHealth();
  expect(h.empty).toBe(false);
  expect(h.schemaVersion).toBe(4);
  expect(h.rev).toBeGreaterThan(0);
  expect(h.bytes).toBeGreaterThan(0);
  expect(h.deviceId).toMatch(/^f-/);
});
