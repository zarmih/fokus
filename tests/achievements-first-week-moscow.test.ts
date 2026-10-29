import { describe, it, expect } from 'vitest';
import { firstWeekPlanComplete } from '../src/core/achievements';

const TZ = 'Europe/Moscow';

describe('firstWeekPlanComplete (Moscow calendar days)', () => {
  it('false without a start date', () => {
    expect(firstWeekPlanComplete(undefined, new Date('2026-10-29T09:00:00Z'), TZ)).toBe(false);
  });

  it('date-only start: complete on the 7th Moscow day, not before', () => {
    expect(firstWeekPlanComplete('2026-10-22', new Date('2026-10-28T20:59:00Z'), TZ)).toBe(false); // 23:59 MSK 28th
    expect(firstWeekPlanComplete('2026-10-22', new Date('2026-10-28T21:01:00Z'), TZ)).toBe(true); // 00:01 MSK 29th
  });

  it('UTC-midnight start counts its Moscow day, not 7×24h', () => {
    // 2026-10-22T00:00Z = 03:00 MSK 22nd; at 00:30 MSK on the 29th only 6d21.5h passed, but 7 calendar days did
    expect(firstWeekPlanComplete('2026-10-22T00:00:00.000Z', new Date('2026-10-28T21:30:00Z'), TZ)).toBe(true);
  });

  it('late-evening MSK start that is still the previous UTC day', () => {
    // 2026-10-21T22:00Z = 01:00 MSK 22nd → start day 22nd
    expect(firstWeekPlanComplete('2026-10-21T22:00:00.000Z', new Date('2026-10-28T12:00:00Z'), TZ)).toBe(false);
    expect(firstWeekPlanComplete('2026-10-21T22:00:00.000Z', new Date('2026-10-29T06:00:00Z'), TZ)).toBe(true);
  });
});
