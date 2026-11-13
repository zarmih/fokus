import { describe, expect, test } from 'vitest';
import { buildCoachIntel } from '../src/core/coach-intel';
import type { DaySummary } from '../src/core/types';

const day = (date: string, fokusIndex: number, fokusIndexMethod?: number): DaySummary => ({
  date, totalScore: 10, domainDeltas: {}, streak: 1, skipped: false, fokusIndex, fokusIndexMethod
});

describe('index history keeps methodologies apart', () => {
  const summaries = [
    day('2026-11-05', 900, 1),
    day('2026-11-06', 950, 1),
    day('2026-11-10', 400, 2),
    day('2026-11-11', 410, 2),
    day('2026-11-12', 430, 2)
  ];
  const intel = buildCoachIntel({ summaries, domains: [], window: 14, asOf: '2026-11-12T12:00:00+03:00' });

  test('v1 days are kept but never plotted, compared or used as a best', () => {
    const plotted = intel.sparkline.points.filter((p) => p.value != null).map((p) => p.value);
    expect(plotted).toEqual([400, 410, 430]);
    expect(intel.sparkline.delta).toBe(30);
    expect(intel.sparkline.max).toBe(430);
    expect(intel.sparkline.legacyDays).toBe(2);
    expect(intel.sparkline.points.every((p) => !p.personalBest || p.value !== 950)).toBe(true);
  });

  test('history without legacy days has no legacy marker', () => {
    const only = buildCoachIntel({ summaries: summaries.slice(2), domains: [], window: 14, asOf: '2026-11-12T12:00:00+03:00' });
    expect(only.sparkline.legacyDays).toBe(0);
    expect(only.sparkline.delta).toBe(30);
  });
});
