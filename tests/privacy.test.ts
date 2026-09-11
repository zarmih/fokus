import { expect, test, vi } from 'vitest';
import {
  ANON_NAME,
  APP_STATE_KEY,
  KNOWN_STORES,
  REMINDER_LAST_KEY,
  WIPE_CONFIRM_WORD,
  buildExportFile,
  detectStoredPii,
  formatBytes,
  inventoryLocalData,
  isWipeConfirm,
  listFokusKeys,
  redactExportJson,
  redactForLog,
  redactState,
  resetProgressState,
  stripPii,
  wipeAppCaches,
  wipeFokusKeys
} from '../src/core/privacy';
import { REMINDER_LAST_KEY as reminderKeyFromModule } from '../src/core/reminders';
import { CURRENT_SCHEMA_VERSION } from '../src/core/storage';
import { safeError } from '../src/core/log';
import type { AppState } from '../src/core/types';

class MockStore {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] ?? null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
  keys() { return Object.keys(this.data); }
}

function sampleState(): AppState {
  return {
    profile: {
      name: 'Михаил',
      displayName: 'Михаил',
      createdAt: '2026-01-01T00:00:00.000Z',
      sessionLengthSec: 480,
      soundOn: true,
      onboarded: true,
      theme: 'light',
      language: 'ru',
      locale: 'ru',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      xp: 12,
      lastLifestyle: { sleep: 'low', stress: 'high', date: '2026-09-11' }
    },
    domains: [{ domain: 'attention', value: 500, updatedAt: '2026-09-11' }],
    skills: [],
    exerciseStates: [],
    sessions: [{
      id: 's1',
      startedAt: '2026-09-11T10:00:00.000Z',
      finishedAt: '2026-09-11T10:05:00.000Z',
      durationSec: 300,
      items: []
    }],
    daySummaries: [{
      date: '2026-09-11',
      totalScore: 40,
      domainDeltas: {},
      streak: 2,
      skipped: false,
      lifestyle: { sleep: 'low', stress: 'high' }
    }],
    history: []
  };
}

test('known store catalog covers app state and reminder keys', () => {
  const keys = KNOWN_STORES.map((s) => s.key);
  expect(keys).toContain(APP_STATE_KEY);
  expect(keys).toContain(REMINDER_LAST_KEY);
  expect(REMINDER_LAST_KEY).toBe(reminderKeyFromModule);
  expect(KNOWN_STORES.every((s) => s.key.startsWith('fokus.'))).toBe(true);
});

test('inventory lists known stores and unknown fokus keys with sizes', () => {
  const store = new MockStore();
  store.setItem(APP_STATE_KEY, JSON.stringify(sampleState()));
  store.setItem(REMINDER_LAST_KEY, '2026-09-11');
  store.setItem('fokus.orphan', '{"email":"ada@example.com"}');
  store.setItem('unrelated', 'nope');

  const report = inventoryLocalData(store);
  expect(report.items.find((i) => i.key === APP_STATE_KEY)?.present).toBe(true);
  expect(report.items.find((i) => i.key === APP_STATE_KEY)?.piiPresent).toBe(true);
  expect(report.items.find((i) => i.key === REMINDER_LAST_KEY)?.piiPresent).toBe(false);
  expect(report.items.find((i) => i.key === 'fokus.orphan')?.category).toBe('unknown');
  expect(report.pii.name).toBe(true);
  expect(report.pii.lifestyle).toBe(true);
  expect(report.totalBytes).toBeGreaterThan(0);
  expect(listFokusKeys(store)).not.toContain('unrelated');
});

test('inventory without keys() still probes the catalog', () => {
  const data: Record<string, string> = {
    [APP_STATE_KEY]: JSON.stringify({ profile: { name: 'User' } })
  };
  const store = {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; }
  };
  const report = inventoryLocalData(store);
  expect(report.items).toHaveLength(KNOWN_STORES.length);
  expect(report.pii.name).toBe(false);
});

test('redactState strips name and lifestyle but keeps sessions', () => {
  const redacted = redactState(sampleState());
  expect(redacted.profile.name).toBe(ANON_NAME);
  expect(redacted.profile.displayName).toBeUndefined();
  expect(redacted.profile.lastLifestyle).toBeUndefined();
  expect(redacted.daySummaries[0].lifestyle).toBeUndefined();
  expect(redacted.sessions).toHaveLength(1);
  expect(redacted.profile.sessionLengthSec).toBe(480);
});

test('redacted export json cannot be grepped for the display name', () => {
  const raw = JSON.stringify(sampleState());
  const body = redactExportJson(raw);
  expect(body).not.toContain('Михаил');
  expect(body).not.toContain('lastLifestyle');
  expect(body).not.toMatch(/"lifestyle"/);
  const parsed = JSON.parse(body);
  expect(parsed.profile.name).toBe('User');
  expect(parsed.daySummaries[0].totalScore).toBe(40);
});

test('corrupt export redacts to an anonymous stub instead of leaking the raw string', () => {
  const body = redactExportJson('not-json Михаил ada@example.com');
  expect(body).not.toContain('Михаил');
  expect(body).not.toContain('ada@example.com');
  expect(JSON.parse(body).profile.name).toBe('User');
});

test('buildExportFile names redacted vs full dumps', () => {
  const raw = JSON.stringify(sampleState());
  const now = new Date('2026-09-11T12:00:00.000Z');
  const redacted = buildExportFile(raw, true, now);
  const full = buildExportFile(raw, false, now);
  expect(redacted.filename).toBe('fokus-data-2026-09-11.json');
  expect(full.filename).toBe('fokus-data-2026-09-11-full.json');
  expect(redacted.body).not.toContain('Михаил');
  expect(full.body).toContain('Михаил');
});

test('resetProgressState keeps preferences and drops PII plus sessions', () => {
  const next = resetProgressState(sampleState(), { schemaVersion: CURRENT_SCHEMA_VERSION, now: '2026-09-11T00:00:00.000Z' });
  expect(next.profile.name).toBe('User');
  expect(next.profile.theme).toBe('light');
  expect(next.profile.sessionLengthSec).toBe(480);
  expect(next.profile.onboarded).toBe(true);
  expect(next.profile.xp).toBe(0);
  expect(next.sessions).toEqual([]);
  expect(next.daySummaries).toEqual([]);
  expect(next.domains).toEqual([]);
});

test('stripPii can drop name or lifestyle independently', () => {
  const nameOnly = stripPii(sampleState(), ['name']);
  expect(nameOnly.profile.name).toBe('User');
  expect(nameOnly.profile.lastLifestyle?.sleep).toBe('low');
  const lifeOnly = stripPii(sampleState(), ['lifestyle']);
  expect(lifeOnly.profile.displayName).toBe('Михаил');
  expect(lifeOnly.profile.lastLifestyle).toBeUndefined();
  expect(lifeOnly.daySummaries[0].lifestyle).toBeUndefined();
});

test('wipeFokusKeys removes prefix keys and leaves foreign keys', () => {
  const store = new MockStore();
  store.setItem(APP_STATE_KEY, '{}');
  store.setItem(REMINDER_LAST_KEY, '2026-09-11');
  store.setItem('fokus.extra', '1');
  store.setItem('theme', 'dark');
  expect(wipeFokusKeys(store).sort()).toEqual([APP_STATE_KEY, 'fokus.extra', REMINDER_LAST_KEY].sort());
  expect(store.getItem('theme')).toBe('dark');
  expect(store.getItem(APP_STATE_KEY)).toBeNull();
});

test('wipe confirm is exact and case-sensitive', () => {
  expect(isWipeConfirm(WIPE_CONFIRM_WORD)).toBe(true);
  expect(isWipeConfirm('  УДАЛИТЬ  ')).toBe(true);
  expect(isWipeConfirm('удалить')).toBe(false);
  expect(isWipeConfirm('DELETE')).toBe(false);
  expect(isWipeConfirm('')).toBe(false);
});

test('redactForLog strips PII keys, emails, and Error messages', () => {
  const out = redactForLog({
    displayName: 'Михаил',
    lastLifestyle: { sleep: 'low' },
    level: 4,
    nested: { email: 'ada@example.com', exerciseId: 'stroop' },
    note: 'write ada@example.com'
  }) as any;
  expect(out.displayName).toBe('[redacted]');
  expect(out.lastLifestyle).toBe('[redacted]');
  expect(out.level).toBe(4);
  expect(out.nested.email).toBe('[redacted]');
  expect(out.nested.exerciseId).toBe('stroop');
  expect(out.note).not.toContain('ada@example.com');
  expect(out.note).toContain('[redacted]');

  const err = redactForLog(new Error('fail for ada@example.com')) as any;
  expect(err.message).not.toContain('ada@example.com');
});

test('safeError never prints a raw displayName to console', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  safeError('boom', { displayName: 'Михаил', ice: { candidate: '1.2.3.4' } });
  const dumped = JSON.stringify(spy.mock.calls);
  expect(dumped).not.toContain('Михаил');
  expect(dumped).not.toContain('1.2.3.4');
  expect(dumped).toContain('[redacted]');
  spy.mockRestore();
});

test('detectStoredPii treats anonymous User as no name', () => {
  expect(detectStoredPii({ profile: { name: 'User', createdAt: '', sessionLengthSec: 300, soundOn: true, locale: 'ru', schemaVersion: 3 } })).toEqual({
    name: false,
    lifestyle: false
  });
});

test('formatBytes uses Russian units', () => {
  expect(formatBytes(12)).toBe('12 Б');
  expect(formatBytes(2048)).toMatch(/КБ/);
});

test('wipeAppCaches only deletes fokus-* names', async () => {
  const deleted: string[] = [];
  (globalThis as any).caches = {
    keys: async () => ['fokus-abc', 'other-cache'],
    delete: async (name: string) => { deleted.push(name); return true; }
  };
  const wiped = await wipeAppCaches();
  expect(wiped).toEqual(['fokus-abc']);
  expect(deleted).toEqual(['fokus-abc']);
  delete (globalThis as any).caches;
});
