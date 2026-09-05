import { expect, test } from 'vitest';
import { nextStreak } from '../src/core/streak';

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
