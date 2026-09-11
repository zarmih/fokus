import type { Session, SessionItem } from './types';

/** Transparent weights. Sum = 1. This is ritual process quality, not an ability index. */
export const QUALITY_WEIGHTS = {
  accuracy: 0.30,
  rtStability: 0.20,
  difficulty: 0.15,
  completion: 0.25,
  interruptions: 0.10
} as const;

export type QualityComponent = keyof typeof QUALITY_WEIGHTS;

export interface SessionQualityBreakdown {
  accuracy: number;
  rtStability: number;
  difficulty: number;
  completion: number;
  interruptions: number;
}

export interface SessionQualitySample {
  blocks: number;
  meanAccuracy: number;
  meanRtMs: number | null;
  rtCv: number | null;
  meanLevel: number;
  completed: boolean;
  interrupted: boolean;
  endReason: Session['endReason'] | 'unknown';
}

export interface SessionQuality {
  score: number;
  breakdown: SessionQualityBreakdown;
  weights: typeof QUALITY_WEIGHTS;
  sample: SessionQualitySample;
  confidence: 'low' | 'medium' | 'high';
}

export interface ScoredSession {
  sessionId: string;
  startedAt: string;
  quality: SessionQuality;
}

const COMPONENT_LABELS_RU: Record<QualityComponent, string> = {
  accuracy: 'Точность',
  rtStability: 'Стабильность реакции',
  difficulty: 'Уместность сложности',
  completion: 'Завершённость',
  interruptions: 'Без обрывов'
};

export function qualityComponentLabel(key: QualityComponent): string {
  return COMPONENT_LABELS_RU[key];
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function expectedBlocks(plannedSec: number | undefined): number {
  if (!plannedSec || plannedSec <= 0) return 3;
  if (plannedSec >= 720) return 5;
  if (plannedSec >= 480) return 4;
  return 3;
}

function validRts(items: SessionItem[]): number[] {
  return items.map((i) => i.avgRtMs).filter((rt) => Number.isFinite(rt) && rt > 0);
}

function accuracyComponent(items: SessionItem[]): number {
  if (items.length === 0) return 0;
  return clamp(mean(items.map((i) => i.accuracy)) * 100, 0, 100);
}

function rtStabilityComponent(items: SessionItem[]): { score: number; cv: number | null; meanRt: number | null } {
  const rts = validRts(items);
  if (rts.length === 0) return { score: 50, cv: null, meanRt: null };
  const meanRt = mean(rts);
  if (rts.length < 2) return { score: 50, cv: null, meanRt };

  const cv = meanRt > 0 ? stddev(rts) / meanRt : 0;
  // CV 0.05 → ~100, 0.20 → ~63, 0.45 → ~0
  let score = 100 * clamp(1 - (cv - 0.05) / 0.40, 0, 1);

  const med = median(rts);
  const maxRt = Math.max(...rts);
  if (med > 0 && maxRt > 2.5 * med) score -= 15;
  if (rts.length >= 3 && rts[0] > 0 && rts[rts.length - 1] > rts[0] * 1.4) score -= 10;

  return { score: clamp(score, 0, 100), cv, meanRt };
}

function difficultyComponent(items: SessionItem[]): number {
  if (items.length === 0) return 0;
  const meanAcc = mean(items.map((i) => i.accuracy));
  const meanLevel = mean(items.map((i) => i.level || 1));
  // Peak when accuracy sits in the engaged band (~0.80), not a ceiling smash or a collapse.
  const accBand = 1 - Math.min(1, Math.abs(meanAcc - 0.80) / 0.35);
  const challenge = clamp(meanLevel / 6, 0, 1);
  return clamp(accBand * 70 + challenge * 30, 0, 100);
}

function completionComponent(session: Session, plannedSec: number | undefined): number {
  const items = session.items || [];
  if (items.length === 0) return 0;

  const expected = expectedBlocks(plannedSec ?? session.plannedDurationSec);
  const blockRatio = clamp(items.length / expected, 0, 1);
  const finished = !!session.finishedAt;
  const interrupted = isInterrupted(session);
  const reason = session.endReason;

  let score: number;
  if (reason === 'fatigue') {
    score = 45 + blockRatio * 35;
  } else if (!finished || interrupted) {
    score = blockRatio * 40;
  } else {
    score = 55 + blockRatio * 45;
  }

  if (session.durationSec < 45) score *= 0.5;
  return clamp(score, 0, 100);
}

function interruptionsComponent(session: Session, plannedSec: number | undefined): number {
  if (isInterrupted(session) || session.endReason === 'abandoned' || !session.finishedAt) {
    return session.items.length > 0 ? 20 : 5;
  }
  if (session.endReason === 'fatigue') return 70;

  let score = 100;
  const rts = validRts(session.items);
  if (rts.length >= 2) {
    const med = median(rts);
    if (med > 0 && Math.max(...rts) > 3 * med) score -= 25;
  }
  const planned = plannedSec ?? session.plannedDurationSec;
  if (planned && session.durationSec < planned * 0.4) {
    score -= 30;
  }
  return clamp(score, 0, 100);
}

export function isInterrupted(session: Session): boolean {
  if (session.interrupted === true) return true;
  if (session.endReason === 'abandoned') return true;
  if (session.finishedAt === null && session.endReason !== 'fatigue') return true;
  return false;
}

function confidenceFor(session: Session, blocks: number): SessionQuality['confidence'] {
  if (blocks >= 3 && session.finishedAt && !isInterrupted(session)) return 'high';
  if (blocks >= 2) return 'medium';
  return 'low';
}

export function scoreSessionQuality(
  session: Session,
  opts?: { plannedDurationSec?: number }
): SessionQuality {
  const items = session.items || [];
  const planned = opts?.plannedDurationSec ?? session.plannedDurationSec;
  if (items.length === 0) {
    return {
      score: 0,
      breakdown: { accuracy: 0, rtStability: 0, difficulty: 0, completion: 0, interruptions: 0 },
      weights: QUALITY_WEIGHTS,
      sample: {
        blocks: 0,
        meanAccuracy: 0,
        meanRtMs: null,
        rtCv: null,
        meanLevel: 0,
        completed: false,
        interrupted: isInterrupted(session),
        endReason: session.endReason || 'unknown'
      },
      confidence: 'low'
    };
  }
  const acc = accuracyComponent(items);
  const rt = rtStabilityComponent(items);
  const diff = difficultyComponent(items);
  const completion = completionComponent(session, planned);
  const interruptions = interruptionsComponent(session, planned);

  const breakdown: SessionQualityBreakdown = {
    accuracy: round1(acc),
    rtStability: round1(rt.score),
    difficulty: round1(diff),
    completion: round1(completion),
    interruptions: round1(interruptions)
  };

  const raw =
    QUALITY_WEIGHTS.accuracy * breakdown.accuracy +
    QUALITY_WEIGHTS.rtStability * breakdown.rtStability +
    QUALITY_WEIGHTS.difficulty * breakdown.difficulty +
    QUALITY_WEIGHTS.completion * breakdown.completion +
    QUALITY_WEIGHTS.interruptions * breakdown.interruptions;

  const rts = validRts(items);

  return {
    score: Math.round(clamp(raw, 0, 100)),
    breakdown,
    weights: QUALITY_WEIGHTS,
    sample: {
      blocks: items.length,
      meanAccuracy: items.length ? mean(items.map((i) => i.accuracy)) : 0,
      meanRtMs: rt.meanRt,
      rtCv: rt.cv,
      meanLevel: items.length ? mean(items.map((i) => i.level || 1)) : 0,
      completed: !!session.finishedAt && !isInterrupted(session),
      interrupted: isInterrupted(session),
      endReason: session.endReason || (session.finishedAt ? 'completed' : 'unknown')
    },
    confidence: confidenceFor(session, items.length)
  };
}

export function scoreSessions(sessions: Session[]): ScoredSession[] {
  return [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s) => ({
      sessionId: s.id,
      startedAt: s.startedAt,
      quality: scoreSessionQuality(s)
    }));
}

export function qualityBand(score: number): string {
  if (score >= 80) return 'чистый ритуал';
  if (score >= 65) return 'ровно';
  if (score >= 50) return 'с просадками';
  return 'рваный ритуал';
}

function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}
