import { expect, test } from 'vitest';
import { SwitchRuleEngine } from '../src/exercises/switch-rule/engine';

test('switch-rule logic', () => {
  const engine = new SwitchRuleEngine();
  
  // Rule starts as EVEN
  let trial = engine.nextTrial({switchEvery: 2});
  expect(trial.rule).toBe('EVEN');
  expect(trial.answer).toBe(trial.n1 % 2 === 0);
  
  trial = engine.nextTrial({switchEvery: 2});
  expect(trial.rule).toBe('EVEN');
  
  // Switches on 3rd trial
  trial = engine.nextTrial({switchEvery: 2});
  expect(trial.rule).toBe('GREATER');
  expect(trial.answer).toBe(trial.n1 > trial.n2);

  // Check correct submit
  expect(engine.submit(trial.answer, trial.answer)).toBe(true);
  expect(engine.submit(!trial.answer, trial.answer)).toBe(false);
  expect(engine.submit(null, trial.answer)).toBe(false);
});
