import { expect, test } from 'vitest';
import neonSparkModule from '../src/exercises/neon-spark';

test('neon-spark manifest is well-formed', () => {
  expect(neonSparkModule.manifest.id).toBe('neon-spark');
  expect(neonSparkModule.manifest.domain).toBe('attention');
  expect(neonSparkModule.manifest.skills).toContain('sustained_attention');
});

test('neon-spark render cleans up', () => {
  const el = document.createElement('div');
  const cleanup = neonSparkModule.render(el, 1, () => {}, () => false) as () => void;
  expect(cleanup).toBeTypeOf('function');
  cleanup();
});
