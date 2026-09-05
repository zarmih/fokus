import { expect, test } from 'vitest';
import { scoreBlock } from '../src/core/scoring';

test('scoring logic', () => {
  const s1 = scoreBlock({accuracy: 1.0, level: 1, avgRtMs: 1000, targetMs: 1000}); // 1.0 * (100+12) * 1 = 112
  expect(s1).toBe(112);
  const s2 = scoreBlock({accuracy: 0.0, level: 1, avgRtMs: 1000, targetMs: 1000}); 
  expect(s2).toBe(0);
});
