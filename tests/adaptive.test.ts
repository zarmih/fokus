import { expect, test } from 'vitest';
import { calculateNextLevel, updateDomainIndex } from '../src/core/adaptive';

test('adaptive level +1', () => {
  expect(calculateNextLevel(3, 0.9, 1000, 1500)).toBe(4);
});
test('adaptive level 0', () => {
  expect(calculateNextLevel(3, 0.7, 1000, 1500)).toBe(3);
});
test('adaptive level -1', () => {
  expect(calculateNextLevel(3, 0.5, 1000, 1500)).toBe(2);
});
test('adaptive level max', () => {
  expect(calculateNextLevel(20, 0.9, 1000, 1500)).toBe(20);
});
test('adaptive level min', () => {
  expect(calculateNextLevel(1, 0.5, 1000, 1500)).toBe(1);
});

test('update domain index', () => {
  const next = updateDomainIndex(100, 1.0, 5);
  expect(next).toBeGreaterThan(100);
});
