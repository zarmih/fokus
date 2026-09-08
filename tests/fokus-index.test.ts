import { expect, test } from 'vitest';
import { computeFokusIndex, indexDelta, previousFokusIndex } from '../src/core/fokus-index';
import type { DomainIndex, DaySummary } from '../src/core/types';

test('empty domains → zero index and no fake coverage', () => {
  const fi = computeFokusIndex([]);
  expect(fi.value).toBe(0);
  expect(fi.coverage).toBe(0);
  expect(fi.confidence).toBe(0);
  expect(fi.byDomain).toHaveLength(5);
  expect(fi.byDomain.every(d => !d.ready)).toBe(true);
});

test('partial coverage averages only ready domains', () => {
  const domains: DomainIndex[] = [
    { domain: 'attention', value: 800, trend: 10, updatedAt: '2026-09-08' },
    { domain: 'memory', value: 400, trend: -4, updatedAt: '2026-09-08' }
  ];
  const fi = computeFokusIndex(domains);
  expect(fi.coverage).toBe(2);
  expect(fi.value).toBe(Math.round(((800 + 400) / 2) * 0.75));
  expect(fi.confidence).toBeLessThan(70);
  expect(fi.byDomain.find(d => d.id === 'speed')?.ready).toBe(false);
});

test('index is capped at 999', () => {
  const domains: DomainIndex[] = [
    { domain: 'attention', value: 2000, updatedAt: 'x' },
    { domain: 'memory', value: 2000, updatedAt: 'x' },
    { domain: 'speed', value: 2000, updatedAt: 'x' },
    { domain: 'flexibility', value: 2000, updatedAt: 'x' },
    { domain: 'logic', value: 2000, updatedAt: 'x' }
  ];
  expect(computeFokusIndex(domains).value).toBe(999);
  expect(computeFokusIndex(domains).coverage).toBe(5);
});

test('delta labels stay honest without a previous value', () => {
  expect(indexDelta(500, null).label).toBe('базовая оценка');
  expect(indexDelta(520, 500).label).toContain('+20');
  expect(indexDelta(480, 500).label).toContain('-20');
});

test('previousFokusIndex skips today and empty values', () => {
  const summaries: DaySummary[] = [
    { date: '2026-09-07T10:00:00Z', totalScore: 100, domainDeltas: {}, streak: 1, skipped: false, fokusIndex: 410 },
    { date: '2026-09-08T10:00:00Z', totalScore: 120, domainDeltas: {}, streak: 2, skipped: false, fokusIndex: 430 }
  ];
  expect(previousFokusIndex(summaries, '2026-09-08T12:00:00Z')).toBe(410);
});
