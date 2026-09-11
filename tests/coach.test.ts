import { expect, test } from 'vitest';
import { getDailySpark, analyzeChronotype, getWeeklyDomainTips } from '../src/core/coach';
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
  expect(tips.length).toBe(2);
  expect(tips[0]).toMatch(/телефон|вниман/i);
  expect(getWeeklyDomainTips('unknown-domain')[0]).toMatch(/Регулярность/);
});
