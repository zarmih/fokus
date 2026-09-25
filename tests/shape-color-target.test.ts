import { expect, test } from 'vitest';
import shapeColorTargetModule from '../src/exercises/shape-color-target';

test('shape-color-target has correct manifest', () => {
  expect(shapeColorTargetModule.manifest.id).toBe('shape-color-target');
  expect(shapeColorTargetModule.manifest.domain).toBe('attention');
  expect(shapeColorTargetModule.manifest.metricModel).toBe('speed-accuracy');
  expect(shapeColorTargetModule.render).toBeTypeOf('function');
});
