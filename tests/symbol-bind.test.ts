import { expect, test } from 'vitest';
import { SymbolBindEngine } from '../src/exercises/symbol-bind/engine';

test('symbol-bind engine', () => {
  const engine = new SymbolBindEngine();
  const state = engine.start(1);
  
  expect(state.pairs.length).toBeGreaterThan(0);
  expect(state.options.length).toBe(4);
  expect(state.options).toContain(state.correctAnswer);
  
  expect(engine.submit(state, state.correctAnswer).accuracy).toBe(1);
  const wrongAns = state.options.find(o => o !== state.correctAnswer)!;
  expect(engine.submit(state, wrongAns).accuracy).toBe(0);
});
