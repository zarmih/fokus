import type { DaySummary, DomainIndex, Session } from './types';
import { getManifest } from '../exercises/catalog';
import {
  addDays,
  collapseSummaries,
  enumerateDays,
  getWeeklyDomainTips,
  reconstructDomainSnapshots,
  toDateKey
} from './coach-intel';
import { DOMAIN_ORDER, domainLabel } from './labels';

/** Gate: the card stays quiet below this many stored sessions. */
export const MIN_SESSIONS = 5;
/** Distinct calendar days with a session (or scored summary) before we speak. */
export const MIN_PLAYED_DAYS = 4;
/** Snapshot / score points a domain needs inside the 28-day span. */
export const MIN_DOMAIN_POINTS = 3;

export const WEEK_DAYS = 7;
export const FORTNIGHT_DAYS = 14;
export const MONTH_DAYS = 28;

/**
 * Fast EWMA (week / fortnight form). Same spirit as engine `FORM_ALPHA` (0.32):
 * half-life ≈ ln(2)/α ≈ 2.2 observations, so last week outweighs the week before
 * without ignoring it.
 */
export const WEEK_ALPHA = 0.32;
/**
 * Slow EWMA (month). Between form (0.32) and base (0.07): half-life ≈ 5.8
 * observations, so a noisy week does not rewrite the month.
 */
export const MONTH_ALPHA = 0.12;
/** Same deadband G3 uses for “on level” index/domain deltas. */
export const DEADBAND = 8;

export type TrendKind = 'improving' | 'stagnating' | 'declining' | 'unknown';
export type ConfidenceBand = 'low' | 'medium' | 'high';
export type QuietReason = 'insufficient-sessions' | 'insufficient-days';
export type FocusReason = 'stagnating' | 'weakest-improving' | 'weak-declining';
export type CardKind = 'focus' | 'progress' | 'plateau';

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface DomainPeriodDelta {
  id: string;
  current: number;
  ready: boolean;
  samples: number;
  sessionSamples: number;
  /** Fast EWMA, last 7 calendar days vs the 7 days before. Index units (or score fallback). */
  weekDelta: number | null;
  /** Slow EWMA, last 14 calendar days vs the 14 days before. */
  monthDelta: number | null;
  trendKind: TrendKind;
  source: 'snapshot' | 'session-score';
}

export interface FocusOfFortnight {
  domainId: string;
  reasonKind: FocusReason;
  /** Human-readable “why this domain”, with numbers. */
  why: string;
  weekDelta: number | null;
  monthDelta: number | null;
  current: number;
  samples: number;
  readyCount: number;
}

export interface CoachCardLine {
  kind: string;
  body: string;
}

export interface LongitudinalCoachCard {
  primary: {
    kind: CardKind;
    title: string;
    body: string;
    domainId?: string;
  };
  supporting: CoachCardLine[];
}

export interface LongitudinalCoach {
  asOf: string;
  ready: boolean;
  quietReason: QuietReason | null;
  sessionCount: number;
  playedDays: number;
  minSessions: number;
  minPlayedDays: number;
  confidence: ConfidenceBand;
  confidencePct: number;
  deltas: DomainPeriodDelta[];
  focus: FocusOfFortnight | null;
  card: LongitudinalCoachCard | null;
}

function finishedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.items.length > 0);
}

function uniqueDays(dates: string[]): number {
  return new Set(dates.map(toDateKey)).size;
}

/**
 * Recursive EWMA: s₀ = x₀, sₜ = sₜ₋₁ + α (xₜ − sₜ₋₁).
 * Returns the terminal smoothed value, or null if the series is empty.
 */
export function ewmaLast(values: number[], alpha: number): number | null {
  if (values.length === 0) return null;
  let acc = values[0];
  for (let i = 1; i < values.length; i++) {
    acc = acc + alpha * (values[i] - acc);
  }
  return acc;
}

/**
 * Period-over-period delta of EWMA terminals.
 * If the prior window is empty, falls back to last-EWMA minus the first
 * observation in `recent` (needs ≥ 2 points). Rounded to whole units.
 */
export function ewmaDelta(recent: number[], prior: number[], alpha: number): number | null {
  const r = ewmaLast(recent, alpha);
  if (r == null) return null;
  if (prior.length > 0) {
    const p = ewmaLast(prior, alpha);
    if (p == null) return null;
    return Math.round(r - p);
  }
  if (recent.length < 2) return null;
  return Math.round(r - recent[0]);
}

export function classifyTrend(monthDelta: number | null, weekDelta: number | null): TrendKind {
  const primary = monthDelta != null ? monthDelta : weekDelta;
  if (primary == null) return 'unknown';
  if (primary > DEADBAND) return 'improving';
  if (primary < -DEADBAND) return 'declining';
  return 'stagnating';
}

export function signedDelta(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function periodPhrase(delta: number | null, windowLabel: string): string {
  if (delta == null) return `мало данных за ${windowLabel}`;
  if (Math.abs(delta) <= DEADBAND) return `на уровне ${windowLabel}`;
  return `${signedDelta(delta)} за ${windowLabel}`;
}

function ruCount(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} ${one}`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function ruSessions(n: number): string {
  return ruCount(n, 'сессия', 'сессии', 'сессий');
}

export function ruDays(n: number): string {
  return ruCount(n, 'день', 'дня', 'дней');
}

function ruAreasNom(n: number): string {
  return ruCount(n, 'область', 'области', 'областей');
}

function ruAreasGen(n: number): string {
  return ruCount(n, 'области', 'областей', 'областей');
}

function valuesBetween(points: SeriesPoint[], start: string, end: string): number[] {
  return points.filter((p) => p.date >= start && p.date <= end).map((p) => p.value);
}

function lastValue(points: SeriesPoint[]): number | null {
  if (points.length === 0) return null;
  return points[points.length - 1].value;
}

function domainFromExercise(exerciseId: string): string | null {
  const m = getManifest(exerciseId);
  return m?.domain || null;
}

/**
 * Per-domain end-of-day index snapshots, reconstructed the same way as G3.
 * Only played days emit a point — unplayed days do not carry the last value
 * (that would fake a plateau through a pause).
 */
export function snapshotSeries(
  summaries: DaySummary[],
  domains: DomainIndex[],
  asOf: string,
  window: number
): Map<string, SeriesPoint[]> {
  const asOfKey = toDateKey(asOf);
  const calendar = enumerateDays(asOfKey, window);
  const buckets = reconstructDomainSnapshots(collapseSummaries(summaries), domains);
  const byDate = new Map(buckets.map((b) => [b.date, b]));
  const series = new Map<string, SeriesPoint[]>();
  for (const id of DOMAIN_ORDER) series.set(id, []);

  let lastKnown: Record<string, number> = {};
  for (const date of calendar) {
    const b = byDate.get(date);
    if (b?.domainValues && Object.keys(b.domainValues).length > 0) {
      lastKnown = { ...b.domainValues };
    }
    if (!b?.played) continue;
    for (const id of DOMAIN_ORDER) {
      const v = b.domainValues?.[id] ?? lastKnown[id];
      if (typeof v === 'number' && v > 0) {
        series.get(id)!.push({ date, value: v });
      }
    }
  }
  return series;
}

/**
 * Fallback when no domain snapshots exist: mean item score per session,
 * grouped by catalog domain. Units are session scores, not Fokus Index.
 */
export function sessionScoreSeries(
  sessions: Session[],
  asOf: string,
  window: number
): Map<string, SeriesPoint[]> {
  const asOfKey = toDateKey(asOf);
  const start = addDays(asOfKey, -(window - 1));
  const byDomainDay = new Map<string, Map<string, { sum: number; n: number }>>();
  for (const id of DOMAIN_ORDER) byDomainDay.set(id, new Map());

  for (const s of finishedSessions(sessions)) {
    const date = toDateKey(s.startedAt);
    if (date < start || date > asOfKey) continue;
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const item of s.items) {
      const domain = domainFromExercise(item.exerciseId);
      if (!domain) continue;
      if (!acc[domain]) acc[domain] = { sum: 0, n: 0 };
      acc[domain].sum += item.score;
      acc[domain].n += 1;
    }
    for (const [domain, a] of Object.entries(acc)) {
      const days = byDomainDay.get(domain);
      if (!days) continue;
      const prev = days.get(date) || { sum: 0, n: 0 };
      days.set(date, { sum: prev.sum + a.sum, n: prev.n + a.n });
    }
  }

  const series = new Map<string, SeriesPoint[]>();
  for (const id of DOMAIN_ORDER) {
    const days = byDomainDay.get(id)!;
    const points: SeriesPoint[] = [...days.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, a]) => ({ date, value: a.sum / a.n }));
    series.set(id, points);
  }
  return series;
}

export function domainSessionCounts(
  sessions: Session[],
  asOf: string,
  window: number
): Record<string, number> {
  const asOfKey = toDateKey(asOf);
  const start = addDays(asOfKey, -(window - 1));
  const counts: Record<string, number> = {};
  for (const id of DOMAIN_ORDER) counts[id] = 0;
  for (const s of finishedSessions(sessions)) {
    const date = toDateKey(s.startedAt);
    if (date < start || date > asOfKey) continue;
    const seen = new Set<string>();
    for (const item of s.items) {
      const domain = domainFromExercise(item.exerciseId);
      if (domain) seen.add(domain);
    }
    for (const d of seen) {
      if (counts[d] != null) counts[d] += 1;
    }
  }
  return counts;
}

function countEvidence(
  sessions: Session[],
  summaries: DaySummary[]
): { sessionCount: number; playedDays: number } {
  const done = finishedSessions(sessions);
  if (done.length > 0) {
    return {
      sessionCount: done.length,
      playedDays: uniqueDays(done.map((s) => s.startedAt))
    };
  }
  const scored = summaries.filter((s) => s.totalScore > 0);
  return {
    sessionCount: scored.length,
    playedDays: uniqueDays(scored.map((s) => s.date))
  };
}

export function confidenceOf(params: {
  sessionCount: number;
  playedDays: number;
  readyDomains: number;
}): { band: ConfidenceBand; pct: number } {
  const sessionScore = Math.min(1, Math.max(0, (params.sessionCount - MIN_SESSIONS) / 20));
  const dayScore = Math.min(1, Math.max(0, (params.playedDays - MIN_PLAYED_DAYS) / 10));
  const coverScore = params.readyDomains / DOMAIN_ORDER.length;
  const mix = 0.5 * sessionScore + 0.2 * dayScore + 0.3 * coverScore;
  const pct = Math.round(25 + 75 * mix);
  const band: ConfidenceBand = pct >= 70 ? 'high' : pct >= 45 ? 'medium' : 'low';
  return { band, pct };
}

function windows(asOfKey: string) {
  const weekStart = addDays(asOfKey, -(WEEK_DAYS - 1));
  const priorWeekStart = addDays(asOfKey, -(2 * WEEK_DAYS - 1));
  const priorWeekEnd = addDays(weekStart, -1);
  const fortnightStart = addDays(asOfKey, -(FORTNIGHT_DAYS - 1));
  const priorFortnightStart = addDays(asOfKey, -(2 * FORTNIGHT_DAYS - 1));
  const priorFortnightEnd = addDays(fortnightStart, -1);
  return {
    weekStart,
    priorWeekStart,
    priorWeekEnd,
    fortnightStart,
    priorFortnightStart,
    priorFortnightEnd
  };
}

export function buildDomainDeltas(input: {
  summaries: DaySummary[];
  domains: DomainIndex[];
  sessions: Session[];
  asOf: string;
}): DomainPeriodDelta[] {
  const asOfKey = toDateKey(input.asOf);
  const w = windows(asOfKey);
  const snaps = snapshotSeries(input.summaries, input.domains, input.asOf, MONTH_DAYS);
  const hasSnapshots = [...snaps.values()].some((pts) => pts.length > 0);
  const scores = hasSnapshots ? null : sessionScoreSeries(input.sessions, input.asOf, MONTH_DAYS);
  const sessionCounts = domainSessionCounts(input.sessions, input.asOf, MONTH_DAYS);
  const source: 'snapshot' | 'session-score' = hasSnapshots ? 'snapshot' : 'session-score';

  return DOMAIN_ORDER.map((id) => {
    const points = hasSnapshots ? snaps.get(id)! : scores!.get(id)!;
    const live = input.domains.find((d) => d.domain === id);
    const last = lastValue(points);
    const current = live && live.value > 0 ? live.value : last || 0;
    const weekRecent = valuesBetween(points, w.weekStart, asOfKey);
    const weekPrior = valuesBetween(points, w.priorWeekStart, w.priorWeekEnd);
    const monthRecent = valuesBetween(points, w.fortnightStart, asOfKey);
    const monthPrior = valuesBetween(points, w.priorFortnightStart, w.priorFortnightEnd);
    const weekDelta = ewmaDelta(weekRecent, weekPrior, WEEK_ALPHA);
    const monthDelta = ewmaDelta(monthRecent, monthPrior, MONTH_ALPHA);
    const ready = points.length >= MIN_DOMAIN_POINTS && current > 0;
    return {
      id,
      current,
      ready,
      samples: points.length,
      sessionSamples: sessionCounts[id] || 0,
      weekDelta,
      monthDelta,
      trendKind: ready ? classifyTrend(monthDelta, weekDelta) : 'unknown',
      source
    };
  });
}

function pickDomainTip(domainId: string, asOf: string): string {
  const pool = getWeeklyDomainTips(domainId);
  if (pool.length === 0) return '';
  const [y, m, d] = toDateKey(asOf).split('-').map(Number);
  return pool[Math.abs(y * 400 + m * 32 + d) % pool.length];
}

function confidenceLead(band: ConfidenceBand): string {
  if (band === 'low') return 'По первым неделям: ';
  if (band === 'medium') return '';
  return '';
}

export function pickFocusOfFortnight(
  deltas: DomainPeriodDelta[],
  primaryGoal?: string
): FocusOfFortnight | null {
  const candidates = deltas.filter((d) => d.ready && d.trendKind !== 'unknown');
  if (candidates.length === 0) return null;

  const eligible = candidates.filter(
    (d) => d.trendKind === 'stagnating' || d.trendKind === 'improving'
  );
  const pool = eligible.length > 0 ? eligible : candidates;

  const ranked = [...pool].sort((a, b) => {
    if (a.current !== b.current) return a.current - b.current;
    const da = a.monthDelta ?? a.weekDelta ?? 0;
    const db = b.monthDelta ?? b.weekDelta ?? 0;
    if (da !== db) return da - db;
    if (primaryGoal && a.id === primaryGoal && b.id !== primaryGoal) return -1;
    if (primaryGoal && b.id === primaryGoal && a.id !== primaryGoal) return 1;
    return 0;
  });
  const pick = ranked[0];
  const reasonKind: FocusReason =
    pick.trendKind === 'stagnating'
      ? 'stagnating'
      : pick.trendKind === 'improving'
        ? 'weakest-improving'
        : 'weak-declining';

  const name = domainLabel(pick.id);
  const n = candidates.length;
  const monthP = periodPhrase(pick.monthDelta, 'месяц');
  const weekP = periodPhrase(pick.weekDelta, 'неделю');
  let why: string;
  if (reasonKind === 'stagnating') {
    why = `«${name}» почти не сдвинулась (${monthP}), и сейчас это самая тихая из ${ruAreasGen(n)} с данными.`;
  } else if (reasonKind === 'weakest-improving') {
    why = `«${name}» растёт медленнее остальных (${monthP}), оставаясь ниже соседних областей.`;
  } else {
    why = `«${name}» тише остальных и за две недели ушла вниз (${weekP}). Короткий повтор, без навёрстывания.`;
  }

  return {
    domainId: pick.id,
    reasonKind,
    why,
    weekDelta: pick.weekDelta,
    monthDelta: pick.monthDelta,
    current: pick.current,
    samples: pick.samples,
    readyCount: n
  };
}

function strongestImprover(deltas: DomainPeriodDelta[], exceptId?: string): DomainPeriodDelta | null {
  const improving = deltas
    .filter((d) => d.ready && d.trendKind === 'improving' && d.id !== exceptId)
    .sort((a, b) => (b.monthDelta ?? -Infinity) - (a.monthDelta ?? -Infinity));
  return improving[0] || null;
}

function buildCard(
  deltas: DomainPeriodDelta[],
  focus: FocusOfFortnight | null,
  confidence: ConfidenceBand,
  sessionCount: number,
  asOf: string
): LongitudinalCoachCard | null {
  if (!focus) return null;

  const ready = deltas.filter((d) => d.ready);
  const stagnating = ready.filter((d) => d.trendKind === 'stagnating');
  const improving = ready.filter((d) => d.trendKind === 'improving');
  const name = domainLabel(focus.domainId);
  const lead = confidenceLead(confidence);

  let primary: LongitudinalCoachCard['primary'];
  if (ready.length >= 3 && improving.length === ready.length) {
    primary = {
      kind: 'progress',
      title: 'Форма за месяц',
      body: `${lead}Все ${ruAreasNom(ready.length)} с данными подросли. Самый тихий рост — «${name}»: её и держим в фокусе двух недель.`,
      domainId: focus.domainId
    };
  } else if (stagnating.length >= 3) {
    primary = {
      kind: 'plateau',
      title: 'Форма стабилизировалась',
      body: `${lead}${stagnating.length} из ${ready.length} областей на одном уровне. Плато — не тупик: день плавает сильнее недели. Фокус двух недель — «${name}».`,
      domainId: focus.domainId
    };
  } else {
    primary = {
      kind: 'focus',
      title: `Фокус двух недель · ${name}`,
      body: `${lead}${focus.why}`,
      domainId: focus.domainId
    };
  }

  const supporting: CoachCardLine[] = [];

  if (primary.kind !== 'focus') {
    supporting.push({ kind: 'why', body: focus.why });
  } else {
    const weekP = periodPhrase(focus.weekDelta, 'неделю');
    const monthP = periodPhrase(focus.monthDelta, 'месяц');
    const weekNull = focus.weekDelta == null;
    const monthNull = focus.monthDelta == null;
    const disagree =
      !weekNull &&
      !monthNull &&
      Math.sign(focus.weekDelta!) !== Math.sign(focus.monthDelta!) &&
      Math.abs(focus.weekDelta!) > DEADBAND &&
      Math.abs(focus.monthDelta!) > DEADBAND;
    if (disagree) {
      supporting.push({
        kind: 'week-month',
        body: `Неделя: ${weekP}. Месяц: ${monthP}. Короткие колебания не равны откату навыка.`
      });
    } else if (!weekNull || !monthNull) {
      supporting.push({
        kind: 'week-month',
        body: `Неделя: ${weekP}. Месяц: ${monthP}.`
      });
    }
  }

  const other = strongestImprover(deltas, focus.domainId);
  if (supporting.length < 2 && other && other.monthDelta != null && other.monthDelta > DEADBAND) {
    supporting.push({
      kind: 'other-progress',
      body: `«${domainLabel(other.id)}» заметно поднялась за месяц (${signedDelta(other.monthDelta)}). Это отметка, не цель.`
    });
  }

  if (supporting.length < 2) {
    const tip = pickDomainTip(focus.domainId, asOf);
    if (tip) supporting.push({ kind: 'domain-tip', body: tip });
  }

  if (supporting.length < 2) {
    supporting.push({
      kind: 'data',
      body: `Оценка по ${ruSessions(sessionCount)}. Перенос в жизнь скромный — регулярность важнее длины сессии.`
    });
  }

  return { primary, supporting: supporting.slice(0, 2) };
}

export function buildLongitudinalCoach(input: {
  sessions: Session[];
  summaries: DaySummary[];
  domains: DomainIndex[];
  asOf?: string;
  primaryGoal?: string;
}): LongitudinalCoach {
  const asOf = input.asOf || new Date().toISOString();
  const asOfKey = toDateKey(asOf);
  const { sessionCount, playedDays } = countEvidence(input.sessions, input.summaries);

  const quietReason: QuietReason | null =
    sessionCount < MIN_SESSIONS
      ? 'insufficient-sessions'
      : playedDays < MIN_PLAYED_DAYS
        ? 'insufficient-days'
        : null;

  if (quietReason) {
    return {
      asOf: asOfKey,
      ready: false,
      quietReason,
      sessionCount,
      playedDays,
      minSessions: MIN_SESSIONS,
      minPlayedDays: MIN_PLAYED_DAYS,
      confidence: 'low',
      confidencePct: 0,
      deltas: DOMAIN_ORDER.map((id) => ({
        id,
        current: 0,
        ready: false,
        samples: 0,
        sessionSamples: 0,
        weekDelta: null,
        monthDelta: null,
        trendKind: 'unknown',
        source: 'snapshot'
      })),
      focus: null,
      card: null
    };
  }

  const deltas = buildDomainDeltas({
    summaries: input.summaries,
    domains: input.domains,
    sessions: input.sessions,
    asOf
  });
  const readyDomains = deltas.filter((d) => d.ready).length;
  const { band, pct } = confidenceOf({ sessionCount, playedDays, readyDomains });
  const focus = pickFocusOfFortnight(deltas, input.primaryGoal);
  const card = buildCard(deltas, focus, band, sessionCount, asOf);

  return {
    asOf: asOfKey,
    ready: card != null,
    quietReason: null,
    sessionCount,
    playedDays,
    minSessions: MIN_SESSIONS,
    minPlayedDays: MIN_PLAYED_DAYS,
    confidence: band,
    confidencePct: pct,
    deltas,
    focus,
    card
  };
}
