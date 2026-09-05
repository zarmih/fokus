import { expect, test } from 'vitest';
import { SequenceEngine } from '../src/exercises/sequence/engine';

test('sequence start', () => {
  const engine = new SequenceEngine();
  const res = engine.start({grid: 3, length: 4});
  expect(res.sequence.length).toBe(4);
});

test('sequence correct submit', () => {
  const engine = new SequenceEngine();
  engine.sequence = [0, 1, 2, 0];
  const res = engine.submit([0, 1, 2, 0]);
  expect(res.accuracy).toBe(1);
  expect(res.correct).toBe(4);
});

test('sequence incorrect submit', () => {
  const engine = new SequenceEngine();
  engine.sequence = [0, 1, 2, 0];
  const res = engine.submit([0, 1, 3, 0]);
  expect(res.accuracy).toBe(0.5);
  expect(res.correct).toBe(2);
});
