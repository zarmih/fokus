import { expect, test } from 'vitest';
import areaCompareModule from '../src/exercises/area-compare';

test('area-compare has correct manifest', () => {
  expect(areaCompareModule.manifest.id).toBe('area-compare');
  expect(areaCompareModule.manifest.domain).toBe('logic');
  expect(areaCompareModule.manifest.metricModel).toBe('speed-accuracy');
  expect(areaCompareModule.render).toBeTypeOf('function');
});
