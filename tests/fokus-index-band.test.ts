import { describe, it, expect } from 'vitest';
import { personalIndexBand } from '../src/core/fokus-index';

describe('personalIndexBand', () => {
  it('returns null when fewer than 3 valid days', () => {
    const summaries = [
      { date: '2026-10-03', fokusIndex: 100 },
      { date: '2026-10-02', fokusIndex: 110 }
    ];
    expect(personalIndexBand(summaries, '2026-10-03')).toBeNull();
  });

  it('ignores zeros and dates older than 7 days', () => {
    const summaries = [
      { date: '2026-10-03', fokusIndex: 100 },
      { date: '2026-10-02', fokusIndex: 0 },
      { date: '2026-10-01', fokusIndex: 110 },
      { date: '2026-09-26', fokusIndex: 120 },
      { date: '2026-09-27', fokusIndex: 130 }
    ];
    const result = personalIndexBand(summaries, '2026-10-03T12:00:00Z');
    expect(result).not.toBeNull();
    expect(result!.days).toBe(3);
    expect(result!.min).toBe(100);
    expect(result!.max).toBe(130);
  });

  it('calculates min/max correctly and line contains both numbers', () => {
    const summaries = [
      { date: '2026-10-03', fokusIndex: 42.4 },
      { date: '2026-10-02', fokusIndex: 51.1 },
      { date: '2026-10-01', fokusIndex: 48.9 }
    ];
    const result = personalIndexBand(summaries, '2026-10-03');
    expect(result).not.toBeNull();
    expect(result!.min).toBe(42);
    expect(result!.max).toBe(51);
    expect(result!.line).toContain('42');
    expect(result!.line).toContain('51');
  });
});
