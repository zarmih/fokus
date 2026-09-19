import { expect, test } from 'vitest';
import timeEstimationModule from '../src/exercises/time-estimation';

test('time-estimation has correct manifest', () => {
  expect(timeEstimationModule.manifest.id).toBe('time-estimation');
  expect(timeEstimationModule.manifest.domain).toBe('speed');
  expect(timeEstimationModule.manifest.metricModel).toBe('timing-precision');
  expect(timeEstimationModule.render).toBeTypeOf('function');
});
