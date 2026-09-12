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

test('completed day with dense history coaches tomorrow load, not another grind', () => {
  const now = new Date('2026-09-11T10:00:00.000Z');
  const sessions: Session[] = [0, 1, 2, 3].map((i) => ({
    id: `h${i}`,
    startedAt: `2026-09-${String(7 + i).padStart(2, '0')}T18:00:00.000Z`,
    finishedAt: `2026-09-${String(7 + i).padStart(2, '0')}T18:12:00.000Z`,
    durationSec: 700,
    plannedDurationSec: 720,
    items: [
      { exerciseId: 'grid-memory', level: 14, accuracy: 0.44, avgRtMs: 1100, score: 20 },
      { exerciseId: 'stroop', level: 13, accuracy: 0.4, avgRtMs: 1500, score: 18 },
      { exerciseId: 'odd-one', level: 12, accuracy: 0.42, avgRtMs: 1700, score: 16 }
    ]
  }));
  sessions.push({
    id: 'today',
    startedAt: '2026-09-11T09:00:00.000Z',
    finishedAt: '2026-09-11T09:05:00.000Z',
    durationSec: 300,
    items: [
      { exerciseId: 'odd-one', level: 4, accuracy: 0.5, avgRtMs: 900, score: 30 },
      { exerciseId: 'stroop', level: 4, accuracy: 0.48, avgRtMs: 1100, score: 28 }
    ]
  });
  const spark = getDailySpark({
    domains: [
      { domain: 'memory', value: 500, trend: 0, updatedAt: '2026-09-11T09:00:00Z' },
      { domain: 'attention', value: 720, trend: 0, updatedAt: '2026-09-11T09:00:00Z' }
    ],
    skills: [],
    states: [],
    daySummaries: sessions.map((s, i) => ({
      date: s.startedAt,
      totalScore: 40,
      domainDeltas: { memory: 1 },
      streak: i + 1,
      skipped: false
    })),
    sessions,
    calibrated: true,
    playedToday: true,
    streak: 5,
    now
  });
  expect(spark.title).toMatch(/завтра/i);
  expect(spark.body).toMatch(/завтра/i);
  expect(spark.body).not.toMatch(/IQ|прокачай мозг|нейрофитнес|не пропусти/i);
});
