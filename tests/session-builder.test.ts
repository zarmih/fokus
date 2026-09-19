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
      {domain: 'A', value: 100}, // weakest
      {domain: 'B', value: 200},
      {domain: 'C', value: 300}, // strongest
      {domain: 'D', value: 250},
      {domain: 'E', value: 250},
      {domain: 'F', value: 220}
    ], 
    lastPlayedByExercise: {}, 
    yesterdayDomains: []
  });
  
  expect(res.length).toBe(3); // 5 min = 3 slots
  
  // Should not have 3 of same domain
  
  // Should not have 3 of same domain
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
  
  expect(plan.items[0].reason).toContain('Калибровка области (мало данных)');
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
    states: [
      { exerciseId: 'a1', level: 1, difficulty: 1, performance: 100, lastPlayedAt: '', lastAccuracy: 1, attempts: 1 },
      { exerciseId: 'a1', level: 1, difficulty: 1, performance: 100, lastPlayedAt: '', lastAccuracy: 1, attempts: 1 },
      { exerciseId: 'a1', level: 1, difficulty: 1, performance: 100, lastPlayedAt: '', lastAccuracy: 1, attempts: 1 }
    ],
    primaryGoal: 'balance'
  });
  
  expect(plan.items[0].reason).toContain('Укрепление слабой области');
});
