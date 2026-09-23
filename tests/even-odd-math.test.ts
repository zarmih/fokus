import { expect, test } from 'vitest';
import evenOddMathModule from '../src/exercises/even-odd-math';

test('even-odd-math has correct manifest', () => {
  expect(evenOddMathModule.manifest.id).toBe('even-odd-math');
  expect(evenOddMathModule.manifest.domain).toBe('logic');
  expect(evenOddMathModule.manifest.metricModel).toBe('speed-accuracy');
  expect(evenOddMathModule.render).toBeTypeOf('function');
});
