import { expect, test } from 'vitest';
import { buildSession } from '../src/core/session-builder';

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
  
  // Last slot should be strongest (C)
  const lastItem = catalog.find(c => c.id === res[2].exerciseId);
  expect(lastItem?.domain).toBe('C');
  
  // Should not have 3 of same domain
  const domains = res.map(r => catalog.find(c => c.id === r.exerciseId)!.domain);
  const counts = domains.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {} as any);
  
  Object.values(counts).forEach(count => {
    expect(count as number).toBeLessThan(3);
  });
});
