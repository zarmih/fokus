import { expect, test } from 'vitest';
import { buildSession } from '../src/core/session-builder';

test('buildSession single catalog item repeats', () => {
  const res = buildSession({
    durationSec: 300, 
    catalog: [{id: 'game1'}], 
    domainIndexes: [], 
    lastPlayedByExercise: {}, 
    yesterdayDomains: []
  });
  expect(res.length).toBe(4); // 300/70 = 4
  expect(res[0].exerciseId).toBe('game1');
});
