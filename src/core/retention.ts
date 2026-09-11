import type { DaySummary, DomainIndex, Session, SessionItem } from './types';
import { DOMAIN_ORDER, domainLabel } from './labels';

/** Four signals that feed the churn-risk score. */
export type RetentionSignalId =
  | 'adherence_gap'
  | 'streak_fragility'
  | 'domain_neglect'
  | 'session_fatigue';

export type ChurnBand = 'stable' | 'watch' | 'at_risk' | 'critical';

export type NudgeKind = 'resume' | 'protect_streak' | 'rebalance' | 'rest' | 'short_session';

export interface RetentionSignal {
  id: RetentionSignalId;
  /** 0–100 risk from this factor alone. */
  score: number;
  /** Contribution weight in the blended score (sums to 1). */
  weight: number;
  /** Internal evidence — not shown as push copy. */
  evidence: string;
}

export interface RetentionNudge {
  id: string;
  kind: NudgeKind;
  title: string;
  body: string;
  priority: number;
}

export interface RetentionSnapshot {
  /** 0–100 churn risk. UI should prefer `rhythm` (100 − risk). */
  risk: number;
  /** 100 − risk: higher means the habit is healthier. */
  rhythm: number;
  band: ChurnBand;
  /** 0–100, grows with sample days. Low = don't over-act. */
  confidence: number;
  signals: RetentionSignal[];
  nudges: RetentionNudge[];
  primaryNudge: RetentionNudge | null;
  neglectedDomain: string | null;
  gapDays: number;
}

export interface RetentionInput {
  daySummaries: DaySummary[];
  sessions: Session[];
  domains: DomainIndex[];
  playedToday: boolean;
  streak: number;
  skippedYesterday?: boolean;
  sessionLengthSec?: number;
  /** Optional Phase 3 field — ignored when absent. */
  shieldCharges?: number;
  now?: Date;
}

export const RETENTION_WEIGHTS: Record<RetentionSignalId, number> = {
  adherence_gap: 0.35,
  streak_fragility: 0.25,
  domain_neglect: 0.2,
  session_fatigue: 0.2
};

const LOOKBACK_DAYS = 14;
const NEGLECT_DAYS = 8;

export function isoDay(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function daysBetween(fromDay: string, toDay: string): number {
  const a = Date.parse(`${isoDay(fromDay)}T00:00:00Z`);
  const b = Date.parse(`${isoDay(toDay)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function rhythmScore(risk: number): number {
  return clamp(Math.round(100 - risk), 0, 100);
}

export function bandFromRisk(risk: number): ChurnBand {
  if (risk >= 75) return 'critical';
  if (risk >= 50) return 'at_risk';
  if (risk >= 25) return 'watch';
  return 'stable';
}

export function bandLabel(band: ChurnBand): string {
  switch (band) {
    case 'stable':
      return 'устойчивый';
    case 'watch':
      return 'стоит присмотреться';
    case 'at_risk':
      return 'просел';
    case 'critical':
      return 'давно не было сессии';
  }
}

export function signalLabel(id: RetentionSignalId): string {
  switch (id) {
    case 'adherence_gap':
      return 'Регулярность';
    case 'streak_fragility':
      return 'Серия';
    case 'domain_neglect':
      return 'Области';
    case 'session_fatigue':
      return 'Усталость';
  }
}

/**
 * Pure churn-risk model. No DOM, no storage, no notifications.
 * Soft nudges only — never push-style FOMO copy.
 */
export function assessRetention(input: RetentionInput): RetentionSnapshot {
  const now = input.now ?? new Date();
  const today = isoDay(now);
  const summaries = [...input.daySummaries].sort((a, b) => isoDay(a.date).localeCompare(isoDay(b.date)));
  const sessions = [...input.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const lastActive = lastActiveDay(summaries, sessions, input.playedToday ? today : null);
  const gapDays = lastActive ? Math.max(0, daysBetween(lastActive, today)) : summaries.length === 0 && sessions.length === 0 ? 0 : LOOKBACK_DAYS;
  const sampleDays = uniqueActiveDays(summaries, sessions).length;

  const adherence = scoreAdherence(summaries, sessions, today, gapDays, sampleDays);
  const fragility = scoreFragility({
    streak: input.streak,
    playedToday: input.playedToday,
    skippedYesterday: !!input.skippedYesterday,
    hour: now.getHours(),
    shieldCharges: input.shieldCharges,
    gapDays
  });
  const neglect = scoreNeglect(input.domains, summaries, today);
  const fatigue = scoreFatigue(sessions, today, input.sessionLengthSec ?? 300, input.playedToday);

  const signals: RetentionSignal[] = [
    { id: 'adherence_gap', score: adherence.score, weight: RETENTION_WEIGHTS.adherence_gap, evidence: adherence.evidence },
    { id: 'streak_fragility', score: fragility.score, weight: RETENTION_WEIGHTS.streak_fragility, evidence: fragility.evidence },
    { id: 'domain_neglect', score: neglect.score, weight: RETENTION_WEIGHTS.domain_neglect, evidence: neglect.evidence },
    { id: 'session_fatigue', score: fatigue.score, weight: RETENTION_WEIGHTS.session_fatigue, evidence: fatigue.evidence }
  ];

  const blended = signals.reduce((sum, s) => sum + s.score * s.weight, 0);
  const peak = Math.max(
    blended,
    adherence.score * 0.9,
    fragility.score * 0.75,
    neglect.score * 0.7,
    fatigue.score * 0.8
  );

  let risk = clamp(Math.round(peak), 0, 100);
  const confidence = clamp(Math.round(Math.min(100, sampleDays * 12 + (summaries.length > 0 ? 10 : 0))), 0, 100);

  // Cold start: don't invent a churn crisis from two days of data.
  if (sampleDays < 2 && gapDays < 3) {
    risk = Math.min(risk, 22);
  }

  const band = bandFromRisk(risk);
  const neglectedDomain = neglect.domain;
  const nudges = pickNudges({
    band,
    gapDays,
    playedToday: input.playedToday,
    streak: input.streak,
    adherence: adherence.score,
    fragility: fragility.score,
    neglect: neglect.score,
    fatigue: fatigue.score,
    neglectedDomain
  });

  return {
    risk,
    rhythm: rhythmScore(risk),
    band,
    confidence,
    signals,
    nudges,
    primaryNudge: nudges[0] ?? null,
    neglectedDomain,
    gapDays
  };
}

export interface SoftSpark {
  title: string;
  body: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
}

const NUDGE_TONE: Record<NudgeKind, SoftSpark['tone']> = {
  resume: 'recovery',
  protect_streak: 'habit',
  rebalance: 'focus',
  rest: 'habit',
  short_session: 'start'
};

export function sparkFromRetention(snap: RetentionSnapshot): SoftSpark | null {
  const nudge = snap.primaryNudge;
  if (!nudge) return null;
  const severe = snap.band === 'at_risk' || snap.band === 'critical';
  const loudSignal = snap.signals.some((s) => s.score >= 70);
  if (!severe && !loudSignal) return null;
  return {
    title: nudge.title,
    body: nudge.body,
    tone: NUDGE_TONE[nudge.kind]
  };
}

function lastActiveDay(summaries: DaySummary[], sessions: Session[], playedToday: string | null): string | null {
  if (playedToday) return playedToday;
  for (let i = summaries.length - 1; i >= 0; i--) {
    const s = summaries[i];
    if (!s.skipped && s.totalScore > 0) return isoDay(s.date);
  }
  if (sessions.length > 0) return isoDay(sessions[sessions.length - 1].startedAt);
  return null;
}

function uniqueActiveDays(summaries: DaySummary[], sessions: Session[]): string[] {
  const days = new Set<string>();
  summaries.forEach((s) => {
    if (!s.skipped && s.totalScore > 0) days.add(isoDay(s.date));
  });
  sessions.forEach((s) => days.add(isoDay(s.startedAt)));
  return [...days];
}

function scoreAdherence(
  summaries: DaySummary[],
  sessions: Session[],
  today: string,
  gapDays: number,
  sampleDays: number
): { score: number; evidence: string } {
  const windowStart = addDays(today, -(LOOKBACK_DAYS - 1));
  const active = uniqueActiveDays(summaries, sessions).filter((d) => d >= windowStart && d <= today);
  const first = earliestDay(summaries, sessions);
  const possible = first ? Math.min(LOOKBACK_DAYS, Math.max(1, daysBetween(first, today) + 1)) : 1;
  const coverage = active.length / possible;
  const gapScore = clamp(gapDays * 22, 0, 100);
  const coverageScore = clamp(Math.round((1 - Math.min(1, coverage / (5 / 7))) * 100), 0, 100);
  let score = Math.round(0.6 * gapScore + 0.4 * coverageScore);
  // New users: don't punish a single quiet day. A multi-day gap still counts.
  if (sampleDays < 3 && gapDays <= 1) score = Math.round(score * 0.45);
  return {
    score: clamp(score, 0, 100),
    evidence: `gap=${gapDays}d active=${active.length}/${possible}`
  };
}

function scoreFragility(params: {
  streak: number;
  playedToday: boolean;
  skippedYesterday: boolean;
  hour: number;
  shieldCharges?: number;
  gapDays: number;
}): { score: number; evidence: string } {
  const { streak, playedToday, skippedYesterday, hour, shieldCharges, gapDays } = params;
  if (streak <= 0) {
    return { score: 0, evidence: 'no-streak' };
  }
  if (playedToday) {
    return { score: skippedYesterday ? 12 : 4, evidence: 'already-played' };
  }
  // Short streaks are not fragile; long ones without today's session are.
  let score = clamp(Math.round(streak * 5.5), 0, 78);
  if (skippedYesterday) score += 18;
  if (hour >= 20) score += 22;
  else if (hour >= 16) score += 12;
  if (typeof shieldCharges === 'number' && shieldCharges > 0 && skippedYesterday) {
    score -= 14; // Phase 3 shield already absorbed a miss.
  }
  if (gapDays >= 2) score += 8;
  return { score: clamp(score, 0, 100), evidence: `streak=${streak} hour=${hour}` };
}

function scoreNeglect(
  domains: DomainIndex[],
  summaries: DaySummary[],
  today: string
): { score: number; evidence: string; domain: string | null } {
  const ready = DOMAIN_ORDER.map((id) => {
    const d = domains.find((x) => x.domain === id);
    const fromIndex = d && d.value > 0 ? isoDay(d.updatedAt) : null;
    const fromDeltas = lastDeltaDay(summaries, id);
    const last = laterDay(fromIndex, fromDeltas);
    return { id, value: d?.value ?? 0, last, ready: !!(d && d.value > 0) };
  });

  const touched = ready.filter((d) => d.ready);
  if (touched.length === 0) {
    return { score: 0, evidence: 'no-domains', domain: null };
  }

  let worst: { id: string; stale: number } | null = null;
  for (const d of touched) {
    const stale = d.last ? daysBetween(d.last, today) : LOOKBACK_DAYS;
    if (!worst || stale > worst.stale) worst = { id: d.id, stale };
  }

  const staleDays = worst?.stale ?? 0;
  let score = 0;
  if (staleDays <= 3) score = Math.round(staleDays * 6);
  else if (staleDays <= 7) score = 22 + (staleDays - 3) * 8;
  else if (staleDays <= 14) score = 54 + (staleDays - 7) * 5;
  else score = 90;

  const values = touched.map((d) => d.value);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread > 280 && staleDays >= 5) score = Math.min(100, score + 12);

  const domain = staleDays >= NEGLECT_DAYS ? worst?.id ?? null : staleDays >= 5 ? worst?.id ?? null : null;
  return {
    score: clamp(Math.round(score), 0, 100),
    evidence: `stale=${staleDays}d domain=${worst?.id ?? 'n/a'}`,
    domain
  };
}

function scoreFatigue(
  sessions: Session[],
  today: string,
  sessionLengthSec: number,
  playedToday: boolean
): { score: number; evidence: string } {
  if (!playedToday) return { score: 0, evidence: 'not-played' };
  const todaySessions = sessions.filter((s) => isoDay(s.startedAt) === today);
  const load = todaySessions.length;
  if (load === 0) return { score: 8, evidence: 'marked-played-empty' };

  const minutes = todaySessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / 60;
  const planned = Math.max(5, sessionLengthSec / 60);

  let score = 0;
  if (load >= 2) score += 35;
  if (load >= 3) score += 25;
  if (minutes > planned * 1.4) score += 20;
  if (minutes > planned * 2) score += 15;

  const last = todaySessions[todaySessions.length - 1];
  const prior = sessions.filter((s) => isoDay(s.startedAt) < today).slice(-4);
  const lastAcc = meanAccuracy(last.items);
  const priorAcc = meanAccuracy(prior.flatMap((s) => s.items));
  if (priorAcc !== null && lastAcc !== null && lastAcc < priorAcc - 0.12) score += 20;

  const rtv = reactionTimeVariability(last.items);
  if (rtv >= 0.35) score += 15;

  return {
    score: clamp(score, 0, 100),
    evidence: `load=${load} min=${minutes.toFixed(1)} rtv=${rtv.toFixed(2)}`
  };
}

function pickNudges(params: {
  band: ChurnBand;
  gapDays: number;
  playedToday: boolean;
  streak: number;
  adherence: number;
  fragility: number;
  neglect: number;
  fatigue: number;
  neglectedDomain: string | null;
}): RetentionNudge[] {
  const out: RetentionNudge[] = [];

  if (params.playedToday && params.fatigue >= 55) {
    out.push({
      id: 'rest',
      kind: 'rest',
      title: 'Форма уже есть',
      body: 'Ещё один заход сегодня скорее смажет точность, чем усилит навык. Завтра ритуал будет чище.',
      priority: 90
    });
  }

  if (!params.playedToday && params.gapDays >= 2) {
    out.push({
      id: 'resume',
      kind: 'resume',
      title: 'Короткий возврат',
      body: 'Пауза не обнуляет навык. Пять минут сегодня важнее навёрстывания.',
      priority: params.gapDays >= 4 ? 88 : 80
    });
  }

  if (!params.playedToday && params.streak > 0 && params.fragility >= 55) {
    out.push({
      id: 'protect_streak',
      kind: 'protect_streak',
      title: 'Серия ещё с вами',
      body: 'Fokus не считает поздний вечер провалом. Короткий блок закрепит ритм без марафона.',
      priority: 75
    });
  }

  if (!params.playedToday && (params.gapDays >= 2 || params.band === 'at_risk' || params.band === 'critical')) {
    out.push({
      id: 'short_session',
      kind: 'short_session',
      title: 'Короче обычного',
      body: 'После паузы лучше короткий ритуал, чем полная длина. Сложность подстроится сама.',
      priority: 68
    });
  }

  if (params.neglect >= 50 && params.neglectedDomain) {
    const name = domainLabel(params.neglectedDomain);
    out.push({
      id: 'rebalance',
      kind: 'rebalance',
      title: 'Область ждала',
      body: `«${name}» давно не была в плане. Сегодня её можно подтянуть без отдельного марафона.`,
      priority: 60
    });
  }

  // One primary + at most one supporting nudge. Never a stack of push cards.
  return out.sort((a, b) => b.priority - a.priority).slice(0, 2);
}

function lastDeltaDay(summaries: DaySummary[], domain: string): string | null {
  for (let i = summaries.length - 1; i >= 0; i--) {
    const delta = summaries[i].domainDeltas?.[domain];
    if (typeof delta === 'number' && delta !== 0) return isoDay(summaries[i].date);
  }
  return null;
}

function laterDay(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function earliestDay(summaries: DaySummary[], sessions: Session[]): string | null {
  const days = [
    ...summaries.map((s) => isoDay(s.date)),
    ...sessions.map((s) => isoDay(s.startedAt))
  ].sort();
  return days[0] ?? null;
}

function addDays(day: string, delta: number): string {
  const ms = Date.parse(`${isoDay(day)}T00:00:00Z`) + delta * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function meanAccuracy(items: SessionItem[]): number | null {
  if (!items.length) return null;
  return items.reduce((sum, i) => sum + i.accuracy, 0) / items.length;
}

function reactionTimeVariability(items: SessionItem[]): number {
  const rts = items.map((i) => i.avgRtMs).filter((n) => n > 0);
  if (rts.length < 3) return 0;
  const mean = rts.reduce((s, n) => s + n, 0) / rts.length;
  if (mean <= 0) return 0;
  const variance = rts.reduce((s, n) => s + (n - mean) ** 2, 0) / rts.length;
  return Math.sqrt(variance) / mean;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
