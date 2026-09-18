import { expect, test } from 'vitest';
import mirrorMatchModule from '../src/exercises/mirror-match';

test('mirror-match has correct manifest', () => {
  expect(mirrorMatchModule.manifest.id).toBe('mirror-match');
  expect(mirrorMatchModule.manifest.domain).toBe('logic');
  expect(mirrorMatchModule.render).toBeTypeOf('function');
});
