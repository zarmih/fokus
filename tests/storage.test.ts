import { expect, test, beforeEach } from 'vitest';
import { Storage } from '../src/core/storage';

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
});

test('storage update', () => {
  const p = storage.getProfile();
  p.sessionLengthSec = 480;
  storage.setProfile(p);
  expect(storage.getProfile().sessionLengthSec).toBe(480);
});

test('storage export/reset', () => {
  storage.setProfile({...storage.getProfile(), sessionLengthSec: 720});
  expect(storage.exportJson()).toContain('720');
  storage.reset();
  expect(storage.getProfile().sessionLengthSec).toBe(300); // defaults
});

test('storage migrate (mock)', () => {
  backend.setItem('fokus.v1', JSON.stringify({profile: {schemaVersion: 0, sessionLengthSec: 999}}));
  const s2 = new Storage(backend as any);
  expect(s2.getProfile().schemaVersion).toBe(1);
  expect(s2.getProfile().sessionLengthSec).toBe(999);
});
