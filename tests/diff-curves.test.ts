import { describe, expect, test } from 'vitest';
import { updateExerciseState } from '../src/core/adaptive';
import {
  CALIBRATION_BAND,
  CURVE_DIFFICULTY_MAX,
  CURVE_DIFFICULTY_MIN,
  SURGE_LIFT,
  WARMUP_DROP,
  amplitudeScale,
  defaultCurveKind,
  elapsedProgress,
  observationDifficulty,
  paramsAlongCurve,
  phaseList,
  planCurve,
  plateauDifficulty,
  progressDifficulty,
  resolveCurveKind,
  sampleCurve,
  shiftDeadline,
  surgeDifficulty,
  surgePeak,
  trialDifficulty,
  warmupDifficulty,
  warmupStart
} from '../src/core/diff-curves';
import { catalogFromManifests, createAbilityModel, selectDifficulty } from '../src/core/engine';
import type { CatalogItem } from '../src/core/engine/types';
import { getManifest } from '../src/exercises/catalog';
import { getGridMemoryParams } from '../src/exercises/grid-memory/manifest';
import { getNBackParams } from '../src/exercises/n-back/manifest';
import { getPosnerParams } from '../src/exercises/posner/manifest';
import { getStroopParams } from '../src/exercises/stroop/manifest';

describe('warmup / plateau / surge primitives', () => {
  test('warmup starts below the anchor and ramps to it', () => {
    const target = 10;
    expect(warmupStart(target)).toBeCloseTo(target - WARMUP_DROP, 5);
    expect(warmupDifficulty(target, 0)).toBe(warmupStart(target));
    expect(warmupDifficulty(target, 1)).toBeCloseTo(target, 5);
    expect(warmupDifficulty(target, 0.5)).toBeGreaterThan(warmupDifficulty(target, 0));
    expect(warmupDifficulty(target, 0.5)).toBeLessThan(warmupDifficulty(target, 1));
  });

  test('plateau is the clamped anchor', () => {
    expect(plateauDifficulty(10)).toBe(10);
    expect(plateauDifficulty(0)).toBe(CURVE_DIFFICULTY_MIN);
    expect(plateauDifficulty(99)).toBe(CURVE_DIFFICULTY_MAX);
    expect(plateauDifficulty(Number.NaN)).toBe(CURVE_DIFFICULTY_MIN);
  });

  test('surge starts at the anchor and lifts by SURGE_LIFT', () => {
    const target = 10;
    expect(surgePeak(target)).toBeCloseTo(target + SURGE_LIFT, 5);
    expect(surgeDifficulty(target, 0)).toBeCloseTo(target, 5);
    expect(surgeDifficulty(target, 1)).toBe(surgePeak(target));
    expect(surgeDifficulty(target, 1)).toBeGreaterThan(target);
  });

  test('warmup < plateau < surge at a mature target', () => {
    const target = 12;
    expect(warmupDifficulty(target, 0)).toBeLessThan(plateauDifficulty(target));
    expect(plateauDifficulty(target)).toBeLessThan(surgeDifficulty(target, 1));
  });

  test('calibration band shrinks amplitude so probes stay near the mid item', () => {
    expect(amplitudeScale(CALIBRATION_BAND)).toBe(1);
    expect(amplitudeScale(2)).toBeCloseTo(2 / CALIBRATION_BAND, 5);
    const easy = warmupStart(2);
    expect(easy).toBeGreaterThanOrEqual(CURVE_DIFFICULTY_MIN);
    expect(2 - easy).toBeLessThan(WARMUP_DROP);
    expect(surgePeak(2) - 2).toBeLessThan(SURGE_LIFT);
  });

  test('warmup never drops below 75% of the anchor', () => {
    expect(warmupStart(2)).toBeGreaterThanOrEqual(2 * 0.75);
    expect(warmupStart(1)).toBe(1);
  });
});

describe('phase lists', () => {
  test('short blocks keep a plateau so a probe is not warmup-only', () => {
    expect(phaseList(1, 'warmup-plateau-surge')).toEqual(['plateau']);
    expect(phaseList(2, 'warmup-plateau-surge')).toEqual(['warmup', 'plateau']);
    expect(phaseList(3, 'warmup-plateau-surge')).toEqual(['warmup', 'plateau', 'plateau']);
    expect(phaseList(4, 'warmup-plateau-surge')).toEqual(['warmup', 'plateau', 'plateau', 'surge']);
  });

  test('n=10 is 20% warmup / 15% surge / rest plateau', () => {
    const phases = phaseList(10, 'warmup-plateau-surge');
    expect(phases).toHaveLength(10);
    expect(phases.filter((p) => p === 'warmup')).toHaveLength(2);
    expect(phases.filter((p) => p === 'surge')).toHaveLength(2);
    expect(phases.filter((p) => p === 'plateau')).toHaveLength(6);
    expect(phases[0]).toBe('warmup');
    expect(phases[phases.length - 1]).toBe('surge');
  });

  test('memory default is warmup-plateau (no late surge)', () => {
    expect(defaultCurveKind('memory-span')).toBe('warmup-plateau');
    expect(defaultCurveKind('logic-correctness')).toBe('warmup-plateau');
    expect(defaultCurveKind('speed-accuracy')).toBe('warmup-plateau-surge');
    expect(phaseList(6, 'warmup-plateau').includes('surge')).toBe(false);
    expect(phaseList(6, 'warmup-plateau')[0]).toBe('warmup');
  });

  test('flat / plateau / warmup / surge kinds are homogeneous', () => {
    expect(phaseList(5, 'flat').every((p) => p === 'plateau')).toBe(true);
    expect(phaseList(5, 'warmup').every((p) => p === 'warmup')).toBe(true);
    expect(phaseList(5, 'surge').every((p) => p === 'surge')).toBe(true);
  });
});

describe('sampleCurve / planCurve', () => {
  test('index+count follows the discrete plan; t follows progress windows', () => {
    const planned = planCurve(10, 8, 'warmup-plateau-surge');
    expect(planned).toHaveLength(8);
    expect(planned[0].phase).toBe('warmup');
    expect(planned[0].difficulty).toBeLessThan(10);
    expect(planned[3].phase).toBe('plateau');
    expect(planned[3].difficulty).toBeCloseTo(10, 5);
    expect(planned[7].phase).toBe('surge');
    expect(planned[7].difficulty).toBeGreaterThan(10);

    const warm = progressDifficulty({ target: 10, progress: 0, kind: 'warmup-plateau-surge' });
    const mid = progressDifficulty({ target: 10, progress: 0.5, kind: 'warmup-plateau-surge' });
    const late = progressDifficulty({ target: 10, progress: 1, kind: 'warmup-plateau-surge' });
    expect(warm.phase).toBe('warmup');
    expect(mid.phase).toBe('plateau');
    expect(late.phase).toBe('surge');
    expect(warm.difficulty).toBeLessThan(mid.difficulty);
    expect(mid.difficulty).toBeLessThan(late.difficulty);
  });

  test('missing progress defaults to plateau so engines cannot accidentally surge', () => {
    const sample = sampleCurve({ target: 9, kind: 'warmup-plateau-surge' });
    expect(sample.phase).toBe('plateau');
    expect(sample.difficulty).toBe(9);
    expect(sample.offset).toBe(0);
  });

  test('index wins over t when both are provided', () => {
    const sample = sampleCurve({
      target: 10,
      t: 1,
      index: 0,
      count: 8,
      kind: 'warmup-plateau-surge'
    });
    expect(sample.phase).toBe('warmup');
  });

  test('trialDifficulty is deterministic', () => {
    const a = trialDifficulty({ target: 7, index: 2, count: 10 });
    const b = trialDifficulty({ target: 7, index: 2, count: 10 });
    expect(a).toEqual(b);
  });

  test('observationDifficulty is the anchor, not the surge peak', () => {
    const target = 11;
    const late = sampleCurve({ target, t: 1, kind: 'warmup-plateau-surge' });
    expect(observationDifficulty(target)).toBe(target);
    expect(observationDifficulty(target)).toBeLessThan(late.difficulty);
  });

  test('elapsedProgress is 0 at start and 1 at the window', () => {
    expect(elapsedProgress(-10)).toBe(0);
    expect(elapsedProgress(0)).toBe(0);
    expect(elapsedProgress(35_000, 70_000)).toBeCloseTo(0.5, 5);
    expect(elapsedProgress(70_000, 70_000)).toBe(1);
    expect(elapsedProgress(90_000, 70_000)).toBe(1);
  });

  test('unknown kind falls back to the metric default', () => {
    expect(resolveCurveKind('nope', 'memory-span')).toBe('warmup-plateau');
    expect(resolveCurveKind(undefined, 'speed-accuracy')).toBe('warmup-plateau-surge');
    expect(resolveCurveKind('flat')).toBe('flat');
  });
});

describe('paramsAlongCurve — engine-facing helper', () => {
  test('stroop warmup is a slower, more congruent table row than plateau', () => {
    const { params: warm } = paramsAlongCurve(getStroopParams, {
      target: 10,
      t: 0,
      kind: 'warmup-plateau-surge'
    });
    const { params: mid } = paramsAlongCurve(getStroopParams, {
      target: 10,
      t: 0.5,
      kind: 'warmup-plateau-surge'
    });
    expect(warm.deadlineMs).toBeGreaterThan(mid.deadlineMs);
    expect(warm.incongruentPct).toBeLessThanOrEqual(mid.incongruentPct);
  });

  test('posner surge is a shorter window with more invalid cues', () => {
    const { params: mid } = paramsAlongCurve(getPosnerParams, {
      target: 10,
      t: 0.5,
      kind: 'warmup-plateau-surge'
    });
    const { params: late } = paramsAlongCurve(getPosnerParams, {
      target: 10,
      t: 1,
      kind: 'warmup-plateau-surge'
    });
    expect(late.targetDuration).toBeLessThan(mid.targetDuration);
    expect(late.invalidPct).toBeGreaterThan(mid.invalidPct);
  });

  test('n-back keeps n; delay uses offset so n-bands cannot invert warmup', () => {
    const anchor = getNBackParams(9);
    expect(anchor.n).toBe(3);
    const warm = sampleCurve({ target: 9, t: 0, kind: 'warmup-plateau-surge' });
    const late = sampleCurve({ target: 9, t: 1, kind: 'warmup-plateau-surge' });
    const warmMs = shiftDeadline(anchor.delayMs, warm.offset);
    const lateMs = shiftDeadline(anchor.delayMs, late.offset);
    expect(warm.offset).toBeLessThan(0);
    expect(warmMs).toBeGreaterThan(anchor.delayMs);
    expect(lateMs).toBeLessThan(anchor.delayMs);
    expect(getNBackParams(warm.difficulty).n).not.toBe(3);
  });

  test('grid-memory can hold grid size while cells warmup', () => {
    const anchor = getGridMemoryParams(8);
    const { params } = paramsAlongCurve(getGridMemoryParams, {
      target: 8,
      index: 0,
      count: 5,
      kind: 'warmup-plateau',
      hold: { grid: anchor.grid }
    });
    expect(params.grid).toBe(anchor.grid);
    expect(params.cells).toBeLessThanOrEqual(anchor.cells);
  });
});

describe('G19 does not rewrite Adaptive Engine v2 or the staircase', () => {
  test('updateExerciseState still uses block accuracy, not the surge peak', () => {
    const state = {
      exerciseId: 'stroop',
      level: 8,
      difficulty: 8,
      performance: 700,
      lastPlayedAt: '',
      lastAccuracy: 0.8
    };
    const next = updateExerciseState(state, 0.96, 900, 1500, 900);
    expect(next.difficulty).toBeGreaterThan(8);
    expect(next.difficulty).toBeLessThan(9);
    expect(next.exerciseId).toBe('stroop');
  });

  test('selectDifficulty still blends θ with stored rating (rng 0.5)', () => {
    const model = createAbilityModel(Date.parse('2026-09-11T12:00:00.000Z'));
    const item: CatalogItem = {
      id: 'stroop',
      domain: 'flexibility',
      skills: ['inhibition'],
      metricModel: 'speed-accuracy',
      maxLevel: 20
    };
    const pick = selectDifficulty({
      model,
      item,
      storedDifficulty: 6,
      rng: () => 0.5
    });
    expect(pick.exerciseId).toBe('stroop');
    expect(pick.difficulty).toBeGreaterThanOrEqual(1);
    expect(pick.difficulty).toBeLessThanOrEqual(30);
    expect(pick.pSuccess).toBeGreaterThan(0);
    expect(pick.pSuccess).toBeLessThan(1);
  });

  test('catalogFromManifests still ignores diffCurve (maxLevel from levels only)', () => {
    const items = catalogFromManifests([
      {
        manifest: {
          id: 'demo',
          name: 'Demo',
          domain: 'attention',
          skills: ['inhibition'],
          instruction: 'x',
          metricModel: 'speed-accuracy',
          diffCurve: 'warmup-plateau-surge',
          levels: { 1: {}, 12: {} }
        }
      }
    ]);
    expect(items).toEqual([
      {
        id: 'demo',
        domain: 'attention',
        skills: ['inhibition'],
        metricModel: 'speed-accuracy',
        maxLevel: 12
      }
    ]);
  });

  test('wired catalog metadata does not require registry.ts edits', () => {
    expect(getManifest('stroop')?.diffCurve).toBe('warmup-plateau-surge');
    expect(getManifest('switch-rule')?.diffCurve).toBe('warmup-plateau-surge');
    expect(getManifest('posner')?.diffCurve).toBe('warmup-plateau-surge');
    expect(getManifest('grid-memory')?.diffCurve).toBe('warmup-plateau');
    expect(getManifest('n-back')?.diffCurve).toBe('warmup-plateau-surge');
    expect(getManifest('odd-one')?.diffCurve).toBeUndefined();
  });
});
