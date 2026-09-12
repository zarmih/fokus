import { describe, it, expect } from 'vitest';
import { EmberLaneEngine } from './engine';

describe('EmberLaneEngine', () => {
  it('generates sequence of correct length', () => {
    const engine = new EmberLaneEngine(5, 12);
    const seq = engine.generateSequence();
    expect(seq).toHaveLength(5);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toBe(seq[i - 1]);
      expect(seq[i]).toBeGreaterThanOrEqual(0);
      expect(seq[i]).toBeLessThan(12);
    }
  });
});
