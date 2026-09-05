import { expect, test } from 'vitest';
import { PatternNextEngine } from '../src/exercises/pattern-next/engine';

test('pattern-next ADD_1', () => {
  const engine = new PatternNextEngine();
  const trial = engine.nextTrial({ruleType: 'ADD_1', distractors: 3});
  expect(trial.sequence.length).toBe(4);
  expect(trial.sequence[1] - trial.sequence[0]).toBe(1);
  expect(trial.answer - trial.sequence[3]).toBe(1);
  expect(trial.options.length).toBe(4);
  expect(trial.options.includes(trial.answer)).toBe(true);

  expect(engine.submit(trial.answer, trial.answer)).toBe(true);
  expect(engine.submit(trial.answer + 1, trial.answer)).toBe(false);
  expect(engine.submit(null, trial.answer)).toBe(false);
});

test('pattern-next ALT_1_2', () => {
  const engine = new PatternNextEngine();
  const trial = engine.nextTrial({ruleType: 'ALT_1_2', distractors: 3});
  const d1 = trial.sequence[1] - trial.sequence[0];
  const d2 = trial.sequence[2] - trial.sequence[1];
  expect(d1).toBe(1);
  expect(d2).toBe(2);
});
