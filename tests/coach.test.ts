import { expect, test } from 'vitest';
import { getDailySpark, getDailyRitualCopy, analyzeChronotype, getWeeklyDomainTips } from '../src/core/coach';
import { FORBIDDEN_COPY_RE } from '../src/core/ritual-copy';
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
  expect(spark.title).toMatch(/серия|возврат|короче/i);
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
  expect(tips.length).toBe(2);
  expect(tips[0]).toMatch(/телефон|вниман/i);
  expect(getWeeklyDomainTips('unknown-domain')[0]).toMatch(/Регулярность/);
});

test('loud fatigue after playing today prefers rest copy', () => {
  const today = '2026-09-11T10:00:00';
  const copy = getDailyRitualCopy({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [{ date: today, totalScore: 70, domainDeltas: {}, streak: 3, skipped: false }],
    sessions: [
      {
        id: 'a',
        startedAt: today,
        finishedAt: today,
        durationSec: 700,
        items: [
          { exerciseId: 'a', level: 8, accuracy: 0.5, avgRtMs: 900, score: 20 },
          { exerciseId: 'b', level: 8, accuracy: 0.42, avgRtMs: 1400, score: 16 },
          { exerciseId: 'c', level: 8, accuracy: 0.4, avgRtMs: 1800, score: 14 }
        ]
      },
      {
        id: 'b',
        startedAt: '2026-09-11T16:00:00',
        finishedAt: '2026-09-11T16:12:00',
        durationSec: 720,
        items: [
          { exerciseId: 'a', level: 8, accuracy: 0.38, avgRtMs: 1600, score: 12 },
          { exerciseId: 'b', level: 8, accuracy: 0.4, avgRtMs: 1900, score: 10 },
          { exerciseId: 'c', level: 8, accuracy: 0.35, avgRtMs: 2100, score: 8 }
        ]
      }
    ],
    calibrated: true,
    playedToday: true,
    streak: 3,
    now: new Date(2026, 8, 11, 18, 0, 0),
    sessionLengthSec: 300
  });
  expect(copy.situation).toBe('fatigue_rest');
  expect(copy.body).toMatch(/завтра/i);
  expect(copy.body).not.toMatch(FORBIDDEN_COPY_RE);
});

test('rest-light recovery reaches the daily spark', () => {
  const spark = getDailySpark({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [{ date: '2026-09-10', totalScore: 80, domainDeltas: {}, streak: 4, skipped: false }],
    sessions: [],
    calibrated: true,
    playedToday: false,
    streak: 4,
    recovery: 'rest-light',
    loadEwma: 80,
    now: new Date(2026, 8, 11, 11, 0, 0)
  });
  expect(spark.tone).toBe('recovery');
  expect(`${spark.title} ${spark.body}`).toMatch(/короче|лёгк|нагрузк/i);
});
