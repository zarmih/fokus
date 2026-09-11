import { describe, expect, test } from 'vitest';
import {
  applyObservation,
  bootstrapAbilityModel,
  buildAdaptivePlan,
  classifySlot,
  composeRitual,
  confidencePct,
  createAbilityModel,
  domainDrift,
  evaluateRecalibration,
  fisher2pl,
  getDomain,
  impliedTheta,
  logit,
  observeBlock,
  scheduleAfter,
  selectDifficulty,
  slotMix,
  targetBlockCount,
  targetSuccessProb,
  twoPl
} from '../src/core/engine';
import { getSpacing } from '../src/core/engine/scheduler';
import type { AbilityModel, CatalogItem, Observation } from '../src/core/engine/types';
import type { DomainIndex, ExerciseState, SkillIndex } from '../src/core/types';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');
const rng = () => 0.99;

const catalog: CatalogItem[] = [
  { id: 'mem-a', domain: 'memory', skills: ['working_memory'], metricModel: 'memory-span', maxLevel: 20 },
  { id: 'mem-b', domain: 'memory', skills: ['visual_memory'], metricModel: 'memory-span', maxLevel: 20 },
  { id: 'att-a', domain: 'attention', skills: ['selective_attention'], metricModel: 'speed-accuracy', maxLevel: 20 },
  { id: 'att-b', domain: 'attention', skills: ['inhibition'], metricModel: 'speed-accuracy', maxLevel: 20 },
  { id: 'log-a', domain: 'logic', skills: ['logical_reasoning'], metricModel: 'logic-correctness', maxLevel: 20 },
  { id: 'log-b', domain: 'logic', skills: ['pattern_recognition'], metricModel: 'logic-correctness', maxLevel: 20 },
  { id: 'spd-a', domain: 'speed', skills: ['reaction_speed'], metricModel: 'speed-accuracy', maxLevel: 20 },
  { id: 'spd-b', domain: 'speed', skills: ['processing_speed'], metricModel: 'speed-accuracy', maxLevel: 20 },
  { id: 'flx-a', domain: 'flexibility', skills: ['task_switching'], metricModel: 'speed-accuracy', maxLevel: 20 },
  { id: 'flx-b', domain: 'flexibility', skills: ['rule_switching'], metricModel: 'speed-accuracy', maxLevel: 20 }
];

function obs(partial: Partial<Observation> & { exerciseId: string; domain: Observation['domain'] }): Observation {
  const item = catalog.find((c) => c.id === partial.exerciseId);
  return {
    skills: item?.skills || [],
    metricModel: item?.metricModel || 'speed-accuracy',
    difficulty: 6,
    accuracy: 0.8,
    avgRtMs: 1200,
    targetMs: 1500,
    performance: 700,
    ...partial
  };
}

describe('IRT primitives', () => {
  test('2PL is 0.5 when ability equals difficulty', () => {
    expect(twoPl(8, 8, 1)).toBeCloseTo(0.5, 5);
  });

  test('2PL rises with ability and Fisher info peaks near P=0.5', () => {
    expect(twoPl(10, 8, 1.2)).toBeGreaterThan(twoPl(8, 8, 1.2));
    const peak = fisher2pl(8, 8, 1.2);
    const off = fisher2pl(12, 8, 1.2);
    expect(peak).toBeGreaterThan(off);
  });

  test('implied theta equals difficulty at 50% accuracy (no RT shift for memory-span)', () => {
    const theta = impliedTheta(obs({
      exerciseId: 'mem-a',
      domain: 'memory',
      difficulty: 7,
      accuracy: 0.5,
      metricModel: 'memory-span'
    }));
    expect(theta).toBeCloseTo(7, 1);
  });

  test('high accuracy implies ability above the item, low accuracy below', () => {
    const high = impliedTheta(obs({
      exerciseId: 'mem-a',
      domain: 'memory',
      difficulty: 7,
      accuracy: 0.92,
      metricModel: 'memory-span'
    }));
    const low = impliedTheta(obs({
      exerciseId: 'mem-a',
      domain: 'memory',
      difficulty: 7,
      accuracy: 0.3,
      metricModel: 'memory-span'
    }));
    expect(high).toBeGreaterThan(7);
    expect(low).toBeLessThan(7);
    expect(logit(0.72)).toBeGreaterThan(0);
  });
});

describe('EWMA / Bayesian-lite ability model', () => {
  test('createAbilityModel seeds five domains with a wide prior', () => {
    const model = createAbilityModel(NOW);
    expect(model.domains).toHaveLength(5);
    expect(model.domains.map((d) => d.domain).sort()).toEqual(
      ['attention', 'flexibility', 'logic', 'memory', 'speed'].sort()
    );
    model.domains.forEach((d) => {
      expect(d.precision).toBeLessThan(1);
      expect(d.observations).toBe(0);
    });
  });

  test('observeBlock moves theta toward the implied ability and raises precision', () => {
    let model = createAbilityModel(NOW);
    const before = getDomain(model, 'memory');
    model = observeBlock(
      model,
      obs({
        exerciseId: 'mem-a',
        domain: 'memory',
        difficulty: 10,
        accuracy: 0.9,
        metricModel: 'memory-span',
        performance: 900
      }),
      NOW
    );
    const after = getDomain(model, 'memory');
    expect(after.theta).toBeGreaterThan(before.theta);
    expect(after.precision).toBeGreaterThan(before.precision);
    expect(after.observations).toBe(1);
    expect(after.sources).toContain('mem-a');
    expect(after.formEwma).toBeGreaterThan(before.formEwma);
  });

  test('form EWMA moves faster than base EWMA', () => {
    let model = createAbilityModel(NOW);
    for (let i = 0; i < 4; i++) {
      model = observeBlock(
        model,
        obs({
          exerciseId: 'att-a',
          domain: 'attention',
          difficulty: 8,
          accuracy: 0.95,
          performance: 1100
        }),
        NOW + i * 86400000
      );
    }
    const d = getDomain(model, 'attention');
    expect(d.formEwma).toBeGreaterThan(d.baseEwma);
    expect(domainDrift(d)).toBeGreaterThan(0);
  });

  test('confidence is asymptotic and diversity-capped', () => {
    let model = createAbilityModel(NOW);
    for (let i = 0; i < 12; i++) {
      model = observeBlock(
        model,
        obs({ exerciseId: 'log-a', domain: 'logic', accuracy: 0.8, performance: 700 }),
        NOW + i * 3600000
      );
    }
    const oneSrc = confidencePct(getDomain(model, 'logic').precision, 1);
    expect(oneSrc).toBeGreaterThan(20);
    expect(oneSrc).toBeLessThanOrEqual(72);

    model = observeBlock(
      model,
      obs({ exerciseId: 'log-b', domain: 'logic', accuracy: 0.8, performance: 700 }),
      NOW + 20 * 3600000
    );
    const twoSrc = confidencePct(getDomain(model, 'logic').precision, 2);
    expect(twoSrc).toBeGreaterThan(oneSrc);
  });

  test('bootstrap from existing indexes does not require a fresh calibration', () => {
    const domains: DomainIndex[] = [
      { domain: 'memory', value: 200, updatedAt: new Date(NOW).toISOString() },
      { domain: 'speed', value: 900, updatedAt: new Date(NOW).toISOString() }
    ];
    const skills: SkillIndex[] = [
      {
        skill: 'working_memory',
        value: 220,
        trend: 0,
        confidence: 40,
        attempts: 4,
        lastUpdated: new Date(NOW).toISOString(),
        sources: ['mem-a']
      }
    ];
    const states: ExerciseState[] = [
      {
        exerciseId: 'mem-a',
        level: 3,
        difficulty: 3,
        performance: 200,
        lastPlayedAt: new Date(NOW - 3 * 86400000).toISOString(),
        lastAccuracy: 0.5,
        attempts: 4
      }
    ];
    const model = bootstrapAbilityModel({ domains, skills, states, catalog, nowMs: NOW });
    expect(getDomain(model, 'memory').theta).toBeLessThan(getDomain(model, 'speed').theta);
    expect(model.spacing.some((s) => s.exerciseId === 'mem-a')).toBe(true);
  });
});

describe('IRT difficulty selection', () => {
  test('higher domain theta yields a harder pick', () => {
    const weak = createAbilityModel(NOW);
    let strong = createAbilityModel(NOW);
    for (let i = 0; i < 8; i++) {
      strong = observeBlock(
        strong,
        obs({
          exerciseId: 'mem-a',
          domain: 'memory',
          difficulty: 14,
          accuracy: 0.92,
          metricModel: 'memory-span',
          performance: 1200
        }),
        NOW + i * 86400000
      );
    }
    const item = catalog[0];
    const a = selectDifficulty({ model: weak, item, storedDifficulty: 5, rng: () => 0.5 });
    const b = selectDifficulty({ model: strong, item, storedDifficulty: 5, rng: () => 0.5 });
    expect(b.difficulty).toBeGreaterThan(a.difficulty);
    expect(a.pSuccess).toBeGreaterThan(0.4);
    expect(a.pSuccess).toBeLessThan(0.95);
  });

  test('low confidence raises target P (gentler challenge zone)', () => {
    const fresh = createAbilityModel(NOW);
    let mature = createAbilityModel(NOW);
    for (let i = 0; i < 10; i++) {
      mature = observeBlock(
        mature,
        obs({
          exerciseId: 'att-a',
          domain: 'attention',
          difficulty: 6,
          accuracy: 0.75,
          performance: 650
        }),
        NOW + i * 86400000
      );
    }
    expect(targetSuccessProb(fresh, 'attention')).toBeGreaterThan(targetSuccessProb(mature, 'attention'));
  });

  test('difficulty step is bounded versus stored rating', () => {
    const model = createAbilityModel(NOW);
    const pick = selectDifficulty({
      model,
      item: catalog[0],
      storedDifficulty: 4,
      rng: () => 0.5
    });
    expect(Math.abs(pick.difficulty - 4)).toBeLessThanOrEqual(2.01);
  });
});

describe('spaced practice scheduler', () => {
  test('never-played cards are fresh; late cards are overdue; on-window cards are due', () => {
    const model = createAbilityModel(NOW);
    expect(classifySlot(getSpacing(model, 'mem-a'), NOW)).toBe('fresh');

    const overdue = {
      exerciseId: 'mem-a',
      intervalDays: 1,
      ease: 2.1,
      lastPlayedAt: new Date(NOW - 5 * 86400000).toISOString(),
      dueAt: new Date(NOW - 2 * 86400000).toISOString(),
      repetitions: 3
    };
    expect(classifySlot(overdue, NOW)).toBe('overdue');

    const due = {
      ...overdue,
      dueAt: new Date(NOW - 2 * 3600000).toISOString()
    };
    expect(classifySlot(due, NOW)).toBe('due');
  });

  test('successful reviews grow the interval; failures shrink it', () => {
    const base = {
      exerciseId: 'att-a',
      intervalDays: 1,
      ease: 2.1,
      lastPlayedAt: new Date(NOW - 86400000).toISOString(),
      dueAt: new Date(NOW).toISOString(),
      repetitions: 2
    };
    const win = scheduleAfter(base, 0.95, NOW);
    const lose = scheduleAfter(base, 0.4, NOW);
    expect(win.intervalDays).toBeGreaterThan(base.intervalDays);
    expect(lose.intervalDays).toBeLessThan(base.intervalDays);
    expect(win.dueAt).not.toBeNull();
  });

  test('15-minute ritual requests 5 blocks with overdue/due/fresh mix', () => {
    expect(targetBlockCount(900)).toBe(5);
    expect(targetBlockCount(300)).toBe(3);
    expect(slotMix(5)).toEqual(['overdue', 'overdue', 'due', 'due', 'fresh']);
    expect(slotMix(3)).toEqual(['overdue', 'due', 'fresh']);
  });
});

describe('ritual composer', () => {
  test('composes a unique, domain-diverse plan for a 15m ritual', () => {
    const model = seededModel();
    const plan = composeRitual({
      model,
      catalog,
      states: [],
      durationSec: 900,
      primaryGoal: 'memory',
      nowMs: NOW,
      rng
    });
    expect(plan.items.length).toBe(5);
    const ids = plan.items.map((i) => i.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(plan.focusDomains).toContain('memory');
    const domainCounts = plan.items.reduce((acc, it) => {
      acc[it.domain] = (acc[it.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.values(domainCounts).forEach((n) => expect(n).toBeLessThan(3));
    expect(plan.items.some((i) => i.slot === 'fresh' || i.reason.length > 0)).toBe(true);
  });

  test('excludeIds are never selected', () => {
    const model = seededModel();
    const plan = composeRitual({
      model,
      catalog,
      states: [],
      durationSec: 300,
      nowMs: NOW,
      excludeIds: ['mem-a', 'mem-b'],
      rng
    });
    expect(plan.items.every((i) => i.exerciseId !== 'mem-a' && i.exerciseId !== 'mem-b')).toBe(true);
  });

  test('empty catalog yields an empty plan', () => {
    const plan = composeRitual({
      model: createAbilityModel(NOW),
      catalog: [],
      states: [],
      durationSec: 900,
      nowMs: NOW,
      rng
    });
    expect(plan.items).toHaveLength(0);
  });
});

describe('soft recalibration', () => {
  test('stale trigger after 14 days', () => {
    let model = createAbilityModel(NOW - 15 * 86400000, new Date(NOW - 15 * 86400000).toISOString());
    for (let i = 0; i < 6; i++) {
      model = observeBlock(
        model,
        obs({ exerciseId: 'spd-a', domain: 'speed', accuracy: 0.8, performance: 700 }),
        NOW - (10 - i) * 86400000
      );
    }
    const decision = evaluateRecalibration({ model, catalog, nowMs: NOW });
    expect(decision.reasons).toContain('stale');
    expect(decision.needed).toBe(true);
    expect(decision.probe.length).toBeGreaterThan(0);
    expect(decision.probe.length).toBeLessThanOrEqual(3);
  });

  test('drift trigger when form diverges from base on two domains', () => {
    let model = createAbilityModel(NOW, new Date(NOW - 3 * 86400000).toISOString());
    ['memory', 'attention', 'logic', 'speed', 'flexibility'].forEach((domain, di) => {
      for (let i = 0; i < 8; i++) {
        const hot = domain === 'memory' || domain === 'logic';
        model = observeBlock(
          model,
          obs({
            exerciseId: catalog[di * 2].id,
            domain: domain as Observation['domain'],
            difficulty: hot ? 12 : 6,
            accuracy: hot ? 0.95 : 0.72,
            performance: hot ? 1300 : 600
          }),
          NOW - (8 - i) * 86400000
        );
      }
    });
    const decision = evaluateRecalibration({ model, catalog, nowMs: NOW });
    expect(decision.reasons).toContain('drift');
  });

  test('snooze suppresses the UI without clearing the need', () => {
    const model = createAbilityModel(NOW - 20 * 86400000, new Date(NOW - 20 * 86400000).toISOString());
    const snoozed = evaluateRecalibration({
      model,
      catalog,
      nowMs: NOW,
      snoozedUntil: new Date(NOW + 2 * 86400000).toISOString()
    });
    expect(snoozed.needed).toBe(true);
    expect(snoozed.snoozed).toBe(true);
  });
});

describe('bridge + fallback', () => {
  test('buildAdaptivePlan returns an engine plan for a healthy catalog', () => {
    const plan = buildAdaptivePlan({
      durationSec: 300,
      catalog: catalog.map((c) => ({
        manifest: { id: c.id, name: c.id, domain: c.domain, skills: c.skills as any, instruction: '' }
      })),
      domains: [],
      skills: [],
      states: [],
      nowMs: NOW,
      rng
    });
    expect(plan.source).toBe('engine');
    expect(plan.items.length).toBe(3);
    expect(plan.items[0].difficulty).toBeGreaterThan(0);
  });

  test('empty catalog falls back to the legacy builder', () => {
    const plan = buildAdaptivePlan(
      {
        durationSec: 300,
        catalog: [],
        domains: [],
        skills: [],
        states: []
      },
      () => ({
        focusDomains: ['memory'],
        items: [{ exerciseId: 'legacy-1', reason: 'fallback' }]
      })
    );
    expect(plan.source).toBe('legacy');
    expect(plan.items[0].exerciseId).toBe('legacy-1');
  });

  test('applyObservation writes spacing and optional calibration stamp', () => {
    const model = createAbilityModel(NOW);
    const next = applyObservation(
      model,
      obs({ exerciseId: 'flx-a', domain: 'flexibility', probe: true, accuracy: 0.8 }),
      NOW
    );
    expect(next.spacing.some((s) => s.exerciseId === 'flx-a')).toBe(true);
    expect(next.lastCalibrationAt).toBe(new Date(NOW).toISOString());
  });
});

function seededModel(): AbilityModel {
  let model = createAbilityModel(NOW - 10 * 86400000, new Date(NOW - 10 * 86400000).toISOString());
  const plays: Array<[string, Observation['domain'], number]> = [
    ['mem-a', 'memory', 0.45],
    ['att-a', 'attention', 0.8],
    ['log-a', 'logic', 0.7],
    ['spd-a', 'speed', 0.85],
    ['flx-a', 'flexibility', 0.6]
  ];
  plays.forEach(([id, domain, acc], i) => {
    model = applyObservation(
      model,
      obs({
        exerciseId: id,
        domain,
        accuracy: acc,
        performance: acc * 900,
        difficulty: 5
      }),
      NOW - (9 - i) * 86400000
    );
  });
  return model;
}
