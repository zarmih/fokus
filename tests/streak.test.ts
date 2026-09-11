import { expect, test } from 'vitest';
import { nextStreak } from '../src/core/streak';

test('streak: first time', () => {
  const {streak, skipped, shieldsUsed} = nextStreak(null, 0, '2026-09-05T10:00:00Z', 0);
  expect(streak).toBe(1);
  expect(skipped).toBe(false);
  expect(shieldsUsed).toBe(0);
});

test('streak: same day', () => {
  const {streak, skipped, shieldsUsed} = nextStreak('2026-09-05T08:00:00Z', 3, '2026-09-05T10:00:00Z', 0);
  expect(streak).toBe(3);
  expect(skipped).toBe(false);
  expect(shieldsUsed).toBe(0);
});

test('streak: next day', () => {
  const {streak, skipped, shieldsUsed} = nextStreak('2026-09-04T08:00:00Z', 3, '2026-09-05T10:00:00Z', 0);
  expect(streak).toBe(4);
  expect(skipped).toBe(false);
  expect(shieldsUsed).toBe(0);
});

test('streak: skip 1 day without shield', () => {
  const {streak, skipped, shieldsUsed} = nextStreak('2026-09-03T08:00:00Z', 3, '2026-09-05T10:00:00Z', 0);
  expect(streak).toBe(1);
  expect(skipped).toBe(false);
  expect(shieldsUsed).toBe(0);
});

test('streak: skip 1 day with shield', () => {
  const {streak, skipped, shieldsUsed} = nextStreak('2026-09-03T08:00:00Z', 3, '2026-09-05T10:00:00Z', 1);
  expect(streak).toBe(4);
  expect(skipped).toBe(true);
  expect(shieldsUsed).toBe(1);
});

test('streak: skip > 1 day even with shield', () => {
  const {streak, skipped, shieldsUsed} = nextStreak('2026-09-02T08:00:00Z', 3, '2026-09-05T10:00:00Z', 5);
  expect(streak).toBe(1);
  expect(skipped).toBe(false);
  expect(shieldsUsed).toBe(0);
});
