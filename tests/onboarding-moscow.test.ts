import { expect, test } from 'vitest';
import { addCalendarDays, calendarDayKey, timeZoneSupported } from '../src/core/streak';
import { buildFirstWeekPlan, countMissedDays, getTodayRitual } from '../src/core/onboarding';

const TZ = 'Europe/Moscow';

test('countMissedDays: session just after Moscow midnight counts as that civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-01 21:30 UTC = 2026-10-02 00:30 Europe/Moscow
  const playedAt = '2026-10-01T21:30:00.000Z';
  expect(playedAt.slice(0, 10)).toBe('2026-10-01');
  expect(calendarDayKey(playedAt, TZ)).toBe('2026-10-02');

  // Span 2026-10-01 .. 2026-10-04 checks civil keys 01, 02, 03 via addCalendarDays
  expect(addCalendarDays('2026-10-01', 0)).toBe('2026-10-01');
  expect(addCalendarDays('2026-10-01', 1)).toBe('2026-10-02');
  expect(addCalendarDays('2026-10-01', 2)).toBe('2026-10-03');

  const missed = countMissedDays('2026-10-01', '2026-10-04', [{ date: playedAt }]);
  // Played Moscow 10-02; missed 10-01 and 10-03 → 2 (not 3 from UTC date slice)
  expect(missed).toBe(2);
});

test('countMissedDays: UTC evening play is not missed for next Moscow day', () => {
  if (!timeZoneSupported(TZ)) return;
  // Played at Moscow midnight boundary; UTC slice still previous day
  const playedAt = '2026-10-03T21:30:00.000Z'; // Moscow 2026-10-04 00:30
  expect(calendarDayKey(playedAt, TZ)).toBe('2026-10-04');
  expect(playedAt.slice(0, 10)).toBe('2026-10-03');

  // From 10-01 to 10-05: keys 01..04; only 04 played → missed 3
  const missed = countMissedDays('2026-10-01', '2026-10-05', [{ date: playedAt }]);
  expect(missed).toBe(3);
});

test('countMissedDays: civil date-only summaries stay civil (no UTC loop shift)', () => {
  const missed = countMissedDays('2026-09-11', '2026-09-14', [{ date: '2026-09-11' }]);
  expect(missed).toBe(2);
});

test('getTodayRitual: Moscow midnight play forgives prior skip on civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  const plan = buildFirstWeekPlan({
    primaryGoal: 'attention',
    sessionLengthSec: 480,
    startDate: '2026-10-01'
  });
  // Day 3 (2026-10-03) with play on Moscow day 2026-10-01 and 2026-10-03 (UTC evening → Moscow next day for second)
  // Play day1 civil + day2 via Moscow midnight session (2026-10-01T21:30Z = MSK 10-02)
  const ritual = getTodayRitual(plan, '2026-10-03', [
    { date: '2026-10-01' },
    { date: '2026-10-01T21:30:00.000Z' }
  ]);
  expect(ritual.inFirstWeek).toBe(true);
  expect(ritual.day).toBe(3);
  // Missed only nothing before today → on-track (played 01 and 02)
  expect(ritual.missedDays).toBe(0);
  expect(ritual.skipState).toBe('on-track');
});
