import { describe, expect, test } from 'vitest';
import { attemptsEvidence } from '../src/core/analytics/methodology';

describe('evidence is a count of attempts, not a confidence', () => {
  test('new items use the stored attempt count', () => {
    expect(attemptsEvidence({ attemptsAfter: 7 })).toBe(7);
    expect(attemptsEvidence({ attemptsAfter: 2, confidenceAfter: 100 })).toBe(2);
  });

  test('legacy confidence values map back to the attempts they encoded', () => {
    for (let n = 1; n <= 15; n++) {
      const legacy = Math.min(1, n / 15) * 100;
      expect(attemptsEvidence({ confidenceAfter: legacy })).toBe(n);
    }
  });

  test('no data means no evidence', () => {
    expect(attemptsEvidence({})).toBe(0);
  });
});
