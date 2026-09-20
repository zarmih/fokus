import { expect, test } from 'vitest';
import wordLengthSortModule from '../src/exercises/word-length-sort';

test('word-length-sort has correct manifest', () => {
  expect(wordLengthSortModule.manifest.id).toBe('word-length-sort');
  expect(wordLengthSortModule.manifest.domain).toBe('speed');
  expect(wordLengthSortModule.render).toBeTypeOf('function');
});
