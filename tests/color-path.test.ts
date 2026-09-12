import { expect, test } from 'vitest';
import mod from '../src/exercises/color-path';

test('color-path loads', () => {
  expect(mod.manifest.id).toBe('color-path');
  expect(mod.manifest.domain).toBe('speed');
});
