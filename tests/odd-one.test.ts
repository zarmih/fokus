import { expect, test } from 'vitest';
import { OddOneEngine } from '../src/exercises/odd-one/engine';

test('odd-one engine', () => {
  const engine = new OddOneEngine();
  const res = engine.start({grid: 3, deltaHue: 30});
  expect(res.cells.length).toBe(9);
  expect(res.cells.filter((c: any) => c.isOdd).length).toBe(1);
  
  expect(engine.submit(res.oddIndex).accuracy).toBe(1);
  expect(engine.submit((res.oddIndex + 1) % 9).accuracy).toBe(0);
  expect(engine.submit(null).accuracy).toBe(0);
});
