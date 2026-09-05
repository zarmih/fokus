import { expect, test, describe, it } from 'vitest';
import { SwitchRuleEngine, computeAnswer } from '../src/exercises/switch-rule/engine';

describe('switch-rule engine computeAnswer', () => {
  it('EVEN 4 7 true', () => expect(computeAnswer('EVEN', 4, 7)).toBe(true));
  it('EVEN 3 8 false', () => expect(computeAnswer('EVEN', 3, 8)).toBe(false));
  it('GREATER 8 2 true', () => expect(computeAnswer('GREATER', 8, 2)).toBe(true));
  it('GREATER 2 8 false', () => expect(computeAnswer('GREATER', 2, 8)).toBe(false));
});

test('switch-rule logic', () => {
  const engine = new SwitchRuleEngine();
  
  // Rule starts as EVEN
  let trial = engine.nextTrial({switchEvery: 2});
  expect(trial.rule).toBe('EVEN');
  expect(trial.correctYes).toBe(trial.left % 2 === 0);
  
  trial = engine.nextTrial({switchEvery: 2});
  expect(trial.rule).toBe('EVEN');
  
  // Switches on 3rd trial
  trial = engine.nextTrial({switchEvery: 2});
  expect(trial.rule).toBe('GREATER');
  expect(trial.correctYes).toBe(trial.left > trial.right);

  // Check correct submit
  expect(engine.submit(trial.correctYes, trial.correctYes)).toBe(true);
  expect(engine.submit(!trial.correctYes, trial.correctYes)).toBe(false);
  expect(engine.submit(null, trial.correctYes)).toBe(false);
});
