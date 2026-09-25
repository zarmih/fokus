import { expect, test } from 'vitest';
import seasonMatchModule from '../src/exercises/season-match';

test('season-match has correct manifest', () => {
  expect(seasonMatchModule.manifest.id).toBe('season-match');
  expect(seasonMatchModule.manifest.domain).toBe('memory');
  expect(seasonMatchModule.manifest.metricModel).toBe('speed-accuracy');
  expect(seasonMatchModule.render).toBeTypeOf('function');
});
