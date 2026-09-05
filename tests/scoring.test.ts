import { expect, test } from 'vitest';
import { calculateScore } from '../src/core/scoring';

test('calculateScore', () => {
  expect(calculateScore(1.0, 3, 1000, 1500)).toBeGreaterThan(0);
});
