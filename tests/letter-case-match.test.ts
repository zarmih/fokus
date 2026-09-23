import { expect, test } from 'vitest';
import letterCaseMatchModule from '../src/exercises/letter-case-match';

test('letter-case-match has correct manifest', () => {
  expect(letterCaseMatchModule.manifest.id).toBe('letter-case-match');
  expect(letterCaseMatchModule.manifest.domain).toBe('speed');
  expect(letterCaseMatchModule.manifest.metricModel).toBe('speed-accuracy');
  expect(letterCaseMatchModule.render).toBeTypeOf('function');
});
