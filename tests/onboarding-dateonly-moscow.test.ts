import { expect, test } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import { buildFirstWeekPlan, dateOnly, daysBetween, getTodayRitual } from '../src/core/onboarding';

const TZ = 'Europe/Moscow';

test('dateOnly: instant just after Moscow midnight maps to the Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-01 21:30 UTC = 2026-10-02 00:30 Europe/Moscow
  expect(dateOnly('2026-10-01T21:30:00.000Z')).toBe('2026-10-02');
  // 20:59 UTC = 23:59 MSK, still the same civil day
  expect(dateOnly('2026-10-01T20:59:59.000Z')).toBe('2026-10-01');
  // 21:00 UTC = exactly 00:00 MSK next day
  expect(dateOnly('2026-10-01T21:00:00.000Z')).toBe('2026-10-02');
});

test('dateOnly: plain civil keys pass through; explicit zone respected', () => {
  expect(dateOnly('2026-10-01')).toBe('2026-10-01');
  expect(dateOnly('2026-10-01T21:30:00.000Z', 'UTC')).toBe('2026-10-01');
});

test('daysBetween: Moscow civil days, not UTC slices', () => {
  if (!timeZoneSupported(TZ)) return;
  // 23:59 MSK 10-01 → 00:30 MSK 10-02 is one civil day apart
  expect(daysBetween('2026-10-01T20:59:00.000Z', '2026-10-01T21:30:00.000Z')).toBe(1);
  expect(daysBetween('2026-10-01', '2026-10-08')).toBe(7);
});

test('buildFirstWeekPlan: onboarding at 00:30 MSK starts on the Moscow day', () => {
  if (!timeZoneSupported(TZ)) return;
  const plan = buildFirstWeekPlan({
    primaryGoal: 'attention',
    sessionLengthSec: 300,
    startDate: '2026-10-01T21:30:00.000Z'
  });
  expect(plan.startDate).toBe('2026-10-02');
});

test('getTodayRitual: session.startedAt after Moscow midnight is the next ritual day', () => {
  if (!timeZoneSupported(TZ)) return;
  const plan = buildFirstWeekPlan({
    primaryGoal: 'attention',
    sessionLengthSec: 300,
    startDate: '2026-10-01'
  });
  // 00:30 MSK on 2026-10-02 → day 2 (UTC slice would say day 1)
  const r = getTodayRitual(plan, '2026-10-01T21:30:00.000Z', [{ date: '2026-10-01' }]);
  expect(r.day).toBe(2);
  expect(r.inFirstWeek).toBe(true);
  // 23:59 MSK on 2026-10-01 → still day 1
  expect(getTodayRitual(plan, '2026-10-01T20:59:00.000Z').day).toBe(1);
});
