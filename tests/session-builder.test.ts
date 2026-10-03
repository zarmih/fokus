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
  
  expect(plan.items[0].reason).toMatch(/Неделя 1 · День 1 · Знакомство/);
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
  
  expect(plan.items[0].reason).toMatch(/^Неделя \d+ · День \d+ · Отстающий навык$/);
});

import { rerollTrainingPlanSlot } from '../src/core/session-builder';

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
