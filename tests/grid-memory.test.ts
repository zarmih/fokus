import { expect, test } from 'vitest';
import { GridMemoryEngine } from '../src/exercises/grid-memory/engine';

test('grid memory start', () => {
  const engine = new GridMemoryEngine();
  const res = engine.start({grid: 3, cells: 3});
  expect(res.cellsToRemember.length).toBe(3);
});

test('grid memory correct submit', () => {
  const engine = new GridMemoryEngine();
  engine.cellsToRemember = [0, 1, 2];
  const res = engine.submit([0, 1, 2]);
  expect(res.accuracy).toBe(1);
  expect(res.correct).toBe(3);
});

test('grid memory incorrect submit', () => {
  const engine = new GridMemoryEngine();
  engine.cellsToRemember = [0, 1, 2];
  const res = engine.submit([0, 1, 3]);
  expect(res.accuracy).toBeLessThan(1);
  expect(res.correct).toBe(2);
});

test('grid memory extra clicks', () => {
  const engine = new GridMemoryEngine();
  engine.cellsToRemember = [0, 1, 2];
  const res = engine.submit([0, 1, 2, 3]);
  expect(res.accuracy).toBe(2/3); // 3 correct - 1 miss = 2/3
});
