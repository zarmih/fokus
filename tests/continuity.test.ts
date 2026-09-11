import { expect, test } from 'vitest';
import {
  applyGentleReturnBias,
  buildContinuitySnapshot,
  gentleReturnRitual,
  ritualDurationSec,
  SOFT_RETURN_DURATION_SEC,
  weeklyContinuityScore
} from '../src/core/continuity';
import { computeDayStreak } from '../src/core/streak';
import type { Session } from '../src/core/types';

test('weekly continuity: empty history is a no-op', () => {
  const w = weeklyContinuityScore([], '2026-09-10');
  expect(w.score).toBe(0);
  expect(w.sufficient).toBe(false);
  expect(w.eligibleDays).toBe(0);
});

test('weekly continuity: seven consecutive days scores 1', () => {
  const days = ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'];
  const w = weeklyContinuityScore(days, '2026-09-10');
  expect(w.score).toBe(1);
  expect(w.completedDays).toBe(7);
  expect(w.gapCount).toBe(0);
  expect(w.sufficient).toBe(true);
});

test('weekly continuity: new user is not punished for days before first play', () => {
  const w = weeklyContinuityScore(['2026-09-09', '2026-09-10'], '2026-09-10');
  expect(w.eligibleDays).toBe(2);
  expect(w.score).toBe(1);
  expect(w.sufficient).toBe(false);
});

test('weekly continuity: today unplayed is pending, not a gap', () => {
  const days = ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'];
  const w = weeklyContinuityScore(days, '2026-09-10');
  expect(w.eligibleDays).toBe(6);
  expect(w.score).toBe(1);
  expect(w.gapCount).toBe(0);
});

test('weekly continuity: one isolated miss applies the 1-day penalty', () => {
  const days = ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-10'];
  const w = weeklyContinuityScore(days, '2026-09-10');
  // 6/7 − 0.06 = 0.80
  expect(w.completedDays).toBe(6);
  expect(w.gapCount).toBe(1);
  expect(w.longestGap).toBe(1);
  expect(w.score).toBe(0.8);
});

test('weekly continuity: a 2-day gap costs more than two isolated misses would look like a freeze', () => {
  const days = ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-10'];
  const w = weeklyContinuityScore(days, '2026-09-10');
  // 5/7 − 0.14 ≈ 0.57
  expect(w.longestGap).toBe(2);
  expect(w.score).toBe(0.57);
});

test('gentle return: inactive on empty and on an open (not-yet-today) streak', () => {
  const empty = gentleReturnRitual({ streak: computeDayStreak([], '2026-09-10') });
  expect(empty.active).toBe(false);

  const open = gentleReturnRitual({
    streak: computeDayStreak(['2026-09-09'], '2026-09-10')
  });
  expect(open.active).toBe(false);
});

test('gentle return: 1–2 day gap prefers familiar domains from recent sessions', () => {
  const sessions: Session[] = [
    {
      id: '1',
      startedAt: '2026-09-08T10:00:00+03:00',
      finishedAt: '2026-09-08T10:06:00+03:00',
      durationSec: 300,
      items: [
        { exerciseId: 'grid-memory', level: 2, accuracy: 0.9, avgRtMs: 400, score: 80 },
        { exerciseId: 'stroop', level: 2, accuracy: 0.8, avgRtMs: 500, score: 70 }
      ]
    }
  ];
  const ritual = gentleReturnRitual({
    streak: computeDayStreak(['2026-09-08'], '2026-09-10'),
    sessions,
    daySummaries: [{ date: '2026-09-08', totalScore: 150, domainDeltas: { memory: 4, attention: 2 }, streak: 3, skipped: false }]
  });
  expect(ritual.active).toBe(true);
  expect(ritual.openMisses).toBe(1);
  expect(ritual.durationCapSec).toBe(SOFT_RETURN_DURATION_SEC);
  expect(ritual.familiarExerciseIds[0]).toBe('stroop');
  expect(ritual.familiarDomains).toContain('memory');
});

test('applyGentleReturnBias is a no-op when inactive or when nothing familiar is known', () => {
  const plan = {
    focusDomains: ['logic'],
    items: [
      { exerciseId: 'odd-one', reason: 'Зона роста' },
      { exerciseId: 'grid-memory', reason: 'Память' }
    ]
  };
  const inactive = applyGentleReturnBias(plan, {
    active: false,
    openMisses: 0,
    durationCapSec: 300,
    preferFamiliar: false,
    familiarDomains: [],
    familiarExerciseIds: []
  }, [{ id: 'grid-memory', domain: 'memory' }, { id: 'odd-one', domain: 'attention' }]);
  expect(inactive.applied).toBe(false);
  expect(inactive.items[0].exerciseId).toBe('odd-one');

  const emptyFam = applyGentleReturnBias(plan, {
    active: true,
    openMisses: 1,
    durationCapSec: 300,
    preferFamiliar: false,
    familiarDomains: [],
    familiarExerciseIds: []
  });
  expect(emptyFam.applied).toBe(false);
});

test('applyGentleReturnBias reorders toward familiar exercises without touching the catalog', () => {
  const plan = {
    focusDomains: ['logic'],
    items: [
      { exerciseId: 'odd-one', reason: 'Зона роста' },
      { exerciseId: 'grid-memory', reason: 'Память' }
    ]
  };
  const out = applyGentleReturnBias(plan, {
    active: true,
    openMisses: 1,
    durationCapSec: 300,
    preferFamiliar: true,
    familiarDomains: ['memory'],
    familiarExerciseIds: ['grid-memory']
  }, [{ id: 'grid-memory', domain: 'memory' }, { id: 'odd-one', domain: 'attention' }]);
  expect(out.applied).toBe(true);
  expect(out.items[0].exerciseId).toBe('grid-memory');
  expect(out.items[0].reason).toMatch(/мягкого возврата/);
  expect(out.focusDomains[0]).toBe('memory');
});

test('ritualDurationSec caps only while the gentle return is active', () => {
  const active = { active: true, openMisses: 1, durationCapSec: 300, preferFamiliar: true, familiarDomains: [], familiarExerciseIds: [] };
  const idle = { ...active, active: false };
  expect(ritualDurationSec(720, active)).toBe(300);
  expect(ritualDurationSec(720, idle)).toBe(720);
  expect(ritualDurationSec(300, active)).toBe(300);
});

test('snapshot: empty store is safe and does not claim a score', () => {
  const snap = buildContinuitySnapshot({ now: '2026-09-10T12:00:00+03:00', timeZone: 'Europe/Moscow' });
  expect(snap.streak.status).toBe('empty');
  expect(snap.weekly.sufficient).toBe(false);
  expect(snap.ritual.active).toBe(false);
  expect(snap.today).toBe('2026-09-10');
});

test('copy-facing snapshot never invents IQ / freeze / brain-age fields', () => {
  const snap = buildContinuitySnapshot({
    now: '2026-09-10T12:00:00+03:00',
    timeZone: 'Europe/Moscow',
    daySummaries: [{ date: '2026-09-08', totalScore: 40, domainDeltas: { memory: 1 }, streak: 9, skipped: true }]
  });
  expect(snap.streak.current).toBe(0);
  expect(snap.ritual.active).toBe(true);
  expect(JSON.stringify(snap)).not.toMatch(/brain-?age|iq\b|freeze|paywall/i);
});
