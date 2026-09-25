import { describe, it, expect } from 'vitest';
import { DigitFilterEngine } from './engine';

describe('DigitFilterEngine', () => {
  it('generates targets as even numbers', () => {
    const engine = new DigitFilterEngine();
    let foundTarget = false;
    for (let i = 0; i < 50; i++) {
      const { char, isTarget } = engine.generateStream(1);
      if (isTarget) {
        foundTarget = true;
        expect(['2', '4', '6', '8']).toContain(char);
      } else {
        expect(['2', '4', '6', '8']).not.toContain(char);
      }
    }
    expect(foundTarget).toBe(true);
  });
});
