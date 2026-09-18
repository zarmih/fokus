import { expect, test } from 'vitest';
import targetShadeModule from '../src/exercises/target-shade';

test('target-shade has correct manifest', () => {
  expect(targetShadeModule.manifest.id).toBe('target-shade');
  expect(targetShadeModule.manifest.domain).toBe('attention');
  expect(targetShadeModule.render).toBeTypeOf('function');
});
