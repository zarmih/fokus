import { expect, test } from 'vitest';
import { WordUnscrambleEngine } from '../src/exercises/word-unscramble';

test('word unscramble generates scrambled word', () => {
  const engine = new WordUnscrambleEngine();
  const res = engine.generate(1);
  expect(res.word.length).toBeGreaterThan(0);
  expect(res.scrambled.length).toBe(res.word.length);
  // Ensure same characters
  expect(res.scrambled.split('').sort().join('')).toBe(res.word.split('').sort().join(''));
});

test('word unscramble submit', () => {
  const engine = new WordUnscrambleEngine();
  engine.currentWord = 'ЛЕС';
  expect(engine.submit('ЛЕС')).toBe(true);
  expect(engine.submit('СЕЛ')).toBe(false);
});
