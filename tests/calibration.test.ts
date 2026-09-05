import { expect, test } from 'vitest';
import { mapAccuracyToStartLevel } from '../src/core/calibration';

test('mapAccuracyToStartLevel', () => {
  expect(mapAccuracyToStartLevel(0.9)).toBe(5);
  expect(mapAccuracyToStartLevel(0.8)).toBe(5);
  expect(mapAccuracyToStartLevel(0.6)).toBe(3);
  expect(mapAccuracyToStartLevel(0.5)).toBe(3);
  expect(mapAccuracyToStartLevel(0.4)).toBe(2);
  expect(mapAccuracyToStartLevel(0)).toBe(2);
});
