import { afterEach, expect, test, vi } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import { buildReminderCopy, fokusRotationDay } from '../src/core/reminders';
import { getWeeklyDomainTips } from '../src/core/coach-intel';

const TZ = 'Europe/Moscow';
const base = { playedToday: false, openMisses: 0, streakStatus: 'active', streakCurrent: 3, gapDays: 0, primaryGoal: 'attention' };

afterEach(() => {
  vi.useRealTimers();
});

test('fokusRotationDay flips at Moscow midnight, not UTC midnight', () => {
  if (!timeZoneSupported(TZ)) return;
  const d1001 = Math.round(Date.UTC(2026, 9, 1) / 86400000);
  // 20:59 UTC = 23:59 MSK 10-01
  expect(fokusRotationDay(new Date('2026-10-01T20:59:59.000Z'))).toBe(d1001);
  // 21:00 UTC = 00:00 MSK 10-02 (UTC day still 10-01)
  expect(fokusRotationDay(new Date('2026-10-01T21:00:00.000Z'))).toBe(d1001 + 1);
  expect(Math.floor(Date.parse('2026-10-01T21:00:00.000Z') / 86400000)).toBe(d1001);
  // 02:59 MSK 10-02 still 10-02
  expect(fokusRotationDay(new Date('2026-10-01T23:59:00.000Z'))).toBe(d1001 + 1);
});

test('fokusRotationDay respects explicit zone', () => {
  const d1001 = Math.round(Date.UTC(2026, 9, 1) / 86400000);
  expect(fokusRotationDay(new Date('2026-10-01T21:30:00.000Z'), 'UTC')).toBe(d1001);
});

test('buildReminderCopy default rotation uses Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  const tips = getWeeklyDomainTips('attention');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T21:30:00.000Z')); // MSK 10-02 00:30
  const expectedDay = Math.round(Date.UTC(2026, 9, 2) / 86400000);
  const copy = buildReminderCopy({ ...base });
  expect(copy?.kind).toBe('daily');
  expect(copy?.body).toBe(tips[expectedDay % tips.length]);
});

test('buildReminderCopy explicit dayOfYear unchanged', () => {
  const tips = getWeeklyDomainTips('attention');
  for (const day of [0, 1, 5, 12345]) {
    expect(buildReminderCopy({ ...base, dayOfYear: day })?.body).toBe(tips[day % tips.length]);
  }
});
