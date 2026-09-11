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
  /** G15: explicit skip/churn probabilities + form. Does not replace `risk`. */
  riskModel: RetentionRiskModel;
  /** G15: 1–3 ritual steps + difficulty floor after a gap. */
  reengagement: ReengagementPlan;
}

/** Recent session form. Higher score = cleaner last blocks, not an IQ proxy. */
export interface SessionQuality {
  /** 0–100. */
  score: number;
  accuracy: number | null;
  rtMs: number | null;
  sample: number;
  evidence: string;
}

export interface SpacingGap {
  lastGapDays: number;
  meanGapDays: number;
  /** Coefficient of variation of inter-session gaps (0 = metronome). */
  irregularity: number;
  activeDays: number;
  evidence: string;
}

export interface StreakContinuity {
  streak: number;
  playedToday: boolean;
  /** 0–1. 1 = series is intact today. */
  continuity: number;
  evidence: string;
}

export interface RetentionRiskModel {
  /** P(miss the next ritual day), 0–1. */
  skipProbability: number;
  /** P(no session in the next 7 calendar days), 0–1. */
  churnProbability: number;
  quality: SessionQuality;
  spacing: SpacingGap;
  continuity: StreakContinuity;
}

export type RitualStepKind = NudgeKind | 'ease_in';

export interface RitualStep {
  dayOffset: 0 | 1 | 2;
  kind: RitualStepKind;
  title: string;
  body: string;
  durationSec: number;
}

export interface DifficultyFloor {
  /** Multiply stored/engine difficulty. 1 = unchanged. */
  multiplier: number;
  /** Subtract from the 1–30 engine scale after the multiplier. */
  delta: number;
  durationSec: number;
  gapDays: number;
  reason: string;
}

export interface ReengagementPlan {
  steps: RitualStep[];
  floor: DifficultyFloor;
}

/** Transparent skip-logit coefficients. z = intercept + Σ coeff · feature. */
export const SKIP_LOGIT = {
  intercept: -1.35,
  gap: 0.55,
  quality: 0.9,
  continuity: 0.4,
  irregularity: 0.25,
  playedToday: -0.55,
  fatigue: 0.35
} as const;

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
  const plannedSec = input.sessionLengthSec ?? 300;
  const quality = scoreSessionQuality(sessions, plannedSec);
  const spacing = scoreSpacing(summaries, sessions, today, gapDays);
  const continuity = scoreContinuity(input.streak, input.playedToday, gapDays);
  const skipProbability = skipChance({
    gapDays,
    quality: quality.score,
    continuity: continuity.continuity,
    irregularity: spacing.irregularity,
    playedToday: input.playedToday,
    fatigue: fatigue.score,
    sampleDays
  });
  const churnProbability = churnChance({
    skip: skipProbability,
    gapDays,
    quality: quality.score,
    playedToday: input.playedToday,
    sampleDays
  });
  const floor = difficultyFloorAfterGap({
    gapDays,
    quality: quality.score,
    plannedSec
  });
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
  const reengagement = buildReengagementPlan({
    band,
    gapDays,
    playedToday: input.playedToday,
    fatigue: fatigue.score,
    neglectedDomain,
    quality: quality.score,
    floor,
    plannedSec
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
    gapDays,
    riskModel: {
      skipProbability,
      churnProbability,
      quality,
      spacing,
      continuity
    },
    reengagement
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

/**
 * Lower stored/engine difficulty after a gap. Never raises it.
 * Safe no-op when multiplier is 1 and delta is 0 (related PRs unmerged).
 */
export function applyDifficultyFloor(stored: number, floor: DifficultyFloor): number {
  if (!Number.isFinite(stored)) return stored;
  if (floor.multiplier >= 1 && floor.delta <= 0) return stored;
  const next = stored * floor.multiplier - floor.delta;
  return clamp(Math.round(next * 10) / 10, 1, stored);
}

/** One-liner for Today / Settings. No churn %, no IQ, no FOMO. */
export function retentionChipText(snap: RetentionSnapshot): string {
  const band = bandLabel(snap.band);
  const step = snap.reengagement.steps[0];
  if (step && snap.band !== 'stable') {
    return `Ритм ${snap.rhythm} · ${band} · ${step.title.toLowerCase()}`;
  }
  return `Ритм ${snap.rhythm} · ${band}`;
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

function scoreSessionQuality(sessions: Session[], plannedSec: number): SessionQuality {
  const recent = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-4);
  if (recent.length === 0) {
    return { score: 55, accuracy: null, rtMs: null, sample: 0, evidence: 'no-sessions' };
  }

  let wSum = 0;
  let qSum = 0;
  let accSum = 0;
  let accN = 0;
  let rtSum = 0;
  let rtN = 0;

  recent.forEach((s, i) => {
    const w = i + 1;
    const acc = meanAccuracy(s.items);
    const rt = meanRt(s.items);
    const accPart = acc ?? 0.55;
    const rtPart = rt == null ? 0.55 : rtComfort(rt);
    const half = Math.max(60, plannedSec * 0.5);
    const load = s.durationSec > 0 ? clamp(s.durationSec / half, 0.35, 1) : 0.45;
    const q = 100 * (0.6 * accPart + 0.25 * rtPart + 0.15 * load);
    qSum += q * w;
    wSum += w;
    if (acc !== null) {
      accSum += acc;
      accN += 1;
    }
    if (rt !== null) {
      rtSum += rt;
      rtN += 1;
    }
  });

  return {
    score: clamp(Math.round(qSum / Math.max(1, wSum)), 0, 100),
    accuracy: accN ? accSum / accN : null,
    rtMs: rtN ? Math.round(rtSum / rtN) : null,
    sample: recent.length,
    evidence: `n=${recent.length} acc=${accN ? (accSum / accN).toFixed(2) : 'n/a'} rt=${rtN ? Math.round(rtSum / rtN) : 'n/a'}`
  };
}

function scoreSpacing(
  summaries: DaySummary[],
  sessions: Session[],
  today: string,
  gapDays: number
): SpacingGap {
  const days = uniqueActiveDays(summaries, sessions).filter((d) => d <= today).sort();
  if (days.length === 0) {
    return { lastGapDays: gapDays, meanGapDays: 0, irregularity: 0, activeDays: 0, evidence: 'none' };
  }
  const windowStart = addDays(today, -20);
  const window = days.filter((d) => d >= windowStart);
  const gaps: number[] = [];
  for (let i = 1; i < window.length; i++) {
    gaps.push(Math.max(1, daysBetween(window[i - 1], window[i])));
  }
  const meanGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : Math.max(gapDays, 1);
  const variance = gaps.length > 1
    ? gaps.reduce((sum, g) => sum + (g - meanGap) ** 2, 0) / gaps.length
    : 0;
  const cv = meanGap > 0 ? Math.sqrt(variance) / meanGap : 0;
  return {
    lastGapDays: gapDays,
    meanGapDays: Math.round(meanGap * 10) / 10,
    irregularity: clamp(Math.round(cv * 100) / 100, 0, 2),
    activeDays: window.length,
    evidence: `last=${gapDays} mean=${meanGap.toFixed(1)} cv=${cv.toFixed(2)} n=${window.length}`
  };
}

function scoreContinuity(streak: number, playedToday: boolean, gapDays: number): StreakContinuity {
  let continuity = 0;
  if (streak <= 0) continuity = 0;
  else if (playedToday) continuity = 1;
  else if (gapDays <= 1) continuity = clamp(0.55 + Math.min(streak, 10) * 0.03, 0, 0.85);
  else continuity = clamp(streak / (streak + gapDays * 3), 0, 0.45);
  return {
    streak,
    playedToday,
    continuity: Math.round(continuity * 100) / 100,
    evidence: `streak=${streak} gap=${gapDays}`
  };
}

function skipChance(params: {
  gapDays: number;
  quality: number;
  continuity: number;
  irregularity: number;
  playedToday: boolean;
  fatigue: number;
  sampleDays: number;
}): number {
  const z =
    SKIP_LOGIT.intercept
    + SKIP_LOGIT.gap * (clamp(params.gapDays, 0, 10) / 4)
    + SKIP_LOGIT.quality * (1 - params.quality / 100)
    + SKIP_LOGIT.continuity * (1 - params.continuity)
    + SKIP_LOGIT.irregularity * clamp(params.irregularity, 0, 1.5)
    + (params.playedToday ? SKIP_LOGIT.playedToday : 0)
    + SKIP_LOGIT.fatigue * (params.fatigue / 100);

  let p = logistic(z);
  if (params.sampleDays < 2 && params.gapDays < 3) {
    p = Math.min(p, 0.16);
  }
  return round3(clamp(p, 0.04, 0.9));
}

function churnChance(params: {
  skip: number;
  gapDays: number;
  quality: number;
  playedToday: boolean;
  sampleDays: number;
}): number {
  const remaining = params.playedToday ? 6 : 7;
  const independent = 1 - Math.pow(1 - params.skip, Math.max(1, remaining));
  const gapLift = clamp((params.gapDays - 1) * 0.07, 0, 0.38);
  const qualityLift = params.quality < 42 ? 0.1 : params.quality < 55 ? 0.04 : 0;
  let p = 0.5 * independent + 0.3 * params.skip + 0.2 * gapLift + qualityLift;
  if (params.playedToday && params.quality >= 60 && params.gapDays === 0) p *= 0.55;
  if (params.sampleDays < 2 && params.gapDays < 3) p = Math.min(p, 0.12);
  return round3(clamp(p, 0.03, 0.92));
}

function difficultyFloorAfterGap(params: {
  gapDays: number;
  quality: number;
  plannedSec: number;
}): DifficultyFloor {
  const { gapDays, quality, plannedSec } = params;
  let multiplier = 1;
  let delta = 0;
  let durationSec = plannedSec;

  if (gapDays >= 8) {
    multiplier = 0.7;
    delta = 4;
    durationSec = Math.min(plannedSec, 240);
  } else if (gapDays >= 5) {
    multiplier = 0.78;
    delta = 3;
    durationSec = Math.min(plannedSec, 300);
  } else if (gapDays >= 3) {
    multiplier = 0.85;
    delta = 2;
    durationSec = Math.min(plannedSec, 300);
  } else if (gapDays === 2) {
    multiplier = 0.92;
    delta = 1;
    durationSec = Math.min(plannedSec, 300);
  }

  if (gapDays >= 2 && quality < 40) {
    multiplier = Math.max(0.6, multiplier - 0.05);
    delta += 1;
  }

  return {
    multiplier,
    delta,
    durationSec,
    gapDays,
    reason: `gap=${gapDays}d quality=${quality} ×${multiplier} −${delta}`
  };
}

function buildReengagementPlan(params: {
  band: ChurnBand;
  gapDays: number;
  playedToday: boolean;
  fatigue: number;
  neglectedDomain: string | null;
  quality: number;
  floor: DifficultyFloor;
  plannedSec: number;
}): ReengagementPlan {
  const steps: RitualStep[] = [];
  const short = params.floor.durationSec;
  const usual = params.plannedSec;

  if (params.playedToday && params.fatigue >= 55) {
    steps.push({
      dayOffset: 0,
      kind: 'rest',
      title: 'Форма уже есть',
      body: 'Ещё один заход сегодня скорее смажет точность. Завтра ритуал будет чище.',
      durationSec: 0
    });
    steps.push({
      dayOffset: 1,
      kind: 'resume',
      title: 'Завтра как обычно',
      body: 'Короткий блок в привычное время важнее навёрстывания.',
      durationSec: usual
    });
  } else if (!params.playedToday && params.gapDays >= 2) {
    steps.push({
      dayOffset: 0,
      kind: 'ease_in',
      title: 'Мягкий вход',
      body: 'После паузы Fokus снизит сложность. Пять минут достаточно — навык не обнуляется.',
      durationSec: short
    });
    steps.push({
      dayOffset: 1,
      kind: 'short_session',
      title: 'Тот же короткий шаг',
      body: 'Второй день подряд важнее длины. Сложность ещё не прыгает вверх.',
      durationSec: short
    });
    if (params.gapDays >= 3) {
      const stillGentle = params.quality < 45;
      steps.push({
        dayOffset: 2,
        kind: params.neglectedDomain ? 'rebalance' : 'resume',
        title: params.neglectedDomain ? 'Область ждала' : 'Вернуть обычный ритм',
        body: params.neglectedDomain
          ? `«${domainLabel(params.neglectedDomain)}» можно вернуть в план без марафона.`
          : stillGentle
            ? 'Сложность ещё держим ниже обычной — форма после паузы не любит скачка.'
            : 'Если форма откликнулась, можно вернуться к привычной длине.',
        durationSec: stillGentle ? short : usual
      });
    }
  } else if (!params.playedToday && params.band !== 'stable') {
    steps.push({
      dayOffset: 0,
      kind: 'short_session',
      title: 'Короткий ритуал',
      body: 'Сегодня достаточно короткого блока. Сложность подстроится сама.',
      durationSec: Math.min(usual, 300)
    });
  }

  return { steps: steps.slice(0, 3), floor: params.floor };
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

function meanRt(items: SessionItem[]): number | null {
  const rts = items.map((i) => i.avgRtMs).filter((n) => n > 0);
  if (!rts.length) return null;
  return rts.reduce((sum, n) => sum + n, 0) / rts.length;
}

/** 400 ms → 1.0, 1800 ms → 0.0. Comfort of recent form, not an ability score. */
function rtComfort(rtMs: number): number {
  return clamp(1 - (rtMs - 400) / 1400, 0, 1);
}

function logistic(z: number): number {
  if (z > 12) return 1;
  if (z < -12) return 0;
  return 1 / (1 + Math.exp(-z));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
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
