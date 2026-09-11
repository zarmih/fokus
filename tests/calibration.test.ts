import { expect, test, describe } from 'vitest';
import {
  mapAccuracyToStartLevel,
  updateAbility,
  thetaToStartLevel,
  thetaToPerformance,
  estimateDomainAbilities,
  planProbeBlocks,
  decideNextProbeStep,
  bootstrapFromProbe,
  calibrationSessionItems,
  seedStatesFromSnapshot,
  precisionLabel,
  PROBE_MIN_BLOCKS,
  PROBE_MAX_BLOCKS,
  PROBE_BUDGET_SEC,
  PROBE_BLOCK_SEC,
  domainOrder
} from '../src/core/calibration';
import { initializeExerciseStateFromCalibration, initializeSkillFromCalibration } from '../src/core/adaptive';
import type { ProbeCatalogItem, ProbeOutcome } from '../src/core/calibration';

const CATALOG: ProbeCatalogItem[] = [
  { id: 'grid-memory', domain: 'memory', skills: ['visual_memory'] },
  { id: 'odd-one', domain: 'attention', skills: ['selective_attention'] },
  { id: 'pattern-next', domain: 'logic', skills: ['pattern_recognition'] },
  { id: 'reaction-strike', domain: 'speed', skills: ['reaction_speed'] },
  { id: 'stroop', domain: 'flexibility', skills: ['inhibition'] },
  { id: 'pulley', domain: 'logic', skills: ['logical_reasoning'] }
];

test('mapAccuracyToStartLevel', () => {
  expect(mapAccuracyToStartLevel(0.9)).toBe(5);
  expect(mapAccuracyToStartLevel(0.8)).toBe(5);
  expect(mapAccuracyToStartLevel(0.6)).toBe(3.0);
  expect(mapAccuracyToStartLevel(0.5)).toBe(3.0);
  expect(mapAccuracyToStartLevel(0.4)).toBe(1.5);
  expect(mapAccuracyToStartLevel(0)).toBe(1.5);
});

describe('Calibration Initialization', () => {
  test('initializeExerciseStateFromCalibration returns canonical state with dampening', () => {
    const state = initializeExerciseStateFromCalibration('test-ex', 3, 600);
    expect(state.exerciseId).toBe('test-ex');
    expect(state.level).toBe(3);
    expect(state.difficulty).toBe(3);
    expect(state.performance).toBe(600);
    expect(state.attempts).toBe(1);
    expect(state.stability).toBe(0.5);
    expect(state.consecutivePlateau).toBe(0);
    expect(state.mastery).toBeGreaterThan(0);
    expect(state.mastery).toBeLessThan(10); // Dampened by 0.1 for calibration (0.5 * 0.4 * 100 * 0.1 = 2)
  });

  test('initializeSkillFromCalibration returns canonical skill with sources and low confidence', () => {
    const skill = initializeSkillFromCalibration('test-skill', 500, 'test-ex');
    expect(skill.skill).toBe('test-skill');
    expect(skill.value).toBe(500);
    expect(skill.trend).toBe(0);
    expect(skill.attempts).toBe(1);
    expect(skill.confidence).toBe(15); // Calibration is low confidence
    expect(skill.sources).toEqual(['test-ex']);
  });
});

describe('Ability θ model', () => {
  test('high accuracy raises theta, low accuracy lowers it', () => {
    const prior = { theta: 0, precision: 1 };
    const up = updateAbility(prior, { accuracy: 0.95, rounds: 10, difficulty: 3 });
    const down = updateAbility(prior, { accuracy: 0.2, rounds: 10, difficulty: 3 });
    expect(up.theta).toBeGreaterThan(0);
    expect(down.theta).toBeLessThan(0);
    expect(up.precision).toBeGreaterThan(prior.precision);
    expect(down.precision).toBeGreaterThan(prior.precision);
  });

  test('precision increases with more observations and se shrinks', () => {
    let cur = { theta: 0, precision: 1, se: 1 };
    for (let i = 0; i < 4; i++) {
      cur = updateAbility(cur, { accuracy: 0.7, rounds: 8, difficulty: 3 });
    }
    expect(cur.precision).toBeGreaterThan(2);
    expect(cur.se).toBeLessThan(1);
  });

  test('start level stays in a gentle band and is not an IQ score', () => {
    expect(thetaToStartLevel(-3)).toBe(1.5);
    expect(thetaToStartLevel(0)).toBe(3);
    expect(thetaToStartLevel(3)).toBe(8);
    expect(thetaToPerformance(0)).toBe(500);
    expect(precisionLabel(1)).toMatch(/мало данных|черновик/);
  });

  test('unprobed domains keep the prior and probed ones bootstrap from outcomes', () => {
    const outcomes: ProbeOutcome[] = [
      { exerciseId: 'grid-memory', domain: 'memory', accuracy: 0.9, avgRtMs: 700, difficulty: 3, rounds: 8 },
      { exerciseId: 'odd-one', domain: 'attention', accuracy: 0.4, avgRtMs: 1400, difficulty: 3, rounds: 8 }
    ];
    const abilities = estimateDomainAbilities(outcomes);
    const memory = abilities.find((d) => d.domain === 'memory')!;
    const speed = abilities.find((d) => d.domain === 'speed')!;
    expect(memory.probed).toBe(true);
    expect(memory.theta).toBeGreaterThan(0);
    expect(speed.probed).toBe(false);
    expect(speed.theta).toBe(0);
    expect(speed.precision).toBe(1);
  });
});

describe('Adaptive probe planner', () => {
  test('plans 3 short blocks that include the goal domain and stay inside 60–90s', () => {
    const plan = planProbeBlocks({ primaryGoal: 'memory', catalog: CATALOG });
    expect(plan.items.length).toBe(PROBE_MIN_BLOCKS);
    expect(plan.items.length).toBeLessThanOrEqual(PROBE_MAX_BLOCKS);
    expect(plan.domains).toContain('memory');
    expect(new Set(plan.domains).size).toBe(plan.items.length);
    expect(plan.items.length * plan.blockSec).toBeGreaterThanOrEqual(PROBE_BUDGET_SEC - 40);
    expect(plan.items.length * plan.blockSec).toBeLessThanOrEqual(PROBE_BUDGET_SEC);
    expect(plan.items[0].exerciseId).toBe('grid-memory');
  });

  test('domain order puts the goal first', () => {
    expect(domainOrder('logic')[0]).toBe('logic');
    expect(domainOrder('balance')[0]).toBe('attention');
  });

  test('falls back when the catalog is missing a domain', () => {
    const thin: ProbeCatalogItem[] = [
      { id: 'grid-memory', domain: 'memory' },
      { id: 'odd-one', domain: 'attention' },
      { id: 'stroop', domain: 'flexibility' }
    ];
    const plan = planProbeBlocks({ primaryGoal: 'speed', catalog: thin });
    expect(plan.items.length).toBeGreaterThanOrEqual(2);
    expect(plan.items.every((i) => thin.some((c) => c.id === i.exerciseId))).toBe(true);
  });

  test('after 3 blocks a 4th uncovered domain is offered if budget remains', () => {
    const first = planProbeBlocks({ primaryGoal: 'memory', catalog: CATALOG }).items;
    const outcomes: ProbeOutcome[] = first.map((b) => ({
      exerciseId: b.exerciseId,
      domain: b.domain,
      accuracy: 0.55,
      avgRtMs: 900,
      difficulty: 3,
      rounds: 8
    }));
    const fourth = decideNextProbeStep({
      outcomes,
      primaryGoal: 'memory',
      catalog: CATALOG,
      budgetSec: PROBE_BUDGET_SEC,
      blockSec: PROBE_BLOCK_SEC
    });
    expect(fourth).toBeTruthy();
    expect(first.some((b) => b.exerciseId === fourth!.exerciseId)).toBe(false);
  });

  test('stops at 4 when performance is unsurprising and goal is focused', () => {
    const order = ['grid-memory', 'odd-one', 'pattern-next', 'stroop'];
    const domains = ['memory', 'attention', 'logic', 'flexibility'];
    const outcomes: ProbeOutcome[] = order.map((id, i) => ({
      exerciseId: id,
      domain: domains[i],
      accuracy: 0.55,
      avgRtMs: 900,
      difficulty: 3,
      rounds: 8
    }));
    const fifth = decideNextProbeStep({
      outcomes,
      primaryGoal: 'memory',
      catalog: CATALOG,
      budgetSec: PROBE_BUDGET_SEC,
      blockSec: PROBE_BLOCK_SEC
    });
    expect(fifth).toBeNull();
  });

  test('adds a 5th block when theta is surprising or the goal is balance', () => {
    const order = ['grid-memory', 'odd-one', 'pattern-next', 'stroop'];
    const domains = ['memory', 'attention', 'logic', 'flexibility'];
    const surprise: ProbeOutcome[] = order.map((id, i) => ({
      exerciseId: id,
      domain: domains[i],
      accuracy: 0.05,
      avgRtMs: 1800,
      difficulty: 3,
      rounds: 12
    }));
    const fifthSurprise = decideNextProbeStep({
      outcomes: surprise,
      primaryGoal: 'memory',
      catalog: CATALOG
    });
    expect(fifthSurprise?.domain).toBe('speed');

    const mild: ProbeOutcome[] = order.map((id, i) => ({
      exerciseId: id,
      domain: domains[i],
      accuracy: 0.55,
      avgRtMs: 900,
      difficulty: 3,
      rounds: 8
    }));
    const fifthBalance = decideNextProbeStep({
      outcomes: mild,
      primaryGoal: 'balance',
      catalog: CATALOG
    });
    expect(fifthBalance?.domain).toBe('speed');
  });

  test('never exceeds 5 blocks or a 60s budget after 3×18s', () => {
    const outcomes: ProbeOutcome[] = [
      { exerciseId: 'grid-memory', domain: 'memory', accuracy: 0.5, avgRtMs: 800, difficulty: 3 },
      { exerciseId: 'odd-one', domain: 'attention', accuracy: 0.5, avgRtMs: 800, difficulty: 3 },
      { exerciseId: 'stroop', domain: 'flexibility', accuracy: 0.5, avgRtMs: 800, difficulty: 3 }
    ];
    const next = decideNextProbeStep({
      outcomes,
      catalog: CATALOG,
      budgetSec: 60,
      blockSec: 18
    });
    expect(next).toBeNull();

    const five = [...outcomes, ...outcomes.slice(0, 2).map((o, i) => ({
      ...o,
      exerciseId: o.exerciseId + '-' + i,
      domain: i === 0 ? 'logic' : 'speed'
    }))];
    expect(five.length).toBe(5);
    expect(decideNextProbeStep({ outcomes: five as ProbeOutcome[], catalog: CATALOG })).toBeNull();
  });

  test('calibrationSessionItems always returns something runnable', () => {
    const items = calibrationSessionItems({ primaryGoal: 'logic', catalog: CATALOG });
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0].exerciseId).toBeTruthy();
  });
});

describe('Bootstrap snapshot', () => {
  test('builds a not-iq snapshot and seeds states without inventing high confidence', () => {
    const outcomes: ProbeOutcome[] = [
      { exerciseId: 'grid-memory', domain: 'memory', accuracy: 0.85, avgRtMs: 600, difficulty: 3, rounds: 8, skills: ['visual_memory'] },
      { exerciseId: 'odd-one', domain: 'attention', accuracy: 0.5, avgRtMs: 1100, difficulty: 3, rounds: 8, skills: ['selective_attention'] },
      { exerciseId: 'stroop', domain: 'flexibility', accuracy: 0.3, avgRtMs: 1400, difficulty: 3, rounds: 8, skills: ['inhibition'] }
    ];
    const snap = bootstrapFromProbe(outcomes, { now: '2026-09-11T10:00:00.000Z', durationSec: 54 });
    expect(snap.disclaimer).toBe('not-iq');
    expect(snap.durationSec).toBe(54);
    expect(snap.domains).toHaveLength(5);
    expect(snap.overallTheta).not.toBeGreaterThan(3);
    expect(JSON.stringify(snap)).not.toMatch(/коэффициент интеллекта|IQ-тест|ваш IQ/i);

    const seeded = seedStatesFromSnapshot(snap, CATALOG);
    expect(seeded.domains.some((d) => d.domain === 'memory')).toBe(true);
    expect(seeded.exerciseStates.find((s) => s.exerciseId === 'grid-memory')!.difficulty).toBeGreaterThanOrEqual(1.5);
    expect(seeded.skills[0].confidence).toBeLessThanOrEqual(20);
  });
});
