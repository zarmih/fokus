import { describe, it, expect } from 'vitest';
import { exerciseRecency } from '../src/core/catalog-recency';

describe('exerciseRecency', () => {
  const DAY_MS = 86400000;

  it('returns new for null/undefined/invalid date', () => {
    const now = Date.now();
    expect(exerciseRecency(null, now)).toBe('new');
    expect(exerciseRecency(undefined, now)).toBe('new');
    expect(exerciseRecency('invalid-date', now)).toBe('new');
  });

  it('returns recent for under 7 days', () => {
    const now = new Date('2026-10-03T12:00:00Z').getTime();
    const lastPlayed = new Date(now - 7 * DAY_MS + 1).toISOString();
    expect(exerciseRecency(lastPlayed, now)).toBe('recent');
  });

  it('returns rested for 7 days exactly', () => {
    const now = new Date('2026-10-03T12:00:00Z').getTime();
    const lastPlayed = new Date(now - 7 * DAY_MS).toISOString();
    expect(exerciseRecency(lastPlayed, now)).toBe('rested');
  });

  it('returns rested for between 7 and 21 days', () => {
    const now = new Date('2026-10-03T12:00:00Z').getTime();
    const lastPlayed = new Date(now - 14 * DAY_MS).toISOString();
    expect(exerciseRecency(lastPlayed, now)).toBe('rested');
  });

  it('returns rested for 21 days exactly', () => {
    const now = new Date('2026-10-03T12:00:00Z').getTime();
    const lastPlayed = new Date(now - 21 * DAY_MS).toISOString();
    expect(exerciseRecency(lastPlayed, now)).toBe('rested');
  });

  it('returns quiet for 21 days + 1 ms', () => {
    const now = new Date('2026-10-03T12:00:00Z').getTime();
    const lastPlayed = new Date(now - 21 * DAY_MS - 1).toISOString();
    expect(exerciseRecency(lastPlayed, now)).toBe('quiet');
  });
});
