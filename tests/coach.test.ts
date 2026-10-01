import { expect, test } from 'vitest';
import { getDailySpark, analyzeChronotype, getWeeklyDomainTips } from '../src/core/coach';
import { buildContinuitySnapshot } from '../src/core/continuity';
import type { Session } from '../src/core/types';

test('uncalibrated users get a calibration spark', () => {
  const spark = getDailySpark({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [],
    sessions: [],
    calibrated: false,
    playedToday: false,
    streak: 0
  });
  expect(spark.tone).toBe('start');
  expect(spark.body).toMatch(/калибр/i);
});

test('completed day prefers rest over more grinding', () => {
  const spark = getDailySpark({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [],
    sessions: [],
    calibrated: true,
    playedToday: true,
    streak: 3
  });
  expect(spark.tone).toBe('habit');
  expect(spark.body).toMatch(/завтра/i);
});

test('missed day with remaining streak is recovery, not reset panic', () => {
  const spark = getDailySpark({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [{ date: '2026-09-07', totalScore: 80, domainDeltas: {}, streak: 4, skipped: true }],
    sessions: [],
    calibrated: true,
    playedToday: false,
    streak: 4,
    skippedYesterday: true
  });
  expect(spark.tone).toBe('recovery');
});

test('evening fragility surfaces a soft streak nudge, not FOMO copy', () => {
  const evening = new Date(2026, 8, 11, 21, 0, 0);
  const spark = getDailySpark({
    domains: [
      { domain: 'attention', value: 700, trend: 0, updatedAt: '2026-09-10T10:00:00Z' },
      { domain: 'memory', value: 680, trend: 0, updatedAt: '2026-09-10T10:00:00Z' }
    ],
    skills: [],
    states: [],
    daySummaries: [{ date: '2026-09-10T10:00:00Z', totalScore: 110, domainDeltas: { attention: 4 }, streak: 12, skipped: false }],
    sessions: [{
      id: 's1',
      startedAt: '2026-09-10T10:00:00Z',
      finishedAt: '2026-09-10T10:05:00Z',
      durationSec: 300,
      items: [{ exerciseId: 'a', level: 1, accuracy: 0.9, avgRtMs: 400, score: 90 }]
    }],
    calibrated: true,
    playedToday: false,
    streak: 12,
    now: evening
  });
  expect(spark.title).toMatch(/ритм|серия|возврат|короче/i);
  expect(spark.body).not.toMatch(/не пропусти|прокачай|нейрофитнес|last chance/i);
});

test('chronotype needs at least two buckets with samples', () => {
  const sessions: Session[] = [
    { id: '1', startedAt: '2026-09-01T08:00:00', finishedAt: null, durationSec: 300, items: [{ exerciseId: 'a', level: 1, accuracy: 1, avgRtMs: 400, score: 80 }] },
    { id: '2', startedAt: '2026-09-02T08:10:00', finishedAt: null, durationSec: 300, items: [{ exerciseId: 'a', level: 1, accuracy: 1, avgRtMs: 400, score: 90 }] },
    { id: '3', startedAt: '2026-09-03T19:00:00', finishedAt: null, durationSec: 300, items: [{ exerciseId: 'a', level: 1, accuracy: 1, avgRtMs: 400, score: 40 }] },
    { id: '4', startedAt: '2026-09-04T19:10:00', finishedAt: null, durationSec: 300, items: [{ exerciseId: 'a', level: 1, accuracy: 1, avgRtMs: 400, score: 30 }] }
  ];
  const c = analyzeChronotype(sessions);
  expect(c.bucket).toBe('morning');
  expect(c.label).toBe('утром');
});

test('weekly domain tips stay concrete and in product voice', () => {
  const tips = getWeeklyDomainTips('attention');
  expect(tips.length).toBeGreaterThanOrEqual(6);
  expect(tips[0]).toMatch(/телефон|вниман/i);
  expect(getWeeklyDomainTips('unknown-domain')[0]).toMatch(/Регулярность/);
});

test('getDailySpark with continuity matches shared today-plan story', () => {
  const day = (d: string) => ({
    date: d,
    totalScore: 100,
    domainDeltas: { attention: 4 },
    streak: 1,
    skipped: false
  });
  const session = (startedAt: string) => ({
    id: startedAt,
    startedAt,
    finishedAt: startedAt,
    durationSec: 300,
    items: [{ exerciseId: 'stroop', level: 2, accuracy: 0.9, avgRtMs: 500, score: 80 }]
  });
  const now = new Date(2026, 8, 11, 12, 0, 0);
  const daySummaries = [day('2026-09-01'), day('2026-09-02'), day('2026-09-03')];
  const sessions = [session('2026-09-01T10:00:00'), session('2026-09-02T10:00:00'), session('2026-09-03T10:00:00')];
  const domains = [
    { domain: 'attention', value: 700, trend: 0, updatedAt: '2026-09-03T10:00:00' },
    { domain: 'memory', value: 640, trend: 0, updatedAt: '2026-09-03T10:00:00' },
    { domain: 'speed', value: 610, trend: 0, updatedAt: '2026-09-03T10:00:00' },
    { domain: 'flexibility', value: 580, trend: 0, updatedAt: '2026-09-03T10:00:00' },
    { domain: 'logic', value: 560, trend: 0, updatedAt: '2026-09-03T10:00:00' }
  ];
  const continuity = buildContinuitySnapshot({ now, daySummaries, sessions });
  const spark = getDailySpark({
    domains,
    skills: [],
    states: [],
    daySummaries,
    sessions,
    calibrated: true,
    playedToday: false,
    streak: 0,
    now,
    continuity,
    focusDomains: ['attention']
  });
  expect(spark.body).not.toMatch(/прокачай|нейрофитнес|не пропусти|IQ/i);
  expect(spark.title.length).toBeGreaterThan(0);
  expect(spark.body.length).toBeGreaterThan(10);
});
