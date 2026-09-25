import { expect, test } from 'vitest';
import vowelConsonantCountModule from '../src/exercises/vowel-consonant-count';

test('vowel-consonant-count has correct manifest', () => {
  expect(vowelConsonantCountModule.manifest.id).toBe('vowel-consonant-count');
  expect(vowelConsonantCountModule.manifest.domain).toBe('speed');
  expect(vowelConsonantCountModule.manifest.metricModel).toBe('speed-accuracy');
  expect(vowelConsonantCountModule.render).toBeTypeOf('function');
});
