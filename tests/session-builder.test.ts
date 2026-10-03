import { expect, test } from 'vitest';
import { buildSession, buildTrainingPlan } from '../src/core/session-builder';

test('buildSession 5 min logic with 6 domains', () => {
  const catalog = [
    {id: 'a1', domain: 'A'}, {id: 'b1', domain: 'B'}, {id: 'c1', domain: 'C'},
    {id: 'd1', domain: 'D'}, {id: 'e1', domain: 'E'}, {id: 'f1', domain: 'F'}
  ];
  
  const res = buildSession({
    durationSec: 300, 
    catalog, 
    domainIndexes: [
      {domain: 'A', value: 100},
      {domain: 'B', value: 200},
      {domain: 'C', value: 300},
      {domain: 'D', value: 250},
      {domain: 'E', value: 250},
      {domain: 'F', value: 220}
    ], 
    lastPlayedByExercise: {}, 
    yesterdayDomains: []
  });
  
  expect(res.length).toBe(2);
  
  const domains = res.map(r => catalog.find(c => c.id === r.exerciseId)!.domain);
  const counts = domains.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {} as any);
  
  Object.values(counts).forEach(count => {
    expect(count as number).toBeLessThan(3);
  });
});

test('sparse history triggers correct weak-domain bias copy', () => {
  const catalog = [
    { manifest: { id: 'a1', domain: 'A', skills: [] } },
    { manifest: { id: 'b1', domain: 'B', skills: [] } }
  ];
  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains: [
      { domain: 'A', value: 100, updatedAt: '' },
      { domain: 'B', value: 200, updatedAt: '' }
    ],
    skills: [],
    states: [],
    primaryGoal: 'balance'
  });
  
  expect(plan.items[0].reason).toMatch(/Знакомство/);
});

test('sufficient history triggers normal weak-domain bias copy', () => {
  const catalog = [
    { manifest: { id: 'a1', domain: 'A', skills: [] } },
    { manifest: { id: 'b1', domain: 'B', skills: [] } }
  ];
  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains: [
      { domain: 'A', value: 100, updatedAt: '' },
      { domain: 'B', value: 200, updatedAt: '' }
    ],
    skills: [],
    states: Array.from({length: 10}).map(() => ({ exerciseId: 'a1', level: 1, difficulty: 1, performance: 100, lastPlayedAt: '', lastAccuracy: 1, attempts: 1, stability: 0.9, consecutivePlateau: 0, mastery: 50 })),
    primaryGoal: 'balance'
  });
  
  expect(plan.items[0].reason).toMatch(/Отстающий навык/);
});

import { getScoredCandidates } from '../src/core/session-builder';

test('thin domain halves the time repetition penalty but keeps +1000 selected id penalty', () => {
  const catalog = [
    { manifest: { id: 's1', domain: 'speed', skills: [] } },
    { manifest: { id: 'l1', domain: 'logic', skills: [] } },
    { manifest: { id: 'l2', domain: 'logic', skills: [] } },
    { manifest: { id: 'l3', domain: 'logic', skills: [] } },
    { manifest: { id: 'l4', domain: 'logic', skills: [] } },
    { manifest: { id: 'l5', domain: 'logic', skills: [] } },
    { manifest: { id: 'l6', domain: 'logic', skills: [] } },
  ];
  const lastPlayedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const states = [
    { exerciseId: 's1', lastPlayedAt, level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 },
    { exerciseId: 'l1', lastPlayedAt, level: 1, difficulty: 1, performance: 0, lastAccuracy: 0 }
  ];
  
  const scored = getScoredCandidates({
    catalog: catalog as any,
    domains: [],
    skills: [],
    states: states as any,
    selectedExerciseIds: new Set<string>(),
    selectedDomains: new Set<string>()
  });
  
  const s1 = scored.find(c => c.exerciseId === 's1');
  const l1 = scored.find(c => c.exerciseId === 'l1');
  
  expect(s1?.trace).toMatch(/Rep:-25/);
  expect(l1?.trace).toMatch(/Rep:-50/);
  
  const scoredWithSelected = getScoredCandidates({
    catalog: catalog as any,
    domains: [],
    skills: [],
    states: states as any,
    selectedExerciseIds: new Set(['s1', 'l1']),
    selectedDomains: new Set<string>()
  });
  
  const s1Sel = scoredWithSelected.find(c => c.exerciseId === 's1');
  const l1Sel = scoredWithSelected.find(c => c.exerciseId === 'l1');
  
  expect(s1Sel?.trace).toMatch(/Rep:-1025/);
  expect(l1Sel?.trace).toMatch(/Rep:-1050/);
});

import { rerollTrainingPlanSlot, fillRenderedSlotAlternatives } from '../src/core/session-builder';

test('rerollTrainingPlanSlot swaps one item, keeps others fixed, no second reroll', () => {
  const catalog = [
    { manifest: { id: 'a1', domain: 'A', skills: [] } },
    { manifest: { id: 'a2', domain: 'A', skills: [] } },
    { manifest: { id: 'b1', domain: 'B', skills: [] } }
  ];
  
  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains: [
      { domain: 'A', value: 100, trend: 0, updatedAt: '' },
      { domain: 'B', value: 200, trend: 0, updatedAt: '' }
    ],
    skills: [],
    states: [],
    primaryGoal: 'balance',
    isSparse: true
  });
  
  expect(plan.items.length).toBeGreaterThan(0);
  const initialFirstId = plan.items[0].exerciseId;
  const initialSecondId = plan.items[1]?.exerciseId;
  
  const { plan: rerolledPlan, applied } = rerollTrainingPlanSlot({
    catalog: catalog as any,
    domains: [],
    skills: [],
    states: []
  }, plan, 0);
  
  expect(applied).toBe(true);
  expect(rerolledPlan.items[0].exerciseId).not.toBe(initialFirstId);
  expect(rerolledPlan.items[0].rerolled).toBe(true);
  if (initialSecondId) {
    expect(rerolledPlan.items[1].exerciseId).toBe(initialSecondId);
  }
  
  const { applied: appliedAgain } = rerollTrainingPlanSlot({
    catalog: catalog as any,
    domains: [],
    skills: [],
    states: []
  }, rerolledPlan, 0);
  expect(appliedAgain).toBe(false);
});

test('fillRenderedSlotAlternatives sets one runner-up without raising domain max', () => {
  const catalog = [
    { manifest: { id: 'a1', domain: 'A', skills: [] } },
    { manifest: { id: 'a2', domain: 'A', skills: [] } },
    { manifest: { id: 'b1', domain: 'B', skills: [] } }
  ];
  const filled = fillRenderedSlotAlternatives([
    { exerciseId: 'a1', domain: 'A', reason: 'x', nextExerciseId: undefined as string | undefined },
    { exerciseId: 'b1', domain: 'B', reason: 'y', nextExerciseId: undefined as string | undefined }
  ], catalog as any);
  expect(filled[0].nextExerciseId).toBeTruthy();
  expect(filled[0].nextExerciseId).not.toBe('a1');
  expect(filled[0].nextExerciseId).not.toBe('b1');
  expect(filled[1].exerciseId).toBe('b1');
  const again = fillRenderedSlotAlternatives(
    [{ ...filled[0], rerolled: true, nextExerciseId: undefined }],
    catalog as any
  );
  expect(again[0].nextExerciseId).toBeUndefined();
});

import { buildAdaptivePlan } from '../src/core/session-builder';

test('milestone lock forces tide-gate onto the last slot solely on milestone day', () => {
  const catalog = [
    { manifest: { id: 'a1', domain: 'A', skills: [] } },
    { manifest: { id: 'b1', domain: 'B', skills: [] } },
    { manifest: { id: 'tide-gate', domain: 'attention', skills: [] } }
  ];
  
  const baseParams = {
    durationSec: 600,
    catalog: catalog as any,
    domains: [
      { domain: 'A', value: 100, updatedAt: '' },
      { domain: 'B', value: 200, updatedAt: '' },
      { domain: 'attention', value: 300, updatedAt: '' }
    ],
    skills: [],
    states: [],
    primaryGoal: 'balance' as const
  };

  // Not a milestone
  const normalPlan = buildTrainingPlan({
    ...baseParams,
    programWeek: 2,
    programDay: 3
  });
  
  const lastNormal = normalPlan.items[normalPlan.items.length - 1];
  expect(lastNormal.reason).not.toMatch(/Веха фазы/);

  // Is a milestone
  const milestonePlan = buildTrainingPlan({
    ...baseParams,
    programWeek: 2,
    programDay: 7
  });

  const lastMilestone = milestonePlan.items[milestonePlan.items.length - 1];
  expect(lastMilestone.exerciseId).toBe('tide-gate');
  expect(lastMilestone.reason).toMatch(/Веха фазы/);
  expect(lastMilestone.nextExerciseId).toBeUndefined();
  
  const occurrences = milestonePlan.items.filter(i => i.exerciseId === 'tide-gate');
  expect(occurrences.length).toBe(1);
});

test('buildAdaptivePlan (engine) milestone lock forces anchor-pair onto the last slot on phase 2 end', () => {
  const catalog = [
    { manifest: { id: 'a1', domain: 'A', skills: [] } },
    { manifest: { id: 'b1', domain: 'B', skills: [] } },
    { manifest: { id: 'anchor-pair', domain: 'memory', skills: [] } }
  ];
  
  const plan = buildAdaptivePlan({
    durationSec: 600,
    catalog: catalog as any,
    domains: [],
    skills: [],
    states: [],
    programWeek: 4,
    programDay: 7,
    fatigueOrChurn: false,
    excludeIds: [],
    primaryGoal: 'balance'
  });
  
  const last = plan.items[plan.items.length - 1];
  expect(last.exerciseId).toBe('anchor-pair');
  expect(last.reason).toMatch(/Веха фазы: Якорная пара/);
});
