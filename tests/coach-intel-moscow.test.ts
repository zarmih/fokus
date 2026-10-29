import { expect, test } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import { addDays, buildCoachIntel, toDateKey } from '../src/core/coach-intel';
import type { DaySummary } from '../src/core/types';

const TZ = 'Europe/Moscow';

function summary(date: string, extra: Partial<DaySummary> = {}): DaySummary {
  return {
    date,
    totalScore: 80,
    domainDeltas: { attention: 4 },
    streak: extra.streak ?? 1,
    skipped: extra.skipped ?? false,
    fokusIndex: extra.fokusIndex ?? 400,
    ...extra
  };
}

test('toDateKey: UTC evening maps to next Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 21:30 UTC = 2026-10-29 00:30 Europe/Moscow
  const now = new Date('2026-10-28T21:30:00.000Z');
  expect(now.toISOString().slice(0, 10)).toBe('2026-10-28');
  expect(toDateKey(now)).toBe('2026-10-29');
  expect(toDateKey('2026-10-28T21:30:00.000Z')).toBe('2026-10-29');
});

test('toDateKey: still previous Moscow day before midnight', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 20:30 UTC = 2026-10-28 23:30 Europe/Moscow
  const beforeMidnight = new Date('2026-10-28T20:30:00.000Z');
  expect(toDateKey(beforeMidnight)).toBe('2026-10-28');
  expect(toDateKey('2026-10-28T20:30:00.000Z')).toBe('2026-10-28');
});

test('toDateKey: date-only civil keys stay as stored', () => {
  expect(toDateKey('2026-10-04')).toBe('2026-10-04');
  expect(toDateKey('2026-10-03')).toBe('2026-10-03');
});

test('addDays wraps addCalendarDays on civil keys', () => {
  expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  expect(addDays('2026-10-28T21:30:00.000Z', 0)).toBe('2026-10-29');
});

test('buildCoachIntel: asOf just after Moscow midnight uses Moscow today', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-03 21:30 UTC = 2026-10-04 00:30 MSK
  const asOf = '2026-10-03T21:30:00.000Z';
  expect(asOf.slice(0, 10)).toBe('2026-10-03');
  expect(toDateKey(asOf)).toBe('2026-10-04');

  const intel = buildCoachIntel({
    summaries: [summary('2026-10-04', { fokusIndex: 420, streak: 2 })],
    domains: [{ domain: 'attention', value: 600, updatedAt: asOf }],
    window: 14,
    asOf
  });

  expect(intel.asOf).toBe('2026-10-04');
  expect(intel.days[intel.days.length - 1].date).toBe('2026-10-04');
  expect(intel.days[intel.days.length - 1].played).toBe(true);
  expect(intel.adherence.playedDays).toBe(1);
  expect(intel.adherence.currentStreak).toBe(2);
});

test('buildCoachIntel: UTC same-day asOf does not hide Moscow overnight miss', () => {
  if (!timeZoneSupported(TZ)) return;
  // Moscow morning of Oct 4; last play was civil Oct 3.
  // UTC slice of asOf would still be 2026-10-03 and treat Oct 3 as "today".
  const asOf = '2026-10-03T21:30:00.000Z';
  expect(toDateKey(asOf)).toBe('2026-10-04');

  const intel = buildCoachIntel({
    summaries: [summary('2026-10-03', { fokusIndex: 400, streak: 1 })],
    domains: [{ domain: 'attention', value: 600, updatedAt: '2026-10-03T12:00:00.000Z' }],
    window: 14,
    asOf
  });

  expect(intel.asOf).toBe('2026-10-04');
  expect(intel.days[intel.days.length - 1].date).toBe('2026-10-04');
  expect(intel.days[intel.days.length - 1].played).toBe(false);
  // Last played is yesterday (Moscow) → current streak still counts
  expect(intel.adherence.currentStreak).toBe(1);
});
