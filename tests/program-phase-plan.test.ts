import { describe, it, expect } from 'vitest';
import { buildTrainingPlan } from '../src/core/session-builder';
import { buildAdaptivePlan } from '../src/core/engine/bridge';
import type { DomainIndex, ExerciseState, SkillIndex } from '../src/core/types';

describe('Program phase training plan effects', () => {
  const catalog = [
    { manifest: { id: 'ex-goal', domain: 'memory', skills: ['m1'] } },
    { manifest: { id: 'ex-weak', domain: 'logic', skills: ['l1'] } },
    { manifest: { id: 'ex-other', domain: 'attention', skills: ['a1'] } },
    { manifest: { id: 'ex-played', domain: 'speed', skills: ['s1'] } },
    { manifest: { id: 'ex-unplayed', domain: 'speed', skills: ['s2'] } }
  ] as any[];

  // primaryGoal = 'memory' (ex-goal)
  // weakest = 'logic' (ex-weak)
  const domains: DomainIndex[] = [
    { domain: 'logic', value: 300, updatedAt: new Date().toISOString() },
    { domain: 'attention', value: 400, updatedAt: new Date().toISOString() },
    { domain: 'speed', value: 500, updatedAt: new Date().toISOString() },
    { domain: 'memory', value: 600, updatedAt: new Date().toISOString() }
  ];

  const skills: SkillIndex[] = [];

  const states: ExerciseState[] = [
    { exerciseId: 'ex-goal', lastPlayedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), level: 1, difficulty: 3, performance: 80, lastAccuracy: 80 },
    { exerciseId: 'ex-weak', lastPlayedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), level: 1, difficulty: 3, performance: 80, lastAccuracy: 80 },
    { exerciseId: 'ex-other', lastPlayedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), level: 1, difficulty: 3, performance: 80, lastAccuracy: 80 },
    { exerciseId: 'ex-played', lastPlayedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), level: 1, difficulty: 3, performance: 80, lastAccuracy: 80 },
    // ex-unplayed has no state
    // add dummy states so length >= 9 to avoid isSparse
    { exerciseId: 'dummy1', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'dummy2', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'dummy3', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'dummy4', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'dummy5', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    // dummy items in catalog so they are counted as domain states
    { exerciseId: 'l2', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'l3', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'm2', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'm3', lastPlayedAt: new Date().toISOString(), level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 }
  ];

  // Add dummy catalog items so domain states match
  catalog.push(
    { manifest: { id: 'l2', domain: 'logic', skills: [] } },
    { manifest: { id: 'l3', domain: 'logic', skills: [] } },
    { manifest: { id: 'm2', domain: 'memory', skills: [] } },
    { manifest: { id: 'm3', domain: 'memory', skills: [] } }
  );

  const baseParams = {
    durationSec: 900, // 5 blocks requested
    catalog,
    domains,
    skills,
    states,
    primaryGoal: 'memory'
  };

  it('orient has fewer items than balance/focus/sustain for durationSec 900', () => {
    const orientPlan = buildTrainingPlan({ ...baseParams, programPhase: 'orient' });
    const balancePlan = buildTrainingPlan({ ...baseParams, programPhase: 'balance' });
    const sustainPlan = buildTrainingPlan({ ...baseParams, programPhase: 'sustain' });

    expect(orientPlan.items.length).toBeLessThan(balancePlan.items.length);
    expect(orientPlan.items.length).toBeLessThan(sustainPlan.items.length);
    expect(orientPlan.items.length).toBeLessThanOrEqual(3);
    expect(balancePlan.items.length).toBe(5);
  });

  it('orient ranks a previously played exercise above a never-played one when other factors are equal', () => {
    // Pass a catalog of only the two speed exercises so they are both included, and we can check their order.
    const customCatalog = [
      { manifest: { id: 'ex-played', domain: 'speed', skills: ['s1'] } },
      { manifest: { id: 'ex-unplayed', domain: 'speed', skills: ['s2'] } }
    ] as any[];

    const plan = buildTrainingPlan({ 
      ...baseParams, 
      programPhase: 'orient',
      catalog: customCatalog 
    });
    const playedIdx = plan.items.findIndex(i => i.exerciseId === 'ex-played');
    const unplayedIdx = plan.items.findIndex(i => i.exerciseId === 'ex-unplayed');
    
    expect(playedIdx).not.toBe(-1);
    expect(unplayedIdx).not.toBe(-1);
    expect(playedIdx).toBeLessThan(unplayedIdx);
  });

  it('balance first item is the weak domain; focus first item is the goal domain', () => {
    const balancePlan = buildTrainingPlan({ ...baseParams, programPhase: 'balance' });
    const focusPlan = buildTrainingPlan({ ...baseParams, programPhase: 'focus' });

    expect(balancePlan.items[0].domain).toBe('logic'); // weakest
    expect(focusPlan.items[0].domain).toBe('memory'); // primary goal
  });

  it('sustain + fatigueOrChurn has fewer items than sustain without the flag (durationSec 900)', () => {
    const normalSustain = buildTrainingPlan({ ...baseParams, programPhase: 'sustain' });
    const fatiguedSustain = buildTrainingPlan({ ...baseParams, programPhase: 'sustain', fatigueOrChurn: true });

    expect(fatiguedSustain.items.length).toBeLessThan(normalSustain.items.length);
    expect(fatiguedSustain.items.length).toBeLessThanOrEqual(2);
    expect(normalSustain.items.length).toBe(5);
  });

  it('omitting programPhase but setting programWeek resolves correctly', () => {
    // week 5 is focus (goal domain first)
    const week5Plan = buildTrainingPlan({ ...baseParams, programWeek: 5 });
    expect(week5Plan.items[0].domain).toBe('memory'); // goal

    // week 3 is balance (weak domain first)
    const week3Plan = buildTrainingPlan({ ...baseParams, programWeek: 3 });
    expect(week3Plan.items[0].domain).toBe('logic'); // weakest
  });

  it('engine path (buildAdaptivePlan) respects phase ordering (focus vs balance)', () => {
    // Engine model setup
    // primaryGoal: memory
    // weakest: logic (lower theta is weaker)
    const engineDomains = [
      { domain: 'logic', value: 300, updatedAt: new Date().toISOString() },
      { domain: 'memory', value: 600, updatedAt: new Date().toISOString() },
      { domain: 'attention', value: 500, updatedAt: new Date().toISOString() }
    ];

    const engineParams = {
      durationSec: 900,
      catalog: [
        { manifest: { id: 'ex-goal', domain: 'memory', skills: [] } },
        { manifest: { id: 'ex-weak', domain: 'logic', skills: [] } },
        { manifest: { id: 'ex-other', domain: 'attention', skills: [] } }
      ] as any[],
      domains: engineDomains,
      skills: [],
      states: [],
      primaryGoal: 'memory',
      rng: () => 1, // eliminate explore-noise
      isSparse: false, // avoid first-week overrides
    };

    const focusAdaptive = buildAdaptivePlan({ ...engineParams, programPhase: 'focus' });
    const balanceAdaptive = buildAdaptivePlan({ ...engineParams, programPhase: 'balance' });

    // Focus -> should pick memory first
    expect(focusAdaptive.items[0].domain).toBe('memory');
    // Balance -> should pick logic first
    expect(balanceAdaptive.items[0].domain).toBe('logic');
  });
});
