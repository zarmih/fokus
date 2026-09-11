import { expect, test } from 'vitest';
import type { AppState, DaySummary, ExerciseState, Session } from '../src/core/types';
import {
  applyImport,
  CURRENT_BACKUP_FORMAT,
  CURRENT_SCHEMA_VERSION,
  fnv1a,
  inferSchemaVersion,
  mergeStates,
  migrateState,
  parseBackup,
  previewImport,
  serializeBackup
} from '../src/core/offline-sync';

const now = '2026-09-11T12:00:00.000Z';

function baseState(extra: Partial<AppState> = {}): AppState {
  return migrateState(
    {
      profile: { name: 'Local', schemaVersion: 4, xp: 10, sessionLengthSec: 300, soundOn: true, locale: 'ru', createdAt: '2026-01-01T00:00:00.000Z', onboarded: true },
      domains: [],
      skills: [],
      exerciseStates: [],
      sessions: [],
      daySummaries: [],
      history: [],
      meta: { schemaVersion: 4, deviceId: 'f-local', rev: 3, updatedAt: '2026-09-10T10:00:00.000Z' },
      ...extra
    },
    { now, deviceId: 'f-local' }
  );
}

test('fnv1a is stable and hex-padded', () => {
  expect(fnv1a('')).toBe('811c9dc5');
  expect(fnv1a('fokus')).toHaveLength(8);
  expect(fnv1a('fokus')).toBe(fnv1a('fokus'));
  expect(fnv1a('fokus')).not.toBe(fnv1a('Fokus'));
});

test('migrate v1 to v4 sets onboarded from calibrated and adds meta', () => {
  const s = migrateState(
    { profile: { schemaVersion: 1, calibrated: true, sessionLengthSec: 480 } },
    { now, deviceId: 'f-dev' }
  );
  expect(s.profile.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(s.profile.onboarded).toBe(true);
  expect(s.profile.sessionLengthSec).toBe(480);
  expect(s.history).toEqual([]);
  expect(s.skills).toEqual([]);
  expect(s.meta?.deviceId).toBe('f-dev');
  expect(s.meta?.schemaVersion).toBe(4);
  expect(s.meta?.rev).toBe(1);
});

test('migrate v2 to v4 fills sources, mastery, stability', () => {
  const s = migrateState(
    {
      profile: { schemaVersion: 2 },
      skills: [{ skill: 'visual_memory', value: 500 }],
      exerciseStates: [{ exerciseId: 'grid-memory', level: 1 }]
    },
    { now, deviceId: 'f-dev' }
  );
  expect(s.profile.schemaVersion).toBe(4);
  expect(s.skills[0].sources).toEqual([]);
  expect(s.exerciseStates[0].mastery).toBe(0);
  expect(s.exerciseStates[0].stability).toBe(0.5);
  expect(s.exerciseStates[0].consecutivePlateau).toBe(0);
});

test('migrate v3 to v4 dedupes collections and stamps meta', () => {
  const s = migrateState(
    {
      profile: { schemaVersion: 3, name: 'A' },
      sessions: [
        { id: 's1', startedAt: 't1', finishedAt: 't1', durationSec: 1, items: [] },
        { id: 's1', startedAt: 't1', finishedAt: 't2', durationSec: 2, items: [] }
      ],
      daySummaries: [
        { date: '2026-09-01', totalScore: 10, domainDeltas: {}, streak: 1, skipped: false },
        { date: '2026-09-01', totalScore: 40, domainDeltas: {}, streak: 1, skipped: false }
      ]
    },
    { now, deviceId: 'f-dev' }
  );
  expect(s.sessions).toHaveLength(1);
  expect(s.sessions[0].finishedAt).toBe('t2');
  expect(s.daySummaries).toHaveLength(1);
  expect(s.daySummaries[0].totalScore).toBe(40);
  expect(s.meta?.deviceId).toBe('f-dev');
});

test('missing schemaVersion is treated as v1', () => {
  expect(inferSchemaVersion({ profile: { name: 'x' } })).toBe(1);
  const s = migrateState({ profile: { name: 'x', calibrated: true } }, { now, deviceId: 'f' });
  expect(s.profile.onboarded).toBe(true);
  expect(s.profile.schemaVersion).toBe(4);
});

test('future schema throws from migrateState', () => {
  expect(() => migrateState({ profile: { schemaVersion: 99 } })).toThrow(/future schema 99/);
});

test('already v4 heals missing profile fields without changing deviceId', () => {
  const s = migrateState(
    { profile: { schemaVersion: 4, name: 'M' }, meta: { schemaVersion: 4, deviceId: 'keep', rev: 8, updatedAt: 't' } },
    { now, deviceId: 'other' }
  );
  expect(s.meta?.deviceId).toBe('keep');
  expect(s.meta?.rev).toBe(8);
  expect(s.profile.sessionLengthSec).toBe(300);
  expect(s.profile.soundOn).toBe(true);
});

test('envelope roundtrip with checksum', () => {
  const state = baseState({ sessions: [{ id: 'a', startedAt: now, finishedAt: now, durationSec: 60, items: [] }] });
  const json = serializeBackup(state, now);
  const env = JSON.parse(json);
  expect(env.kind).toBe('fokus-backup');
  expect(env.format).toBe(CURRENT_BACKUP_FORMAT);
  expect(env.checksum).toBe(fnv1a(JSON.stringify(env.payload)));
  const parsed = parseBackup(json);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) {
    expect(parsed.legacy).toBe(false);
    expect(parsed.checksumOk).toBe(true);
    expect(parsed.schemaVersion).toBe(4);
  }
});

test('pretty-printed envelope still verifies', () => {
  const json = serializeBackup(baseState(), now);
  const pretty = JSON.stringify(JSON.parse(json), null, 2);
  const parsed = parseBackup(pretty);
  expect(parsed.ok).toBe(true);
});

test('tampered payload fails checksum', () => {
  const env = JSON.parse(serializeBackup(baseState(), now));
  env.payload.profile.xp = 99999;
  expect(parseBackup(JSON.stringify(env))).toEqual({ ok: false, error: 'checksum' });
});

test('legacy raw dump is accepted with warning', () => {
  const parsed = parseBackup(JSON.stringify({
    profile: { schemaVersion: 3, name: 'Old', sessionLengthSec: 720 },
    sessions: [],
    domains: [],
    skills: [],
    exerciseStates: [],
    daySummaries: [],
    history: []
  }));
  expect(parsed.ok).toBe(true);
  if (parsed.ok) {
    expect(parsed.legacy).toBe(true);
    expect(parsed.warnings).toContain('legacy_raw');
    expect(parsed.format).toBe(0);
  }
});

test('garbage, missing profile, future format/schema are rejected', () => {
  expect(parseBackup('not-json')).toEqual({ ok: false, error: 'invalid_json' });
  expect(parseBackup('{"hello":1}')).toEqual({ ok: false, error: 'not_fokus' });
  expect(parseBackup(JSON.stringify({
    kind: 'fokus-backup',
    format: 9,
    exportedAt: now,
    checksum: '00',
    payload: { profile: { schemaVersion: 4 } }
  }))).toEqual({ ok: false, error: 'future_format' });

  const payload = { profile: { schemaVersion: 99, name: 'X' }, sessions: [], domains: [], skills: [], exerciseStates: [], daySummaries: [], history: [] };
  expect(parseBackup(JSON.stringify({
    kind: 'fokus-backup',
    format: 1,
    exportedAt: now,
    checksum: fnv1a(JSON.stringify(payload)),
    payload
  }))).toEqual({ ok: false, error: 'future_schema' });
});

test('merge unions sessions by id and does not duplicate', () => {
  const local = baseState({
    sessions: [
      { id: 's1', startedAt: 'a', finishedAt: 'a', durationSec: 1, items: [] },
      { id: 's2', startedAt: 'b', finishedAt: 'b', durationSec: 1, items: [] }
    ]
  });
  const incoming = baseState({
    sessions: [
      { id: 's2', startedAt: 'b', finishedAt: 'c', durationSec: 9, items: [] },
      { id: 's3', startedAt: 'd', finishedAt: 'd', durationSec: 1, items: [] }
    ],
    meta: { schemaVersion: 4, deviceId: 'f-other', rev: 1, updatedAt: '2026-09-11T00:00:00.000Z' }
  });
  const { state, report } = mergeStates(local, incoming, 'merge');
  expect(state.sessions.map((s) => s.id).sort()).toEqual(['s1', 's2', 's3']);
  expect(state.sessions.find((s) => s.id === 's2')?.finishedAt).toBe('c');
  expect(report.sessionsAdded).toBe(1);
  expect(report.mode).toBe('merge');
});

test('merge days by date keeps richer score and unsips if either played', () => {
  const a: DaySummary = { date: '2026-09-01', totalScore: 10, domainDeltas: { memory: 1 }, streak: 2, skipped: true };
  const b: DaySummary = { date: '2026-09-01', totalScore: 80, domainDeltas: { attention: 4 }, streak: 5, skipped: false, fokusIndex: 410 };
  const { state } = mergeStates(
    baseState({ daySummaries: [a] }),
    baseState({ daySummaries: [b] }),
    'merge'
  );
  expect(state.daySummaries).toHaveLength(1);
  expect(state.daySummaries[0].totalScore).toBe(80);
  expect(state.daySummaries[0].skipped).toBe(false);
  expect(state.daySummaries[0].streak).toBe(5);
  expect(state.daySummaries[0].fokusIndex).toBe(410);
});

test('merge profile takes max XP, unions achievements, keeps earlier createdAt', () => {
  const local = baseState({
    profile: {
      name: 'Local',
      createdAt: '2026-01-01T00:00:00.000Z',
      sessionLengthSec: 300,
      soundOn: true,
      locale: 'ru',
      schemaVersion: 4,
      xp: 40,
      onboarded: true,
      achievements: ['a']
    }
  });
  const incoming = baseState({
    profile: {
      name: 'Phone',
      createdAt: '2026-02-01T00:00:00.000Z',
      sessionLengthSec: 720,
      soundOn: false,
      locale: 'ru',
      schemaVersion: 4,
      xp: 90,
      calibrated: true,
      achievements: ['b']
    },
    meta: { schemaVersion: 4, deviceId: 'f-phone', rev: 4, updatedAt: '2026-09-11T18:00:00.000Z' }
  });
  const { state, report } = mergeStates(local, incoming, 'merge');
  expect(state.profile.name).toBe('Phone');
  expect(state.profile.sessionLengthSec).toBe(720);
  expect(state.profile.xp).toBe(90);
  expect(state.profile.achievements?.sort()).toEqual(['a', 'b']);
  expect(state.profile.createdAt).toBe('2026-01-01T00:00:00.000Z');
  expect(state.profile.calibrated).toBe(true);
  expect(state.profile.onboarded).toBe(true);
  expect(state.meta?.deviceId).toBe('f-local');
  expect(report.xpResult).toBe(90);
});

test('merge keeps local scalars when local meta is newer', () => {
  const local = baseState({
    profile: {
      name: 'Local',
      createdAt: '2026-01-01T00:00:00.000Z',
      sessionLengthSec: 300,
      soundOn: true,
      locale: 'ru',
      schemaVersion: 4,
      xp: 5
    },
    meta: { schemaVersion: 4, deviceId: 'f-local', rev: 9, updatedAt: '2026-09-11T20:00:00.000Z' }
  });
  const incoming = baseState({
    profile: {
      name: 'Stale',
      createdAt: '2026-01-01T00:00:00.000Z',
      sessionLengthSec: 720,
      soundOn: true,
      locale: 'ru',
      schemaVersion: 4,
      xp: 5
    },
    meta: { schemaVersion: 4, deviceId: 'f-old', rev: 2, updatedAt: '2026-09-01T00:00:00.000Z' }
  });
  const { state } = mergeStates(local, incoming, 'merge');
  expect(state.profile.name).toBe('Local');
  expect(state.profile.sessionLengthSec).toBe(300);
});

test('merge exercise states by id: later play wins, attempts/mastery max', () => {
  const localEx: ExerciseState = {
    exerciseId: 'stroop',
    level: 2,
    difficulty: 1,
    performance: 400,
    lastPlayedAt: '2026-09-01',
    lastAccuracy: 0.5,
    attempts: 2,
    mastery: 10
  };
  const incomingEx: ExerciseState = {
    exerciseId: 'stroop',
    level: 6,
    difficulty: 3,
    performance: 700,
    lastPlayedAt: '2026-09-10',
    lastAccuracy: 0.9,
    attempts: 8,
    mastery: 40
  };
  const { state } = mergeStates(
    baseState({ exerciseStates: [localEx] }),
    baseState({ exerciseStates: [incomingEx] }),
    'merge'
  );
  expect(state.exerciseStates).toHaveLength(1);
  expect(state.exerciseStates[0].level).toBe(6);
  expect(state.exerciseStates[0].attempts).toBe(8);
  expect(state.exerciseStates[0].mastery).toBe(40);
});

test('replace mode overwrites collections but keeps local deviceId', () => {
  const local = baseState({
    sessions: [{ id: 'keep-me', startedAt: 'a', finishedAt: 'a', durationSec: 1, items: [] } as Session]
  });
  const incoming = baseState({
    sessions: [{ id: 'new', startedAt: 'b', finishedAt: 'b', durationSec: 1, items: [] }],
    profile: { ...baseState().profile, name: 'Incoming', xp: 1 },
    meta: { schemaVersion: 4, deviceId: 'f-phone', rev: 1, updatedAt: now }
  });
  const { state, report } = mergeStates(local, incoming, 'replace');
  expect(state.sessions.map((s) => s.id)).toEqual(['new']);
  expect(state.meta?.deviceId).toBe('f-local');
  expect(report.mode).toBe('replace');
  expect(state.profile.name).toBe('Incoming');
});

test('preview counts sessions and days that local does not have', () => {
  const local = baseState({
    sessions: [{ id: 's1', startedAt: 'a', finishedAt: 'a', durationSec: 1, items: [] }],
    daySummaries: [{ date: '2026-09-01', totalScore: 1, domainDeltas: {}, streak: 1, skipped: false }]
  });
  const incoming = baseState({
    sessions: [
      { id: 's1', startedAt: 'a', finishedAt: 'a', durationSec: 1, items: [] },
      { id: 's2', startedAt: 'b', finishedAt: 'b', durationSec: 1, items: [] }
    ],
    daySummaries: [
      { date: '2026-09-01', totalScore: 1, domainDeltas: {}, streak: 1, skipped: false },
      { date: '2026-09-02', totalScore: 2, domainDeltas: {}, streak: 2, skipped: false }
    ]
  });
  const json = serializeBackup(incoming, now);
  const parsed = parseBackup(json);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const preview = previewImport(local, incoming, parsed);
  expect(preview.sessions).toBe(2);
  expect(preview.sessionsNew).toBe(1);
  expect(preview.days).toBe(2);
  expect(preview.daysNew).toBe(1);
});

test('applyImport merge is lossless for distinct sessions', () => {
  const local = baseState({
    sessions: [{ id: 'phone', startedAt: 'a', finishedAt: 'a', durationSec: 1, items: [] }]
  });
  const incoming = baseState({
    sessions: [{ id: 'tablet', startedAt: 'b', finishedAt: 'b', durationSec: 1, items: [] }]
  });
  const result = applyImport(local, serializeBackup(incoming, now), 'merge', { now, deviceId: 'f-x' });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.state.sessions.map((s) => s.id).sort()).toEqual(['phone', 'tablet']);
});
