import { expect, test } from 'vitest';
import shapeSidesMatchModule from '../src/exercises/shape-sides-match';

test('shape-sides-match has correct manifest', () => {
  expect(shapeSidesMatchModule.manifest.id).toBe('shape-sides-match');
  expect(shapeSidesMatchModule.manifest.domain).toBe('logic');
  expect(shapeSidesMatchModule.manifest.metricModel).toBe('speed-accuracy');
  expect(shapeSidesMatchModule.render).toBeTypeOf('function');
});
