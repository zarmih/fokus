import { expect, test } from 'vitest';
import {
  addDays,
  buildCoachIntel,
  buildSparkline,
  collapseSummaries,
  computeAdherence,
  computeMilestones,
  detectComeback,
  enumerateDays,
  findPersonalBest,
  getWeeklyDomainTips,
  reconstructDomainSnapshots,
  toDateKey,
  type IndexDay
} from '../src/core/coach-intel';
import type { DaySummary, DomainIndex } from '../src/core/types';

function summary(date: string, extra: Partial<DaySummary> = {}): DaySummary {
  return {
    date,
    totalScore: 80,
    domainDeltas: {},
    streak: extra.streak ?? 1,
    skipped: extra.skipped ?? false,
    fokusIndex: extra.fokusIndex ?? 400,
    ...extra
  };
}

function indexDay(date: string, extra: Partial<IndexDay> = {}): IndexDay {
  return {
    date,
    played: extra.played ?? true,
    skipped: extra.skipped ?? false,
    streak: extra.streak ?? 1,
    fokusIndex: extra.fokusIndex === undefined ? 400 : extra.fokusIndex,
    byDomain: extra.byDomain ?? {},
    personalBest: extra.personalBest ?? false
  };
}

test('enumerateDays is UTC-stable and inclusive of asOf', () => {
  const days = enumerateDays('2026-09-11', 14);
  expect(days).toHaveLength(14);
  expect(days[0]).toBe('2026-08-29');
  expect(days[13]).toBe('2026-09-11');
  expect(enumerateDays('2026-09-11', 30)).toHaveLength(30);
  expect(enumerateDays('2026-09-11', 30)[0]).toBe(addDays('2026-09-11', -29));
});

test('addDays does not slip on month boundaries', () => {
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  expect(toDateKey('2026-09-11T23:40:00.000Z')).toBe('2026-09-11');
});

test('empty history is honest: no fake index, no tips', () => {
  const intel = buildCoachIntel({
    summaries: [],
    domains: [],
    window: 14,
    asOf: '2026-09-11T12:00:00Z'
  });
  expect(intel.ready).toBe(false);
  expect(intel.days).toHaveLength(14);
  expect(intel.days.every((d) => d.fokusIndex === null && !d.played)).toBe(true);
  expect(intel.sparkline.points.every((p) => p.value === null)).toBe(true);
  expect(intel.sparkline.delta).toBe(null);
  expect(intel.sparkline.deltaLabel).toBe('мало данных');
  expect(intel.personalBest).toBe(null);
  expect(intel.tips).toEqual([]);
  expect(intel.milestones.every((m) => !m.reached)).toBe(true);
  expect(intel.adherence.playedDays).toBe(0);
});

test('30-day window keeps calendar length and domain columns', () => {
  const intel = buildCoachIntel({
    summaries: [summary('2026-09-01', { fokusIndex: 410, streak: 1 })],
    domains: [{ domain: 'attention', value: 600, updatedAt: 'x' }],
    window: 30,
    asOf: '2026-09-11T12:00:00Z'
  });
  expect(intel.window).toBe(30);
  expect(intel.days).toHaveLength(30);
  expect(intel.sparkline.points).toHaveLength(30);
  expect(intel.domains).toHaveLength(5);
  expect(intel.domains.map((d) => d.id)).toEqual(['attention', 'memory', 'speed', 'flexibility', 'logic']);
});

test('sparkline maps min/max, gaps stay null, personal best flagged', () => {
  const days: IndexDay[] = [
    indexDay('2026-09-09', { fokusIndex: 400 }),
    indexDay('2026-09-10', { played: false, fokusIndex: null, streak: 0 }),
    indexDay('2026-09-11', { fokusIndex: 430, personalBest: true, streak: 2 })
  ];
  const spark = buildSparkline(days, 14);
  expect(spark.min).toBe(400);
  expect(spark.max).toBe(430);
  expect(spark.delta).toBe(30);
  expect(spark.deltaLabel).toContain('+30');
  expect(spark.points[0].t).toBe(0);
  expect(spark.points[2].t).toBe(1);
  expect(spark.points[0].y).toBe(1);
  expect(spark.points[2].y).toBe(0);
  expect(spark.points[1].value).toBe(null);
  expect(spark.points[1].y).toBe(null);
  expect(spark.personalBestIndex).toBe(2);
});

test('reconstructs domain snapshots from current values minus deltas', () => {
  const buckets = collapseSummaries([
    summary('2026-09-08', { domainDeltas: { attention: 50, memory: 10 }, fokusIndex: 400 }),
    summary('2026-09-10', { domainDeltas: { attention: 20 }, fokusIndex: 450, streak: 2 })
  ]);
  const current: DomainIndex[] = [
    { domain: 'attention', value: 520, updatedAt: 'x' },
    { domain: 'memory', value: 400, updatedAt: 'x' }
  ];
  reconstructDomainSnapshots(buckets, current);
  const d8 = buckets.find((b) => b.date === '2026-09-08')!;
  const d10 = buckets.find((b) => b.date === '2026-09-10')!;
  expect(d10.domainValues?.attention).toBe(520);
  expect(d10.domainValues?.memory).toBe(400);
  expect(d8.domainValues?.attention).toBe(500);
  expect(d8.domainValues?.memory).toBe(400);
});

test('legacy snapshots win over reconstruction', () => {
  const buckets = collapseSummaries([
    summary('2026-09-10', {
      domainDeltas: { attention: 99 },
      domainValues: { attention: 777, memory: 321 },
      fokusIndex: 500
    })
  ]);
  reconstructDomainSnapshots(buckets, [
    { domain: 'attention', value: 520, updatedAt: 'x' }
  ]);
  expect(buckets[0].domainValues?.attention).toBe(777);
  expect(buckets[0].domainValues?.memory).toBe(321);
});

test('adherence counts missed calendar days, not forgiven skips as absences', () => {
  const days = enumerateDays('2026-09-11', 7).map((date, i) =>
    indexDay(date, {
      played: i >= 5,
      skipped: i === 5,
      streak: i >= 5 ? i - 4 : 0,
      fokusIndex: i >= 5 ? 400 : null
    })
  );
  // last two days played; day -2 is skipped=true (return day), 5 missed
  const ad = computeAdherence(days, 14, '2026-09-11T12:00:00Z');
  expect(ad.playedDays).toBe(2);
  expect(ad.missedDays).toBe(5);
  expect(ad.forgivenSkips).toBe(1);
  expect(ad.currentStreak).toBe(2);
});

test('comeback after a gap of 3+ days with prior history', () => {
  const calendar = enumerateDays('2026-09-11', 14);
  const days = calendar.map((date) => {
    const played = date === '2026-08-29' || date === '2026-09-10' || date === '2026-09-11';
    return indexDay(date, {
      played,
      fokusIndex: played ? 410 : null,
      streak: date === '2026-08-29' ? 4 : date === '2026-09-10' ? 1 : date === '2026-09-11' ? 2 : 0
    });
  });
  const c = detectComeback(days, '2026-09-11T12:00:00Z');
  expect(c.comeback).toBe(true);
  expect(c.gapDays).toBeGreaterThanOrEqual(3);
});

test('still-away user is not a comeback', () => {
  const calendar = enumerateDays('2026-09-11', 14);
  const days = calendar.map((date) =>
    indexDay(date, {
      played: date <= '2026-09-03',
      fokusIndex: date <= '2026-09-03' ? 400 : null
    })
  );
  const c = detectComeback(days, '2026-09-11T12:00:00Z');
  expect(c.comeback).toBe(false);
  expect(c.gapDays).toBeGreaterThanOrEqual(3);
});

test('milestones 7/14/30 track current and historical streaks', () => {
  const calendar = enumerateDays('2026-09-11', 14);
  const days = calendar.map((date, i) =>
    indexDay(date, {
      played: true,
      streak: i + 1,
      fokusIndex: 400 + i
    })
  );
  const miles = computeMilestones(days, 14);
  expect(miles.map((m) => m.days)).toEqual([7, 14, 30]);
  expect(miles.find((m) => m.days === 7)?.reached).toBe(true);
  expect(miles.find((m) => m.days === 14)?.reached).toBe(true);
  expect(miles.find((m) => m.days === 30)?.reached).toBe(false);
  expect(miles.find((m) => m.days === 7)?.reachedAt).toBe('2026-09-04');
});

test('personal best picks the most recent max and latest flag', () => {
  const days = [
    indexDay('2026-09-09', { fokusIndex: 430 }),
    indexDay('2026-09-10', { fokusIndex: 410 }),
    indexDay('2026-09-11', { fokusIndex: 430, streak: 3 })
  ];
  const pb = findPersonalBest(days)!;
  expect(pb.value).toBe(430);
  expect(pb.date).toBe('2026-09-11');
  expect(pb.isLatest).toBe(true);
});

test('weekly coach tips mix weak domain and adherence', () => {
  const summaries: DaySummary[] = [];
  for (let i = 0; i < 6; i++) {
    const date = addDays('2026-09-11', -(5 - i));
    summaries.push(
      summary(date, {
        streak: i + 1,
        fokusIndex: 420 + i,
        domainDeltas: { memory: 4 },
        domainValues: { attention: 800, memory: 300 + i * 4, speed: 500 }
      })
    );
  }
  const intel = buildCoachIntel({
    summaries,
    domains: [
      { domain: 'attention', value: 800, updatedAt: 'x' },
      { domain: 'memory', value: 320, updatedAt: 'x' },
      { domain: 'speed', value: 500, updatedAt: 'x' }
    ],
    window: 14,
    asOf: '2026-09-11T12:00:00Z'
  });
  expect(intel.ready).toBe(true);
  expect(intel.weakDomainId).toBe('memory');
  expect(intel.tips.some((t) => t.kind === 'domain' && t.domainId === 'memory')).toBe(true);
  expect(intel.tips.find((t) => t.kind === 'domain')?.body).toMatch(/Память/);
  expect(intel.tips.length).toBeGreaterThan(0);
  expect(intel.tips.length).toBeLessThanOrEqual(3);
  expect(intel.personalBest?.value).toBe(425);
});

test('comeback tip is concrete and does not ask to make up days', () => {
  const summaries = [
    summary('2026-08-29', { streak: 5, fokusIndex: 400, domainValues: { attention: 600 } }),
    summary('2026-09-11', { streak: 1, fokusIndex: 405, domainValues: { attention: 610 } })
  ];
  const intel = buildCoachIntel({
    summaries,
    domains: [{ domain: 'attention', value: 610, updatedAt: 'x' }],
    window: 14,
    asOf: '2026-09-11T12:00:00Z'
  });
  expect(intel.adherence.comeback).toBe(true);
  const tip = intel.tips.find((t) => t.kind === 'comeback');
  expect(tip).toBeTruthy();
  expect(tip!.body).toMatch(/не обнуляет|навёрстывать/i);
  expect(tip!.tone).toBe('recovery');
});

test('milestone 7 surfaces a habit tip', () => {
  const summaries: DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    summaries.push(
      summary(addDays('2026-09-11', -(6 - i)), {
        streak: i + 1,
        fokusIndex: 400,
        domainValues: { attention: 500, logic: 480 }
      })
    );
  }
  const intel = buildCoachIntel({
    summaries,
    domains: [
      { domain: 'attention', value: 500, updatedAt: 'x' },
      { domain: 'logic', value: 480, updatedAt: 'x' }
    ],
    window: 14,
    asOf: '2026-09-11T12:00:00Z'
  });
  expect(intel.milestones.find((m) => m.days === 7)?.reached).toBe(true);
  expect(intel.adherence.currentStreak).toBe(7);
  expect(intel.tips.some((t) => t.kind === 'milestone' || t.kind === 'streak')).toBe(true);
});

test('domain tip copy is practical, not IQ-claiming', () => {
  for (const id of ['attention', 'memory', 'speed', 'flexibility', 'logic']) {
    const tips = getWeeklyDomainTips(id);
    expect(tips.length).toBeGreaterThanOrEqual(2);
    expect(tips.join(' ')).not.toMatch(/IQ|айкью|прокачать мозг/i);
  }
});

test('multiple sessions on one day collapse to a single calendar point', () => {
  const buckets = collapseSummaries([
    summary('2026-09-11T08:00:00Z', { fokusIndex: 400, domainDeltas: { attention: 10 }, streak: 3 }),
    summary('2026-09-11T18:00:00Z', { fokusIndex: 418, domainDeltas: { attention: 6 }, streak: 3 })
  ]);
  expect(buckets).toHaveLength(1);
  expect(buckets[0].fokusIndex).toBe(418);
  expect(buckets[0].domainDeltas.attention).toBe(16);
});
