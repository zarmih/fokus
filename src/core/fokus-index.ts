import type { DomainIndex, DaySummary } from './types';
import { DOMAIN_ORDER } from './labels';

export interface DomainSlice {
  id: string;
  value: number;
  ready: boolean;
  trend: number;
}

export interface FokusIndex {
  value: number;
  confidence: number;
  coverage: number;
  byDomain: DomainSlice[];
  trend: number;
}

const MAX_RAW = 1332; // 999 / 0.75 — maps typical domain scores onto a 0–999 index

export function computeFokusIndex(domains: DomainIndex[]): FokusIndex {
  const byDomain: DomainSlice[] = DOMAIN_ORDER.map((id) => {
    const d = domains.find((x) => x.domain === id);
    const ready = !!(d && d.value > 0);
    return {
      id,
      value: ready ? d!.value : 0,
      ready,
      trend: d?.trend || 0
    };
  });

  const ready = byDomain.filter((d) => d.ready);
  if (ready.length === 0) {
    return { value: 0, confidence: 0, coverage: 0, byDomain, trend: 0 };
  }

  const mean = ready.reduce((sum, d) => sum + d.value, 0) / ready.length;
  const value = Math.round(Math.max(0, Math.min(999, mean * 0.75)));
  const coverage = ready.length;
  const coverageRatio = coverage / DOMAIN_ORDER.length;
  const confidence = Math.round(Math.min(100, coverageRatio * 100 * (coverage >= 3 ? 1 : 0.65)));
  const trend = ready.reduce((sum, d) => sum + d.trend, 0) / ready.length;

  return { value, confidence, coverage, byDomain, trend };
}

export function previousFokusIndex(summaries: DaySummary[], excludeTodayIso?: string): number | null {
  const today = excludeTodayIso?.slice(0, 10);
  const withIndex = summaries
    .filter((s) => typeof s.fokusIndex === 'number' && s.fokusIndex > 0)
    .filter((s) => !today || !s.date.startsWith(today));
  if (withIndex.length === 0) return null;
  return withIndex[withIndex.length - 1].fokusIndex as number;
}

export function indexDelta(current: number, previous: number | null): { delta: number; label: string } {
  if (previous === null || previous === 0) {
    return { delta: 0, label: 'базовая оценка' };
  }
  const delta = current - previous;
  if (delta > 8) return { delta, label: `+${delta} к вчера` };
  if (delta < -8) return { delta, label: `${delta} к вчера` };
  return { delta, label: 'на уровне вчера' };
}
