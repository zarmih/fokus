import { expect, test } from 'vitest';
import { initGame, submitAnswer, generateEquation } from '../src/exercises/math-sprint/engine';

test('math-sprint generates valid equation', () => {
  const eq = generateEquation(1);
  expect(eq.equation).toContain('=');
  expect(typeof eq.isCorrect).toBe('boolean');
});

test('math-sprint logic', () => {
  let state = initGame(1);
  expect(state.status).toBe('playing');
  expect(state.round).toBe(1);

  const wasCorrect = state.isCorrect;
  state = submitAnswer(state, wasCorrect);
  expect(state.correctAnswers).toBe(1);
  expect(state.round).toBe(2);
});
