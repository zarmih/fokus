import { expect, test } from 'vitest';
import { RuleSliderEngine } from '../src/exercises/rule-slider/engine';

test('rule-slider engine', () => {
  const engine = new RuleSliderEngine();
  const state = engine.start(1);
  
  expect(state.options.length).toBe(4);
  expect(state.correctIndex).toBeGreaterThanOrEqual(0);
  expect(state.correctIndex).toBeLessThan(4);
  
  const correctOpt = state.options[state.correctIndex];
  if (state.rule === 'SHAPE') {
    expect(correctOpt.shape).toBe(state.center.shape);
  } else {
    expect(correctOpt.count).toBe(state.center.count);
  }
  
  expect(engine.submit(state, state.correctIndex).accuracy).toBe(1);
  
  const wrongIndex = (state.correctIndex + 1) % 4;
  expect(engine.submit(state, wrongIndex).accuracy).toBe(0);
});
