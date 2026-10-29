/**
 * Local norms / percentiles from the user's own attempt history.
 * Never invents population or "world" averages — only device-local data.
 */

import type { Session, SessionItem } from './types';
import { DOMAIN_ORDER, domainLabel } from './labels';

/** Minimum past attempts required before ranks/norms are shown. */
export const MIN_NORM_SAMPLES = 5;

export type NormMetric = 'accuracy' | 'score';

export interface CatalogDomainRef {
  id: string;
  domain: string;
}

export interface AttemptSample {
  domain: string;
  exerciseId: string;
  /** accuracy in [0,1] or raw score, depending on metric used at collection. */
  value: number;
  at: string;
  sessionId: string;
}

export interface LocalNormsOk {
  status: 'ok';
  n: number;
  median: number;
  p25: number;
  p75: number;
  /** Share of past attempts strictly worse than latest, 0–100. */
  latestPercentile: number;
  latestValue: number;
}

export interface LocalNormsInsufficient {
  status: 'insufficient';
  n: number;
}

export type LocalNormsResult = LocalNormsOk | LocalNormsInsufficient;

export interface DomainNormsRow {
  domain: string;
  result: LocalNormsResult;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Linear-interpolated quantile; `sorted` must be ascending and non-empty. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const qq = Math.max(0, Math.min(1, q));
  const pos = (sorted.length - 1) * qq;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[Math.min(base + 1, sorted.length - 1)];
  return sorted[base] + rest * (next - sorted[base]);
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = values.slice().sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

/**
 * Percentile rank of `latest` among `past`: % of past values strictly below latest.
 * Ties do not count as "better". Empty past → 0.
 */
export function percentileRank(past: number[], latest: number): number {
  if (past.length === 0 || !Number.isFinite(latest)) return 0;
  let worse = 0;
  for (const v of past) {
    if (Number.isFinite(v) && v < latest) worse += 1;
  }
  return Math.round((worse / past.length) * 100);
}

/**
 * Compute local norms from chronological attempt values (oldest → newest).
 * Latest = last finite value. Needs at least MIN_NORM_SAMPLES *past* attempts
 * (excluding latest) before ranks are shown.
 */
export function computeNorms(values: number[]): LocalNormsResult {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { status: 'insufficient', n: 0 };
  }
  const latestValue = finite[finite.length - 1];
  const past = finite.slice(0, -1);
  const n = past.length;

  if (n < MIN_NORM_SAMPLES) {
    return { status: 'insufficient', n };
  }

  const sorted = past.slice().sort((a, b) => a - b);
  return {
    status: 'ok',
    n,
    median: quantile(sorted, 0.5),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    latestPercentile: percentileRank(past, latestValue),
    latestValue
  };
}

function itemMetric(item: SessionItem, metric: NormMetric): number | null {
  if (metric === 'score') {
    return Number.isFinite(item.score) ? item.score : null;
  }
  if (!Number.isFinite(item.accuracy)) return null;
  return clamp01(item.accuracy);
}

/** Flatten finished session blocks into chronological samples via catalog domain map. */
export function collectAttemptSamples(
  sessions: Session[],
  catalog: CatalogDomainRef[],
  metric: NormMetric = 'accuracy'
): AttemptSample[] {
  const domainById = new Map<string, string>();
  for (const c of catalog) {
    if (c.id && c.domain) domainById.set(c.id, c.domain);
  }

  const ordered = sessions
    .slice()
    .filter((s) => s && Array.isArray(s.items) && s.items.length > 0)
    .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));

  const out: AttemptSample[] = [];
  for (const session of ordered) {
    const at = session.finishedAt || session.startedAt || '';
    for (const item of session.items) {
      const domain = domainById.get(item.exerciseId);
      if (!domain) continue;
      const value = itemMetric(item, metric);
      if (value === null) continue;
      out.push({
        domain,
        exerciseId: item.exerciseId,
        value,
        at,
        sessionId: session.id
      });
    }
  }
  return out;
}

export function normsForDomain(samples: AttemptSample[], domain: string): LocalNormsResult {
  const values = samples.filter((s) => s.domain === domain).map((s) => s.value);
  return computeNorms(values);
}

export function normsForExercise(samples: AttemptSample[], exerciseId: string): LocalNormsResult {
  const values = samples.filter((s) => s.exerciseId === exerciseId).map((s) => s.value);
  return computeNorms(values);
}

/** Norms for every known domain (including those with zero samples). */
export function normsByDomain(samples: AttemptSample[], domains: readonly string[] = DOMAIN_ORDER): DomainNormsRow[] {
  return domains.map((domain) => ({
    domain,
    result: normsForDomain(samples, domain)
  }));
}

/** Session-level norms from a list of session aggregate values (e.g. avg accuracy), chronological. */
export function normsFromSessionValues(values: number[]): LocalNormsResult {
  return computeNorms(values);
}

export function formatAccuracyPct(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`;
}

/** Short Russian line for Result screen (insufficient tone matches settingsNormsHelpRu). */
export function latestPercentileLineRu(result: LocalNormsResult): string {
  if (result.status === 'insufficient') {
    if (result.n <= 0) {
      return 'Личные нормы появятся после нескольких своих попыток — без сравнения с другими.';
    }
    return `Пока мало своих попыток (${result.n} из ${MIN_NORM_SAMPLES}) — это не плохой результат, просто рано для перцентиля.`;
  }
  return `Лучше ${result.latestPercentile}% своих прошлых попыток`;
}

/**
 * Quiet Result-hero norms line: prefer ok domain ranks (at most two),
 * else a domain-aware insufficient summary for the first touched domain
 * that has samples, else session-level latestPercentileLineRu.
 * Never invents percentiles.
 */
export function resultLocalNormsLineRu(
  touchedDomains: Iterable<string>,
  samples: AttemptSample[],
  sessionValues: number[]
): string {
  const touched = [...touchedDomains];
  const okLines: string[] = [];
  for (const d of touched) {
    const nr = normsForDomain(samples, d);
    if (nr.status === 'ok') {
      okLines.push(`${domainLabel(d)}: лучше ${nr.latestPercentile}% своих`);
    }
  }
  if (okLines.length > 0) {
    return okLines.slice(0, 2).join(' · ');
  }
  for (const d of touched) {
    const hasSamples = samples.some((s) => s.domain === d);
    if (!hasSamples) continue;
    const nr = normsForDomain(samples, d);
    if (nr.status === 'insufficient') {
      return domainNormsSummaryRu(d, nr);
    }
  }
  return latestPercentileLineRu(normsFromSessionValues(sessionValues));
}

/** One-line summary for a domain row on Progress. */
export function domainNormsSummaryRu(domain: string, result: LocalNormsResult): string {
  const name = domainLabel(domain);
  if (result.status === 'insufficient') {
    return `${name}: мало данных (${result.n} из ${MIN_NORM_SAMPLES})`;
  }
  const med = formatAccuracyPct(result.median);
  const lo = formatAccuracyPct(result.p25);
  const hi = formatAccuracyPct(result.p75);
  return `${name}: лучше ${result.latestPercentile}% своих · медиана ${med} · типичный диапазон ${lo}–${hi}`;
}

export function normsDisclaimerRu(): string {
  return 'Только по вашей истории на этом устройстве — без сравнения с другими людьми.';
}

/** Quiet Settings blurb: what «личные нормы» are (and are not). Reuses disclaimer + sample floor. */
export function settingsNormsHelpTitleRu(): string {
  return 'Личные нормы';
}

export function settingsNormsHelpRu(): string {
  return [
    `«Личные нормы» — перцентили по вашей истории: число попыток (n), медиана и типичный диапазон (между квартилями).`,
    `Пока своих попыток меньше ${MIN_NORM_SAMPLES} в области, нормы не считаются — это «мало данных», а не плохой результат.`,
    normsDisclaimerRu(),
    'Не среднее «по миру», не сравнение с другими людьми и не оценка интеллекта.'
  ].join(' ');
}

