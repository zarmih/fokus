import { afterEach, describe, expect, test } from 'vitest';
import { configureFokusTimeZones, timeZoneSupported } from '../src/core/streak';
import { buildContinuitySnapshot, evaluateDomainWorkload } from '../src/core/continuity';
import { previousFokusIndex } from '../src/core/fokus-index';
import { assessDataSufficiency } from '../src/core/analytics/methodology';
import type { DaySummary, Session, SessionItem } from '../src/core/types';

/**
 * Remaining UTC-day leaks after PRs #370/#377: places that compared a raw stored
 * `DaySummary.date` (often a full ISO instant) against a Moscow civil day key, or
 * counted "days since" as elapsed 24h blocks. Every case below sits in the
 * 21:00–23:59Z window where Moscow is already the next calendar day.
 */

const TZ = 'Europe/Moscow';
/** 2026-10-03 21:30Z = 2026-10-04 00:30 MSK (Moscow is already the next day). */
const AFTER_MOSCOW_MIDNIGHT = '2026-10-03T21:30:00.000Z';
/** 2026-10-03 20:59:59Z = 2026-10-03 23:59:59 MSK (still the same Moscow day). */
const BEFORE_MOSCOW_MIDNIGHT = '2026-10-03T20:59:59.000Z';

afterEach(() => {
  configureFokusTimeZones(null);
});

function item(exerciseId: string, accuracy = 0.8): SessionItem {
  return { exerciseId, level: 3, difficultyBefore: 3, accuracy, avgRtMs: 800, score: 10, rounds: 8, mode: 'standard' };
}
function session(startedAt: string, ids: string[]): Session {
  return { id: startedAt, startedAt, finishedAt: startedAt, durationSec: 300, items: ids.map((i) => item(i)), mode: 'normal' };
}
function summary(date: string, deltas: Record<string, number>, extra: Partial<DaySummary> = {}): DaySummary {
  return { date, totalScore: 100, domainDeltas: deltas, streak: 1, skipped: false, ...extra };
}

describe('civil-day bucketing in the 21:00–23:59Z window', () => {
  test('context: the two instants straddle Moscow midnight', () => {
    if (!timeZoneSupported(TZ)) return;
    // Guards the fixtures themselves: if this ever fails the whole file is moot.
    expect(new Date(AFTER_MOSCOW_MIDNIGHT).toISOString().slice(0, 10)).toBe('2026-10-03');
    expect(new Date(BEFORE_MOSCOW_MIDNIGHT).toISOString().slice(0, 10)).toBe('2026-10-03');
  });

  test('incomplete stored summaries do not hide valid history', () => {
    const valid = summary('2026-10-02', { memory: 5 }, { fokusIndex: 200 });
    const incomplete = { ...valid, date: undefined } as unknown as DaySummary;
    expect(previousFokusIndex([valid, incomplete], '2026-10-04')).toBe(200);
    expect(evaluateDomainWorkload(['2026-10-02'], '2026-10-04', [incomplete, valid], TZ).recentDomains).toEqual(['memory']);
  });

  test('previousFokusIndex ignores a row written after Moscow midnight (it is today)', () => {
    if (!timeZoneSupported(TZ)) return;
    const summaries = [
      summary('2026-10-03', {}, { fokusIndex: 200 }),
      // Same UTC date as the row above, but 00:30 MSK on 10-04 → today, must be skipped.
      summary(AFTER_MOSCOW_MIDNIGHT, {}, { fokusIndex: 999 })
    ] as unknown as DaySummary[];

    expect(previousFokusIndex(summaries, '2026-10-04T12:00:00Z')).toBe(200);
  });

  test('previousFokusIndex still accepts a row from just before Moscow midnight', () => {
    if (!timeZoneSupported(TZ)) return;
    const summaries = [
      summary(BEFORE_MOSCOW_MIDNIGHT, {}, { fokusIndex: 200 }), // 10-03 23:59 MSK → yesterday
      summary(AFTER_MOSCOW_MIDNIGHT, {}, { fokusIndex: 999 })    // 10-04 00:30 MSK → today
    ] as unknown as DaySummary[];

    expect(previousFokusIndex(summaries, '2026-10-04T12:00:00Z')).toBe(200);
  });

  test('previousFokusIndex does not depend on array order', () => {
    if (!timeZoneSupported(TZ)) return;
    const yesterday = summary('2026-10-02T12:00:00.000Z', {}, { fokusIndex: 200 });
    const today = summary(AFTER_MOSCOW_MIDNIGHT, {}, { fokusIndex: 999 });
    // Newest-first input: the old code returned whichever row happened to be last.
    const older = summary('2026-10-01', {}, { fokusIndex: 100 });
    const newestFirst = [today, yesterday, older] as unknown as DaySummary[];
    expect(previousFokusIndex(newestFirst, '2026-10-04T12:00:00Z')).toBe(200);
  });
});

describe('assessDataSufficiency daysSinceLast on the Moscow civil day', () => {
  test('a block at 23:00 MSK and now at 00:30 MSK is 1 day apart, not 0', () => {
    if (!timeZoneSupported(TZ)) return;
    const nowMs = Date.parse('2026-10-03T21:30:00Z'); // 10-04 00:30 MSK
    const s = [session('2026-10-03T20:00:00.000Z', ['a1'])]; // 10-03 23:00 MSK

    const res = assessDataSufficiency({ sessions: s, domainOf: () => 'attention', nowMs });
    expect(res.daysSinceLast).toBe(1);
    expect(res.facts).toContain('1 дн. назад');
  });

  test('a block earlier on the same Moscow day is 0 days ago', () => {
    if (!timeZoneSupported(TZ)) return;
    const nowMs = Date.parse('2026-10-04T12:00:00Z'); // 10-04 15:00 MSK
    const s = [session('2026-10-04T06:00:00.000Z', ['a1'])]; // 10-04 09:00 MSK

    const res = assessDataSufficiency({ sessions: s, domainOf: () => 'attention', nowMs });
    expect(res.daysSinceLast).toBe(0);
  });

  test('an all-UTC-day fixture keeps the historical answer', () => {
    if (!timeZoneSupported(TZ)) return;
    // 2026-11-12T12:00Z is 15:00 MSK; 6×24h earlier is still 6 civil days.
    const nowMs = Date.parse('2026-11-12T12:00:00Z');
    const s = [session(new Date(nowMs - 6 * 86_400_000).toISOString(), ['a1'])];
    const res = assessDataSufficiency({ sessions: s, domainOf: () => 'attention', nowMs });
    expect(res.daysSinceLast).toBe(6);
  });
});

describe('evaluateDomainWorkload matches ISO-dated summaries on the civil day', () => {
  const isoDays = [
    summary('2026-10-01T21:30:00.000Z', { memory: 5, attention: 5 }, { streak: 1 }),
    summary('2026-10-02T21:30:00.000Z', { memory: 5, attention: 5 }, { streak: 2 }),
    summary('2026-10-03T21:30:00.000Z', { memory: 5, attention: 5 }, { streak: 3 })
  ];

  test('buildContinuitySnapshot sees the workload behind ISO timestamps', () => {
    if (!timeZoneSupported(TZ)) return;
    const snap = buildContinuitySnapshot({
      now: '2026-10-04T12:00:00Z',
      timeZone: TZ,
      daySummaries: isoDays
    });

    expect(snap.today).toBe('2026-10-04');
    expect(snap.playedDays).toEqual(['2026-10-02', '2026-10-03', '2026-10-04']);
    // Before the fix every domain looked "neglected" because nothing matched.
    expect(snap.workload.recentDomains.sort()).toEqual(['attention', 'memory']);
    expect(snap.workload.fatigued.sort()).toEqual(['attention', 'memory']);
    expect(snap.workload.neglected).not.toContain('attention');
  });

  test('evaluateDomainWorkload is explicit about the zone it was given', () => {
    if (!timeZoneSupported(TZ)) return;
    const played = ['2026-10-02', '2026-10-03'];
    const rows = isoDays.slice(0, 2);
    const utc = evaluateDomainWorkload(played, '2026-10-04', rows, 'UTC');
    // In UTC those ISO rows land on 10-01/02/03, so only one of them is "recent".
    expect(utc.fatigued).toEqual([]);

    const msk = evaluateDomainWorkload(played, '2026-10-04', rows, TZ);
    expect(msk.fatigued.sort()).toEqual(['attention', 'memory']);
  });
});
