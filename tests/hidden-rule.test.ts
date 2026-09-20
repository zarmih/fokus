import { expect, test } from 'vitest';
import hiddenRuleModule from '../src/exercises/hidden-rule';

test('hidden-rule has correct manifest', () => {
  expect(hiddenRuleModule.manifest.id).toBe('hidden-rule');
  expect(hiddenRuleModule.manifest.domain).toBe('flexibility');
  expect(hiddenRuleModule.manifest.metricModel).toBe('speed-accuracy');
  expect(hiddenRuleModule.render).toBeTypeOf('function');
});
