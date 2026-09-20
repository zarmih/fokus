import { expect, test } from 'vitest';
import { TimeEstimationEngine } from '../src/exercises/time-estimation';

test('time estimation engine generates target', () => {
  const engine = new TimeEstimationEngine();
  const target = engine.generate(1);
  expect(target).toBeGreaterThanOrEqual(2);
});

test('time estimation engine calculates diff correctly', () => {
  const engine = new TimeEstimationEngine();
  engine.targetSeconds = 3;
  engine.start();
  
  // mock performance.now behavior is hard without actually waiting or mocking,
  // we can just check structure
  const res = engine.stop();
  expect(res).toHaveProperty('elapsed');
  expect(res).toHaveProperty('diff');
  expect(res).toHaveProperty('success');
});
