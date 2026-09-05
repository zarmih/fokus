import { expect, test } from 'vitest';
import { StroopEngine } from '../src/exercises/stroop/engine';

test('stroop congruent', () => {
  const engine = new StroopEngine();
  const trial = engine.nextTrial({colors: 3, incongruentPct: 0});
  expect(trial.congruent).toBe(true);
  expect(trial.word).toBe(trial.ink);
});

test('stroop incongruent', () => {
  const engine = new StroopEngine();
  const trial = engine.nextTrial({colors: 3, incongruentPct: 1});
  expect(trial.congruent).toBe(false);
  expect(trial.word).not.toBe(trial.ink);
});

test('stroop submit', () => {
  const engine = new StroopEngine();
  expect(engine.submit('red', 'red')).toBe(true);
  expect(engine.submit('blue', 'red')).toBe(false);
  expect(engine.submit(null, 'red')).toBe(false); // timeout
});
