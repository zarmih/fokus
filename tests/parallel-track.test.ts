import { expect, test } from 'vitest';
import parallelTrackModule from '../src/exercises/parallel-track';

test('parallel-track manifest is well-formed', () => {
  expect(parallelTrackModule.manifest.id).toBe('parallel-track');
  expect(parallelTrackModule.manifest.domain).toBe('attention');
  expect(parallelTrackModule.manifest.skills).toContain('divided_attention');
});

test('parallel-track render cleans up', () => {
  const el = document.createElement('div');
  const cleanup = parallelTrackModule.render(el, 1, () => {}, () => false) as () => void;
  expect(cleanup).toBeTypeOf('function');
  cleanup();
});
