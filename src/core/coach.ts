import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { domainLabel } from './labels';
import { computeFokusIndex } from './fokus-index';
import { assessRetention } from './retention';
import {
  composeRitualCopy,
  toCoachSpark,
  type RecoveryTone,
  type RitualCopy,
  type RitualCopyInput
} from './ritual-copy';

export interface CoachSpark {
  title: string;
  body: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
}

export type DailyCoachParams = {
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  daySummaries: DaySummary[];
  sessions: Session[];
  calibrated: boolean;
  playedToday: boolean;
  streak: number;
  skippedYesterday?: boolean;
  primaryGoal?: string;
  focusDomains?: string[];
  now?: Date;
  /** Optional Phase 3 field — ignored when the program PR is not merged. */
  shieldCharges?: number;
  sessionLengthSec?: number;
  fatigueScore?: number;
  neglectScore?: number;
  gapDays?: number;
  recovery?: RecoveryTone | null;
  loadEwma?: number;
  lastQuality?: number | null;
  minutes?: number;
  lastTemplateId?: string;
};

function hourBucket(iso: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date(iso).getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

export function analyzeChronotype(sessions: Session[]): {
  bucket: 'morning' | 'afternoon' | 'evening' | null;
  label: string;
  sample: number;
} {
  const buckets: Record<string, { score: number; n: number }> = {
    morning: { score: 0, n: 0 },
    afternoon: { score: 0, n: 0 },
    evening: { score: 0, n: 0 }
  };

  sessions.forEach((s) => {
    const b = hourBucket(s.startedAt);
    if (b === 'night') return;
    const total = s.items.reduce((sum, i) => sum + i.score, 0);
    buckets[b].score += total;
    buckets[b].n += 1;
  });

  const ranked = Object.entries(buckets)
    .filter(([, v]) => v.n >= 2)
    .map(([k, v]) => ({ bucket: k as 'morning' | 'afternoon' | 'evening', avg: v.score / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg);

  if (ranked.length < 2) return { bucket: null, label: '', sample: 0 };

  const labels = { morning: 'утром', afternoon: 'днём', evening: 'вечером' };
  return {
    bucket: ranked[0].bucket,
    label: labels[ranked[0].bucket],
    sample: ranked[0].n
  };
}

function retentionBits(params: DailyCoachParams): {
  fatigueScore?: number;
  neglectScore?: number;
  gapDays?: number;
  neglectedDomain?: string | null;
} {
  try {
    const snap = assessRetention({
      daySummaries: params.daySummaries,
      sessions: params.sessions,
      domains: params.domains,
      playedToday: params.playedToday,
      streak: params.streak,
      skippedYesterday: params.skippedYesterday,
      shieldCharges: params.shieldCharges,
      sessionLengthSec: params.sessionLengthSec,
      now: params.now
    });
    const fatigue = snap.signals.find((s) => s.id === 'session_fatigue');
    const neglect = snap.signals.find((s) => s.id === 'domain_neglect');
    return {
      fatigueScore: fatigue?.score,
      neglectScore: neglect?.score,
      gapDays: snap.gapDays,
      neglectedDomain: snap.neglectedDomain
    };
  } catch {
    return {};
  }
}

export function buildRitualCopyInput(params: DailyCoachParams): RitualCopyInput {
  const now = params.now ?? new Date();
  const bits = retentionBits(params);
  const fatigueScore = params.fatigueScore ?? bits.fatigueScore;
  const neglectScore = params.neglectScore ?? bits.neglectScore;
  const gapDays = params.gapDays ?? bits.gapDays;

  const chrono = analyzeChronotype(params.sessions);
  const nowBucket = hourBucket(now.toISOString());
  const chronoMatch = !!(chrono.bucket && chrono.sample >= 3 && nowBucket === chrono.bucket);

  const fi = computeFokusIndex(params.domains);
  const weakest = [...fi.byDomain].filter((d) => d.ready).sort((a, b) => a.value - b.value)[0];
  const focusId =
    (params.focusDomains && params.focusDomains[0]) ||
    (params.primaryGoal && params.primaryGoal !== 'balance' ? params.primaryGoal : weakest?.id);

  const loudNeglect = (neglectScore ?? 0) >= 70 && bits.neglectedDomain;
  const domain = loudNeglect
    ? domainLabel(bits.neglectedDomain as string)
    : focusId
      ? domainLabel(focusId)
      : undefined;

  return {
    calibrated: params.calibrated,
    playedToday: params.playedToday,
    streak: params.streak,
    skippedYesterday: params.skippedYesterday,
    historyDays: params.daySummaries.length,
    gapDays,
    fatigueScore,
    neglectScore,
    recovery: params.recovery,
    loadEwma: params.loadEwma,
    lastQuality: params.lastQuality,
    hour: now.getHours(),
    domain,
    minutes: params.minutes,
    chrono: chronoMatch ? chrono.label : undefined,
    chronoMatch,
    asOf: now,
    lastTemplateId: params.lastTemplateId
  };
}

export function getDailyRitualCopy(params: DailyCoachParams): RitualCopy {
  return composeRitualCopy(buildRitualCopyInput(params));
}

export function getDailySpark(params: DailyCoachParams): CoachSpark {
  return toCoachSpark(getDailyRitualCopy(params));
}

export { getWeeklyDomainTips } from './coach-intel';
