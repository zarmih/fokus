import { describe, it, expect } from 'vitest';
import { PairsGame } from '../src/exercises/pairs/engine';

describe('pairs engine', () => {
  it('creates pairs', () => {
    const game = new PairsGame(4);
    expect(game.cards.length).toBe(8);
  });
  
  it('handles match and mismatch', () => {
    const game = new PairsGame(3);
    const card0 = game.cards[0];
    const matchIdx = game.cards.findIndex((c, i) => i !== 0 && c === card0);
    const mismatchIdx = game.cards.findIndex(c => c !== card0);
    
    expect(game.flip(0)).toBe('pending');
    expect(game.flip(mismatchIdx)).toBe('mismatch');
    expect(game.flipped.length).toBe(2);
    
    // clear for next try
    game.clearFlipped();
    
    expect(game.flip(0)).toBe('pending');
    const res = game.flip(matchIdx);
    expect(res === 'match' || res === 'win').toBe(true);
    expect(game.matched[0]).toBe(true);
  });
});
