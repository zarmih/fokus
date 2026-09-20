import { describe, it, expect } from 'vitest';
import { HelixFlipEngine } from './engine';

describe('HelixFlipEngine', () => {
  it('generates a trial adhering to the current rule', () => {
    const engine = new HelixFlipEngine();
    const trial = engine.generateTrial(0, 'Форма');
    expect(trial.rule).toBe('Форма');
    if (trial.isMatch) {
      expect(trial.leftShape).toBe(trial.rightShape);
    } else {
      expect(trial.leftShape).not.toBe(trial.rightShape);
    }
  });

  it('switches rule when switchChance is 1', () => {
    const engine = new HelixFlipEngine();
    const trial = engine.generateTrial(1, 'Форма');
    expect(trial.rule).toBe('Цвет');
    if (trial.isMatch) {
      expect(trial.leftColor).toBe(trial.rightColor);
    } else {
      expect(trial.leftColor).not.toBe(trial.rightColor);
    }
  });
});
