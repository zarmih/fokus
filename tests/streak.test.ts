import { expect, test } from 'vitest';
import {
  addCalendarDays,
  calendarDayKey,
  computeDayStreak,
  daysBetween,
  extractPlayedDays,
  nextStreak,
  resolveFokusTimeZone,
  timeZoneSupported
} from '../src/core/streak';

test('streak: first time', () => {
  const {streak, skipped} = nextStreak(null, 0, '2026-09-05T10:00:00Z');
  expect(streak).toBe(1);
  expect(skipped).toBe(false);
});

test('streak: same day', () => {
  const {streak, skipped} = nextStreak('2026-09-05T08:00:00Z', 3, '2026-09-05T10:00:00Z');
  expect(streak).toBe(3);
  expect(skipped).toBe(false);
});

test('streak: next day', () => {
  const {streak, skipped} = nextStreak('2026-09-04T08:00:00Z', 3, '2026-09-05T10:00:00Z');
  expect(streak).toBe(4);
  expect(skipped).toBe(false);
});

test('streak: skip 1 day', () => {
  const {streak, skipped} = nextStreak('2026-09-03T08:00:00Z', 3, '2026-09-05T10:00:00Z');
  expect(streak).toBe(4);
  expect(skipped).toBe(true);
});

test('streak: skip > 1 day', () => {
  const {streak, skipped} = nextStreak('2026-09-02T08:00:00Z', 3, '2026-09-05T10:00:00Z');
  expect(streak).toBe(1);
  expect(skipped).toBe(false);
});

test('calendar day: Europe/Moscow crosses UTC midnight', () => {
  if (!timeZoneSupported('Europe/Moscow')) return;
  const tz = 'Europe/Moscow';
  // 21:30 UTC = 00:30 next civil day in Moscow (UTC+3, no DST).
  expect(calendarDayKey('2026-09-05T21:30:00Z', tz)).toBe('2026-09-06');
  expect(calendarDayKey('2026-09-05T20:59:59Z', tz)).toBe('2026-09-05');
  expect(calendarDayKey('2026-09-05T21:30:00Z', 'UTC')).toBe('2026-09-05');
});

test('calendar day: date-only strings stay civil, no TZ shift', () => {
  expect(calendarDayKey('2026-09-07', 'UTC')).toBe('2026-09-07');
  expect(calendarDayKey('2026-09-07', 'Europe/Moscow')).toBe('2026-09-07');
});

test('resolveFokusTimeZone prefers Moscow when IANA data exists', () => {
  const resolved = resolveFokusTimeZone();
  if (timeZoneSupported('Europe/Moscow')) {
    expect(resolved.timeZone).toBe('Europe/Moscow');
    expect(resolved.source).toBe('europe-moscow');
  } else {
    expect(resolved.timeZone).toBe('UTC');
    expect(resolved.source).toBe('utc-fallback');
  }
});

test('honest streak: empty history is a no-op', () => {
  const s = computeDayStreak([], '2026-09-10');
  expect(s.status).toBe('empty');
  expect(s.current).toBe(0);
  expect(s.playedToday).toBe(false);
  expect(s.openMisses).toBe(0);
});

test('honest streak: consecutive days including today', () => {
  const s = computeDayStreak(['2026-09-08', '2026-09-09', '2026-09-10'], '2026-09-10');
  expect(s.current).toBe(3);
  expect(s.longest).toBe(3);
  expect(s.status).toBe('active');
  expect(s.playedToday).toBe(true);
});

test('honest streak: yesterday still open, today not played', () => {
  const s = computeDayStreak(['2026-09-08', '2026-09-09'], '2026-09-10');
  expect(s.current).toBe(2);
  expect(s.status).toBe('open');
  expect(s.openMisses).toBe(0);
  expect(s.daysSinceLastPlay).toBe(1);
});

test('honest streak: 1-day gap resets current (soft return, not freeze)', () => {
  const s = computeDayStreak(['2026-09-07', '2026-09-08'], '2026-09-10');
  expect(s.current).toBe(0);
  expect(s.longest).toBe(2);
  expect(s.openMisses).toBe(1);
  expect(s.status).toBe('soft_return');
});

test('honest streak: 2-day gap is still a gentle return', () => {
  const s = computeDayStreak(['2026-09-07'], '2026-09-10');
  expect(s.current).toBe(0);
  expect(s.openMisses).toBe(2);
  expect(s.status).toBe('soft_return');
});

test('honest streak: 3-day gap is a fresh start', () => {
  const s = computeDayStreak(['2026-09-06'], '2026-09-10');
  expect(s.current).toBe(0);
  expect(s.openMisses).toBe(3);
  expect(s.status).toBe('fresh_start');
});

test('honest streak: return day after 1-day gap starts a new count', () => {
  const s = computeDayStreak(['2026-09-08', '2026-09-10'], '2026-09-10');
  expect(s.current).toBe(1);
  expect(s.status).toBe('returned');
  expect(s.playedToday).toBe(true);
});

test('extractPlayedDays unions summaries, sessions, history', () => {
  const days = extractPlayedDays({
    daySummaries: [{ date: '2026-09-08' }],
    sessions: [{ startedAt: '2026-09-09T10:00:00Z', finishedAt: '2026-09-09T10:06:00Z' }],
    history: [{ date: '2026-09-08T12:00:00Z' }]
  }, 'UTC');
  expect(days).toEqual(['2026-09-08', '2026-09-09']);
});

test('daysBetween and addCalendarDays are civil, not DST-sensitive', () => {
  expect(daysBetween('2026-09-08', '2026-09-10')).toBe(2);
  expect(addCalendarDays('2026-09-30', 1)).toBe('2026-10-01');
  expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
});
