import { expect, test } from 'vitest';
import {
  applyRecoveryGate,
  estimateRecovery,
  planWithRecovery,
  sessionLoad
} from '../src/core/recovery';
import { scoreSessionQuality } from '../src/core/sessionQuality';
import type { DaySummary, Session, SessionItem } from '../src/core/types';
import type { TrainingPlan } from '../src/core/session-builder';

function item(partial: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: partial.exerciseId || 'grid-memory',
    level: partial.level ?? 5,
    accuracy: partial.accuracy ?? 0.88,
    avgRtMs: partial.avgRtMs ?? 420,
    score: 60,
    ...partial
  };
}

function session(partial: Partial<Session> & { n?: number } = {}): Session {
  const n = partial.n ?? 3;
  const items = partial.items || Array.from({ length: n }, (_, i) => item({ avgRtMs: 410 + i * 8 }));
  return {
    id: partial.id || 's',
    startedAt: partial.startedAt || '2026-09-10T10:00:00.000Z',
    finishedAt: partial.finishedAt === undefined ? '2026-09-10T10:05:00.000Z' : partial.finishedAt,
    durationSec: partial.durationSec ?? 300,
    items,
    interrupted: partial.interrupted,
    endReason: partial.endReason,
    plannedDurationSec: partial.plannedDurationSec ?? 300
  };
}

const catalog = [
  { manifest: { id: 'grid-memory', domain: 'memory', skills: [] as string[] } },
  { manifest: { id: 'stroop', domain: 'attention', skills: [] as string[] } },
  { manifest: { id: 'odd-one', domain: 'logic', skills: [] as string[] } },
  { manifest: { id: 'switch-rule', domain: 'flexibility', skills: [] as string[] } },
  { manifest: { id: 'math-sprint', domain: 'speed', skills: [] as string[] } }
];

test('too few sessions stay steady with low confidence (no fake alarm)', () => {
  const snap = estimateRecovery({
    sessions: [session({ id: 'only' })],
    plannedDurationSec: 480,
    nowIso: '2026-09-11T10:00:00.000Z'
  });
  expect(snap.recommendation).toBe('steady');
  expect(snap.confidence).toBe('low');
  expect(snap.gate.active).toBe(false);
  expect(snap.hint.body).toMatch(/не балл способностей/i);
});

test('high load EWMA recommends rest-light and shortens the next ritual', () => {
  const hard: Session[] = [0, 1, 2, 3].map((i) =>
    session({
      id: `h${i}`,
      startedAt: `2026-09-${String(7 + i).padStart(2, '0')}T18:00:00.000Z`,
      durationSec: 700,
      plannedDurationSec: 720,
      items: [
        item({ level: 14, accuracy: 0.48, avgRtMs: 900 }),
        item({ level: 13, accuracy: 0.5, avgRtMs: 1400 }),
        item({ level: 12, accuracy: 0.42, avgRtMs: 1800 })
      ]
    })
  );
  const snap = estimateRecovery({
    sessions: hard,
    plannedDurationSec: 720,
    nowIso: '2026-09-11T10:00:00.000Z',
    catalog
  });
  expect(snap.recommendation).toBe('rest-light');
  expect(snap.gate.active).toBe(true);
  expect(snap.durationSec).toBe(300);
  expect(snap.hint.title).toMatch(/короче/i);
});

test('quality drop vs EWMA triggers rest-light', () => {
  const good = (id: string, day: string): Session =>
    session({
      id,
      startedAt: `${day}T09:00:00.000Z`,
      items: [item({ accuracy: 0.9, avgRtMs: 400, level: 5 }), item({ accuracy: 0.88, avgRtMs: 410, level: 5 }), item({ accuracy: 0.91, avgRtMs: 405, level: 5 })]
    });
  const drop = session({
    id: 'drop',
    startedAt: '2026-09-11T09:00:00.000Z',
    items: [item({ accuracy: 0.45, avgRtMs: 900, level: 5 }), item({ accuracy: 0.4, avgRtMs: 1200, level: 5 }), item({ accuracy: 0.42, avgRtMs: 1500, level: 5 })]
  });
  const snap = estimateRecovery({
    sessions: [good('a', '2026-09-08'), good('b', '2026-09-09'), good('c', '2026-09-10'), drop],
    plannedDurationSec: 480,
    nowIso: '2026-09-11T12:00:00.000Z'
  });
  expect(snap.qualityDelta).not.toBeNull();
  expect(snap.qualityDelta!).toBeLessThan(-12);
  expect(snap.recommendation).toBe('rest-light');
});

test('low load and high quality can push-hard', () => {
  const easy: Session[] = [0, 1, 2].map((i) =>
    session({
      id: `p${i}`,
      startedAt: `2026-09-${String(8 + i).padStart(2, '0')}T09:00:00.000Z`,
      durationSec: 240,
      items: [
        item({ level: 4, accuracy: 0.9, avgRtMs: 390 }),
        item({ level: 4, accuracy: 0.88, avgRtMs: 400 }),
        item({ level: 4, accuracy: 0.91, avgRtMs: 395 })
      ]
    })
  );
  const snap = estimateRecovery({
    sessions: easy,
    plannedDurationSec: 300,
    nowIso: '2026-09-11T09:00:00.000Z',
    daySummaries: [
      { date: '2026-09-08', totalScore: 80, domainDeltas: {}, streak: 1, skipped: false },
      { date: '2026-09-09', totalScore: 90, domainDeltas: {}, streak: 2, skipped: false },
      { date: '2026-09-10', totalScore: 85, domainDeltas: {}, streak: 3, skipped: false }
    ]
  });
  expect(snap.loadEwma).toBeLessThanOrEqual(40);
  expect(snap.recommendation).toBe('push-hard');
  expect(snap.gate.active).toBe(false);
  expect(snap.durationSec).toBe(300);
});

function hardSession(id: string, startedAt: string): Session {
  return session({
    id,
    startedAt,
    durationSec: 700,
    plannedDurationSec: 720,
    items: [
      item({ level: 14, accuracy: 0.48, avgRtMs: 900 }),
      item({ level: 13, accuracy: 0.5, avgRtMs: 1400 }),
      item({ level: 12, accuracy: 0.42, avgRtMs: 1800 })
    ]
  });
}

test('recoveryHints false forces a no-op gate', () => {
  const hard = [0, 1, 2, 3].map((i) =>
    hardSession(`x${i}`, `2026-09-${String(7 + i).padStart(2, '0')}T18:00:00.000Z`)
  );
  const snap = estimateRecovery({
    sessions: hard,
    plannedDurationSec: 720,
    recoveryHintsEnabled: false,
    nowIso: '2026-09-11T10:00:00.000Z'
  });
  expect(snap.recommendation).toBe('rest-light');
  expect(snap.gate.active).toBe(false);
  expect(snap.durationSec).toBe(720);
});

test('applyRecoveryGate is a no-op when inactive or catalog is empty', () => {
  const plan: TrainingPlan = {
    focusDomains: ['memory'],
    items: [{ exerciseId: 'grid-memory', reason: 'x' }]
  };
  expect(applyRecoveryGate({
    plan,
    catalog,
    gate: { active: false, targetDurationSec: null, avoidDomains: ['memory'], preferLowerDifficulty: true, reason: '' }
  })).toBe(plan);
  expect(applyRecoveryGate({
    plan,
    catalog: [],
    gate: { active: true, targetDurationSec: 300, avoidDomains: ['memory'], preferLowerDifficulty: true, reason: 'x' }
  })).toBe(plan);
});

test('applyRecoveryGate swaps away from recent domains when alternatives exist', () => {
  const plan: TrainingPlan = {
    focusDomains: ['memory', 'attention'],
    items: [
      { exerciseId: 'grid-memory', reason: 'память' },
      { exerciseId: 'stroop', reason: 'внимание' }
    ]
  };
  const next = applyRecoveryGate({
    plan,
    catalog,
    states: [
      { exerciseId: 'odd-one', level: 2, difficulty: 2, performance: 400, lastPlayedAt: '', lastAccuracy: 0.8 },
      { exerciseId: 'switch-rule', level: 8, difficulty: 8, performance: 400, lastPlayedAt: '', lastAccuracy: 0.8 },
      { exerciseId: 'math-sprint', level: 9, difficulty: 9, performance: 400, lastPlayedAt: '', lastAccuracy: 0.8 }
    ],
    gate: {
      active: true,
      targetDurationSec: 300,
      avoidDomains: ['memory', 'attention'],
      preferLowerDifficulty: true,
      reason: 'разгрузка'
    }
  });
  expect(next).not.toBe(plan);
  const ids = next.items.map((i) => i.exerciseId);
  expect(ids).not.toContain('grid-memory');
  expect(ids).not.toContain('stroop');
  expect(ids[0]).toBe('odd-one');
  expect(next.items[0].reason).toMatch(/разгрузка/i);
});

test('planWithRecovery shortens duration on rest-light and still returns a plan', () => {
  const sessions = [0, 1, 2, 3].map((i) =>
    hardSession(`z${i}`, `2026-09-${String(7 + i).padStart(2, '0')}T18:00:00.000Z`)
  );
  const { plan, snapshot } = planWithRecovery({
    durationSec: 720,
    catalog,
    domains: [
      { domain: 'memory', value: 400 },
      { domain: 'attention', value: 500 },
      { domain: 'logic', value: 450 },
      { domain: 'flexibility', value: 480 },
      { domain: 'speed', value: 470 }
    ],
    skills: [],
    states: catalog.map((c) => ({
      exerciseId: c.manifest.id,
      level: 2,
      difficulty: 2,
      performance: 400,
      lastPlayedAt: '2026-09-01T00:00:00.000Z',
      lastAccuracy: 0.7
    })),
    sessions,
    recoveryHintsEnabled: true,
    nowIso: '2026-09-11T10:00:00.000Z'
  });
  expect(snapshot.gate.active).toBe(true);
  expect(snapshot.durationSec).toBe(300);
  expect(plan.items.length).toBeGreaterThan(0);
});

test('sessionLoad rises with duration, difficulty, struggle and low sleep', () => {
  const easySess = session({ durationSec: 200, items: [item({ level: 2, accuracy: 0.9 })] });
  const hardSess = session({
    durationSec: 700,
    items: [item({ level: 14, accuracy: 0.4 }), item({ level: 14, accuracy: 0.4 })]
  });
  const easyQ = scoreSessionQuality(easySess);
  const hardQ = scoreSessionQuality(hardSess);
  const lifestyle: DaySummary['lifestyle'] = { sleep: 'low', stress: 'high' };
  expect(sessionLoad(hardSess, hardQ, 2, lifestyle)).toBeGreaterThan(sessionLoad(easySess, easyQ, 1));
});

test('a rest gap decays load so yesterday-hard does not lock rest-light forever', () => {
  const hard = session({
    id: 'old',
    startedAt: '2026-09-07T18:00:00.000Z',
    durationSec: 700,
    items: [item({ level: 14, accuracy: 0.4 }), item({ level: 14, accuracy: 0.4 }), item({ level: 14, accuracy: 0.4 })]
  });
  const fresh = estimateRecovery({
    sessions: [hard, hard, hard],
    plannedDurationSec: 720,
    nowIso: '2026-09-08T10:00:00.000Z'
  });
  const rested = estimateRecovery({
    sessions: [hard, hard, hard],
    plannedDurationSec: 720,
    nowIso: '2026-09-11T10:00:00.000Z'
  });
  expect(rested.loadEwma).toBeLessThan(fresh.loadEwma);
});
