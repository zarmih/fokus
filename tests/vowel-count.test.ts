import { expect, test } from 'vitest';
import { VowelCountEngine } from '../src/exercises/vowel-count/engine';

test('vowel-count engine', () => {
  const engine = new VowelCountEngine();
  const res = engine.start({length: 5});
  expect(res.word.length).toBe(5);
  expect(res.options.length).toBe(4);
  expect(res.options.includes(res.vowelCount)).toBe(true);
  
  expect(engine.submit(res.vowelCount).accuracy).toBe(1);
  const wrongCount = res.options.find(c => c !== res.vowelCount)!;
  expect(engine.submit(wrongCount).accuracy).toBe(0);
  expect(engine.submit(null).accuracy).toBe(0);
});
