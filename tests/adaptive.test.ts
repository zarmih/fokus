import { expect, test } from 'vitest';
import { calculateNextLevel } from '../src/core/adaptive';

test('adaptive level logic', () => {
  expect(calculateNextLevel(3, 0.9, 1000, 1500)).toBe(4);
  expect(calculateNextLevel(3, 0.7, 1000, 1500)).toBe(3);
  expect(calculateNextLevel(3, 0.5, 1000, 1500)).toBe(2);
});
