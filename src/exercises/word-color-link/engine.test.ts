import { describe, it, expect } from 'vitest';
import { WordColorLinkEngine } from './engine';

describe('WordColorLinkEngine', () => {
  it('generates trial with target color in options', () => {
    const engine = new WordColorLinkEngine();
    const trial = engine.generateTrial();
    expect(trial.word).toBeTruthy();
    expect(trial.colorHex).toBeTruthy();
    expect(trial.options.length).toBe(3);
    const hasTarget = trial.options.some(o => o.hex === trial.colorHex);
    expect(hasTarget).toBe(true);
  });
});
