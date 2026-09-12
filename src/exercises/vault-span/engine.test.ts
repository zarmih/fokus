import { describe, it, expect } from 'vitest';
import { VaultSpanEngine, Color } from './engine';

describe('VaultSpanEngine', () => {
  it('generates a puzzle with valid solution and clues for level 1', () => {
    const engine = new VaultSpanEngine();
    const puzzle = engine.generatePuzzle(1);
    expect(puzzle.solution).toHaveLength(3);
    expect(puzzle.clues.length).toBeGreaterThan(0);
    // verify colors are unique
    expect(new Set(puzzle.solution).size).toBe(3);
  });
  
  it('generates a puzzle with valid solution and clues for level 5', () => {
    const engine = new VaultSpanEngine();
    const puzzle = engine.generatePuzzle(5);
    expect(puzzle.solution).toHaveLength(4);
    expect(puzzle.clues.length).toBeGreaterThan(0);
    expect(new Set(puzzle.solution).size).toBe(4);
  });
});
