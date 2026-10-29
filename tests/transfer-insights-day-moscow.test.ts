import { expect, test } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import { dayKey, daysAgoKey, inLastDays } from '../src/core/transfer-insights';

const TZ = 'Europe/Moscow';

test('dayKey: instants around Moscow midnight map to the Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 20:59 UTC = 23:59 MSK same day; 21:00 UTC = 00:00 MSK next day
  expect(dayKey('2026-10-01T20:59:59.000Z')).toBe('2026-10-01');
  expect(dayKey('2026-10-01T21:00:00.000Z')).toBe('2026-10-02');
  expect(dayKey('2026-10-01T21:30:00.000Z')).toBe('2026-10-02');
});

test('dayKey: civil date-only keys pass through; explicit zone respected', () => {
  expect(dayKey('2026-10-01')).toBe('2026-10-01');
  expect(dayKey('2026-10-01T21:30:00.000Z', 'UTC')).toBe('2026-10-01');
});

test('inLastDays: session at 00:30 MSK on window start day is inside the 7-day window', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-08T21:30:00.000Z'); // MSK 2026-10-09 00:30
  expect(daysAgoKey(now, 7)).toBe('2026-10-02');
  // MSK 2026-10-02 00:30 — UTC slice (10-01) would wrongly drop it
  expect(inLastDays('2026-10-01T21:30:00.000Z', now, 7)).toBe(true);
  // MSK 2026-10-01 23:59 — one civil day before the window
  expect(inLastDays('2026-10-01T20:59:00.000Z', now, 7)).toBe(false);
});

test('inLastDays: session at 00:30 MSK today counts as today', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-08T22:00:00.000Z'); // MSK 2026-10-09 01:00
  expect(inLastDays('2026-10-08T21:30:00.000Z', now, 0)).toBe(true);
  expect(inLastDays('2026-10-08T20:30:00.000Z', now, 0)).toBe(false);
});
