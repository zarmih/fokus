import { expect, test } from 'vitest';
import { ShapeEquationEngine } from '../src/exercises/shape-equation/engine';

test('shape-equation engine', () => {
  const engine = new ShapeEquationEngine();
  const res = engine.start({unknowns: 2, maxVal: 10});
  expect(res.equations.length).toBe(2);
  expect(res.options.length).toBe(4);
  expect(res.options.includes(res.targetVal)).toBe(true);
  
  expect(engine.submit(res.targetVal).accuracy).toBe(1);
  const wrongVal = res.options.find(c => c !== res.targetVal)!;
  expect(engine.submit(wrongVal).accuracy).toBe(0);
  expect(engine.submit(null).accuracy).toBe(0);
});
