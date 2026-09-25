import { describe, it, expect } from 'vitest';
import { TripleMatchEngine } from './engine';

describe('TripleMatchEngine', () => {
  it('generates 3 cards and sets isMatch boolean', () => {
    const engine = new TripleMatchEngine();
    const result = engine.generateCards();
    expect(result.cards.length).toBe(3);
    expect(typeof result.isMatch).toBe('boolean');
    expect(result.cards[0]).toHaveProperty('color');
    expect(result.cards[0]).toHaveProperty('shape');
  });
});
