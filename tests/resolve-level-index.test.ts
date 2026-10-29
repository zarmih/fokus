import { describe, it, expect } from 'vitest';
import { resolveLevelIndex } from '../src/core/resolve-level-index';
import { getPulleyParams, LEVELS } from '../src/exercises/pulley/manifest';
import { getHelixFlipParams } from '../src/exercises/helix-flip/manifest';
import { getEmberLaneParams } from '../src/exercises/ember-lane/manifest';
import { getOddOneParams } from '../src/exercises/odd-one/manifest';
import { getStroopParams } from '../src/exercises/stroop/manifest';

describe('resolveLevelIndex', () => {
  it('floors fractional difficulty to a 0-based index', () => {
    expect(resolveLevelIndex(1, 20)).toBe(0);
    expect(resolveLevelIndex(1.4, 20)).toBe(0);
    expect(resolveLevelIndex(2.9, 20)).toBe(1);
    expect(resolveLevelIndex(0.5, 20)).toBe(0);
  });

  it('clamps low / zero / negative to index 0', () => {
    expect(resolveLevelIndex(0, 10)).toBe(0);
    expect(resolveLevelIndex(-3, 10)).toBe(0);
  });

  it('clamps huge values to the last index', () => {
    expect(resolveLevelIndex(25, 20)).toBe(19);
    expect(resolveLevelIndex(1e9, 5)).toBe(4);
  });

  it('treats NaN / non-finite / non-numeric as level 1 (index 0)', () => {
    expect(resolveLevelIndex(NaN, 8)).toBe(0);
    expect(resolveLevelIndex(Infinity, 8)).toBe(7);
    expect(resolveLevelIndex(-Infinity, 8)).toBe(0);
    expect(resolveLevelIndex(undefined, 8)).toBe(0);
    expect(resolveLevelIndex(null, 8)).toBe(0);
    expect(resolveLevelIndex('nope', 8)).toBe(0);
  });

  it('survives empty or invalid length', () => {
    expect(resolveLevelIndex(3, 0)).toBe(0);
    expect(resolveLevelIndex(3, -1)).toBe(0);
    expect(resolveLevelIndex(3, NaN)).toBe(0);
  });
});

describe('exercise get*Params: fractional / edge difficulty', () => {
  it('pulley never returns undefined pool/need', () => {
    for (const lvl of [0, 0.5, 1.4, 25, NaN]) {
      const p = getPulleyParams(lvl);
      expect(p.pool.length).toBeGreaterThan(0);
      expect(p.need.length).toBeGreaterThan(0);
      expect(LEVELS.some(l =>
        l.need.length === p.need.length && l.pool.length === p.pool.length
      )).toBe(true);
    }
    expect(getPulleyParams(1.4)).toEqual(getPulleyParams(1));
  });

  it('helix-flip maps fractional 1.4 to level 1, not the hardest tier', () => {
    expect(getHelixFlipParams(1.4)).toEqual(getHelixFlipParams(1));
    expect(getHelixFlipParams(1.4).switchChance).toBe(0.1);
    expect(getHelixFlipParams(99).switchChance).toBe(0.6);
    expect(getHelixFlipParams(NaN).switchChance).toBe(0.1);
  });

  it('ember-lane maps fractional 1.4 to level 1 span', () => {
    expect(getEmberLaneParams(1.4)).toEqual(getEmberLaneParams(1));
    expect(getEmberLaneParams(1.4).span).toBe(3);
    expect(getEmberLaneParams(0).span).toBe(3);
    expect(getEmberLaneParams(NaN).span).toBe(3);
  });

  it('odd-one / stroop stay defined for NaN and huge difficulty', () => {
    expect(getOddOneParams(NaN)).toBeDefined();
    expect(getOddOneParams(NaN).grid).toBe(3);
    expect(getOddOneParams(999).grid).toBe(6);
    expect(getStroopParams(0.5)).toBeDefined();
    expect(getStroopParams(NaN).colors).toBe(3);
  });
});
