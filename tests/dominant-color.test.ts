import { expect, test } from 'vitest';
import { DominantColorEngine } from '../src/exercises/dominant-color/engine';

test('dominant-color engine', () => {
  const engine = new DominantColorEngine();
  const res = engine.start({grid: 3, colors: 2});
  expect(res.cells.length).toBe(9);
  expect(res.options.length).toBe(2);
  expect(res.dominantColor).toBeTruthy();
  
  expect(engine.submit(res.dominantColor).accuracy).toBe(1);
  const wrongColor = res.options.find(c => c !== res.dominantColor)!;
  expect(engine.submit(wrongColor).accuracy).toBe(0);
  expect(engine.submit(null).accuracy).toBe(0);
});
