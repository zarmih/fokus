import { expect, test } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import { reminderDayKey, reminderPlayedOnDay } from '../src/core/reminders';

const TZ = 'Europe/Moscow';

test('reminderDayKey: UTC evening maps to next Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 21:30 UTC = 2026-10-29 00:30 Europe/Moscow
  const now = new Date('2026-10-28T21:30:00.000Z');
  expect(now.toISOString().slice(0, 10)).toBe('2026-10-28');
  expect(reminderDayKey(now, TZ)).toBe('2026-10-29');
});

test('reminderDayKey: still previous Moscow day before midnight', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 20:30 UTC = 2026-10-28 23:30 Europe/Moscow
  const beforeMidnight = new Date('2026-10-28T20:30:00.000Z');
  expect(reminderDayKey(beforeMidnight, TZ)).toBe('2026-10-28');
});

test('reminderPlayedOnDay: session just after Moscow midnight counts as Moscow today', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-03T21:30:00.000Z'); // 2026-10-04 00:30 MSK
  const today = reminderDayKey(now, TZ);
  expect(today).toBe('2026-10-04');

  const played = reminderPlayedOnDay(
    today,
    {
      daySummaries: [],
      sessions: [{ startedAt: '2026-10-03T21:30:00.000Z', finishedAt: '2026-10-03T21:40:00.000Z' }]
    },
    TZ
  );
  expect(played).toBe(true);

  // UTC-day startsWith would miss this (UTC date still 2026-10-03)
  expect('2026-10-03T21:30:00.000Z'.startsWith(now.toISOString().slice(0, 10))).toBe(true);
  expect('2026-10-03T21:30:00.000Z'.startsWith(today)).toBe(false);
});

test('reminderPlayedOnDay: civil summary date matches Moscow day key', () => {
  if (!timeZoneSupported(TZ)) return;
  const today = '2026-10-04';
  expect(
    reminderPlayedOnDay(today, { daySummaries: [{ date: '2026-10-04' }], sessions: [] }, TZ)
  ).toBe(true);
  expect(
    reminderPlayedOnDay(today, { daySummaries: [{ date: '2026-10-03' }], sessions: [] }, TZ)
  ).toBe(false);
});
