import { expect, test } from 'vitest';
import mod from '../src/exercises/word-sort';

test('word-sort loads', () => {
  expect(mod.manifest.id).toBe('word-sort');
  expect(mod.manifest.domain).toBe('flexibility');
});
