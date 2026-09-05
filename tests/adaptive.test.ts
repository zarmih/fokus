import { expect, test } from 'vitest';
import { calculateNextDifficulty, calculateNormalizedPerformance, updateDomainIndex, updateSkillIndex } from '../src/core/adaptive';

test('adaptive difficulty increase', () => {
  const next = calculateNextDifficulty(3.0, 0.96, 1000, 1500);
  expect(next).toBeGreaterThan(3.0);
});
test('adaptive difficulty drop on fail', () => {
  const next = calculateNextDifficulty(3.0, 0.5, 1000, 1500);
  expect(next).toBeLessThan(3.0);
});
test('performance calculation', () => {
  const perfGood = calculateNormalizedPerformance(1.0, 1000, 1500, 5);
  const perfBad = calculateNormalizedPerformance(0.5, 2000, 1500, 5);
  expect(perfGood).toBeGreaterThan(perfBad);
});
test('update domain index', () => {
  const next = updateDomainIndex(undefined, 'memory', 500);
  expect(next.domain).toBe('memory');
  expect(next.value).toBe(500);
});
test('update skill index', () => {
  const next = updateSkillIndex(undefined, 'visual_memory', 500);
  expect(next.skill).toBe('visual_memory');
  expect(next.value).toBe(500);
  expect(next.attempts).toBe(1);
});
