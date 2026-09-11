import type { DaySummary, ExerciseState, HistoryItem, Session } from './types';
import {
  addCalendarDays,
  calendarDayKey,
  computeDayStreak,
  extractPlayedDays,
  resolveFokusTimeZone,
  type DayStreak,
  type ResolvedTimeZone
} from './streak';

/** Rolling window for the weekly continuity index. */
export const WEEK_WINDOW_DAYS = 7;
/** Completed misses that trigger a shorter / familiar return (not a fake freeze). */
export const SOFT_RETURN_MISSES_MIN = 1;
export const SOFT_RETURN_MISSES_MAX = 2;
/** Cap the return session at the product's shortest ritual (5 min). */
export const SOFT_RETURN_DURATION_SEC = 300;
/** Need this many eligible days before the 0–1 index is shown as a score. */
export const CONTINUITY_MIN_ELIGIBLE_DAYS = 4;

export const GAP_PENALTY_1 = 0.06;
export const GAP_PENALTY_2 = 0.14;
export const GAP_PENALTY_LONG_PER_DAY = 0.08;
export const GAP_PENALTY_LONG_CAP = 0.36;

export interface WeeklyContinuity {
  /** 0–1 habit-regularity index. 0 when there is nothing to score. */
  score: number;
  windowDays: number;
  completedDays: number;
  eligibleDays: number;
  gapCount: number;
  longestGap: number;
  /** False → UI must no-op (empty history, or too few days since first play). */
  sufficient: boolean;
}

export interface GentleReturn {
  active: boolean;
  openMisses: number;
  durationCapSec: number;
  preferFamiliar: boolean;
  familiarDomains: string[];
  familiarExerciseIds: string[];
}

export interface CatalogHint {
  id: string;
  domain: string;
}

export interface RitualPlanItem {
  exerciseId: string;
  reason: string;
}

export interface ContinuitySnapshot {
  timeZone: string;
  timeZoneSource: ResolvedTimeZone['source'];
  today: string;
  playedDays: string[];
  streak: DayStreak;
  weekly: WeeklyContinuity;
  ritual: GentleReturn;
}

export interface ContinuityInput {
  now?: Date | string;
  timeZone?: string;
  daySummaries?: DaySummary[];
  sessions?: Session[];
  history?: HistoryItem[];
  exerciseStates?: ExerciseState[];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(clamp01(n) * 100) / 100;
}

function penaltyForRun(run: number): number {
  if (run <= 0) return 0;
  if (run === 1) return GAP_PENALTY_1;
  if (run === 2) return GAP_PENALTY_2;
  return Math.min(GAP_PENALTY_LONG_CAP, run * GAP_PENALTY_LONG_PER_DAY);
}

/**
 * Weekly continuity 0–1 = completion rate in the eligible window minus gap penalties.
 *
 * Eligible days start at first play (new users are not punished for days before they existed)
 * and exclude today when it is still unplayed (the day is not over).
 *
 * Modest claim only: local ritual regularity, not ability, IQ, or “brain age”.
 */
export function weeklyContinuityScore(
  playedDays: string[],
  today: string,
  windowDays = WEEK_WINDOW_DAYS
): WeeklyContinuity {
  const empty: WeeklyContinuity = {
    score: 0,
    windowDays,
    completedDays: 0,
    eligibleDays: 0,
    gapCount: 0,
    longestGap: 0,
    sufficient: false
  };
  if (!playedDays.length) return empty;

  const played = new Set(playedDays);
  const first = [...played].sort()[0];
  const window: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) window.push(addCalendarDays(today, -i));

  const playedToday = played.has(today);
  const eligible = window.filter((d) => d >= first && (d < today || playedToday));
  if (eligible.length === 0) return empty;

  let completedDays = 0;
  let gapCount = 0;
  let longestGap = 0;
  let run = 0;
  let penalty = 0;

  const flush = () => {
    if (run <= 0) return;
    gapCount += 1;
    if (run > longestGap) longestGap = run;
    penalty += penaltyForRun(run);
    run = 0;
  };

  for (const day of eligible) {
    if (played.has(day)) {
      completedDays += 1;
      flush();
    } else {
      run += 1;
    }
  }
  flush();

  const completionRate = completedDays / eligible.length;
  const score = round2(completionRate - penalty);
  return {
    score,
    windowDays,
    completedDays,
    eligibleDays: eligible.length,
    gapCount,
    longestGap,
    sufficient: eligible.length >= CONTINUITY_MIN_ELIGIBLE_DAYS
  };
}

function uniqueRecent(ids: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * After a 1–2 day gap, bias toward a shorter familiar ritual.
 * Empty history and 0-miss / long-break states are a no-op (active = false).
 * Does not import adaptive / session-builder / insights — compose beside them.
 */
export function gentleReturnRitual(params: {
  streak: DayStreak;
  sessions?: Session[];
  daySummaries?: DaySummary[];
  exerciseStates?: ExerciseState[];
}): GentleReturn {
  const inactive: GentleReturn = {
    active: false,
    openMisses: params.streak.openMisses,
    durationCapSec: SOFT_RETURN_DURATION_SEC,
    preferFamiliar: false,
    familiarDomains: [],
    familiarExerciseIds: []
  };

  if (params.streak.status === 'empty') return inactive;

  const exerciseIds: string[] = [];
  const sessions = params.sessions || [];
  for (let i = sessions.length - 1; i >= 0; i--) {
    const items = sessions[i].items || [];
    for (let j = items.length - 1; j >= 0; j--) {
      exerciseIds.push(items[j].exerciseId);
    }
  }
  const states = [...(params.exerciseStates || [])]
    .filter((s) => s.lastPlayedAt)
    .sort((a, b) => (a.lastPlayedAt < b.lastPlayedAt ? 1 : -1));
  for (const s of states) exerciseIds.push(s.exerciseId);

  const domains: string[] = [];
  const summaries = params.daySummaries || [];
  for (let i = summaries.length - 1; i >= 0; i--) {
    const deltas = summaries[i].domainDeltas || {};
    for (const key of Object.keys(deltas)) domains.push(key);
  }

  const familiarExerciseIds = uniqueRecent(exerciseIds, 6);
  const familiarDomains = uniqueRecent(domains, 3);

  const active =
    !params.streak.playedToday &&
    params.streak.openMisses >= SOFT_RETURN_MISSES_MIN &&
    params.streak.openMisses <= SOFT_RETURN_MISSES_MAX;

  if (!active) {
    return { ...inactive, familiarDomains, familiarExerciseIds };
  }

  return {
    active: true,
    openMisses: params.streak.openMisses,
    durationCapSec: SOFT_RETURN_DURATION_SEC,
    preferFamiliar: familiarExerciseIds.length > 0 || familiarDomains.length > 0,
    familiarDomains,
    familiarExerciseIds
  };
}

/**
 * Reorder an already-built plan toward familiar exercises/domains.
 * No-op when the ritual is inactive, the plan is empty, or nothing familiar is known
 * (covers unmerged program/adaptive PRs and empty history).
 */
export function applyGentleReturnBias(
  plan: { focusDomains: string[]; items: RitualPlanItem[] },
  ritual: GentleReturn,
  catalog: CatalogHint[] = []
): { focusDomains: string[]; items: RitualPlanItem[]; applied: boolean } {
  if (!ritual.active || !plan.items.length) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false };
  }

  const famEx = new Set(ritual.familiarExerciseIds);
  const famDom = new Set(ritual.familiarDomains);
  const domainOf = (id: string) => catalog.find((c) => c.id === id)?.domain;

  const scored = plan.items.map((item, index) => {
    let rank = index;
    if (famEx.has(item.exerciseId)) rank -= 100;
    const domain = domainOf(item.exerciseId);
    if (domain && famDom.has(domain)) rank -= 50;
    return { item, rank, index };
  });
  const changed = scored.some((row) => row.rank !== row.index);
  if (!changed) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false };
  }
  scored.sort((a, b) => a.rank - b.rank || a.index - b.index);

  const items = scored.map((row) => {
    if (row.rank >= row.index) return row.item;
    return { ...row.item, reason: 'Знакомый блок для мягкого возврата' };
  });

  const focusDomains =
    ritual.familiarDomains.length > 0
      ? ritual.familiarDomains.slice(0, 2)
      : plan.focusDomains;

  return { focusDomains, items, applied: true };
}

export function buildContinuitySnapshot(input: ContinuityInput = {}): ContinuitySnapshot {
  const resolved = resolveFokusTimeZone(input.timeZone);
  const now = input.now === undefined ? new Date() : input.now instanceof Date ? input.now : new Date(input.now);
  const today = calendarDayKey(Number.isNaN(now.getTime()) ? new Date() : now, resolved.timeZone);
  const playedDays = extractPlayedDays(
    {
      daySummaries: input.daySummaries,
      sessions: input.sessions,
      history: input.history
    },
    resolved.timeZone
  );
  const streak = computeDayStreak(playedDays, today);
  const weekly = weeklyContinuityScore(playedDays, today);
  const ritual = gentleReturnRitual({
    streak,
    sessions: input.sessions,
    daySummaries: input.daySummaries,
    exerciseStates: input.exerciseStates
  });
  return {
    timeZone: resolved.timeZone,
    timeZoneSource: resolved.source,
    today,
    playedDays,
    streak,
    weekly,
    ritual
  };
}

export interface ContinuityStore {
  getDaySummaries: (limit?: number) => DaySummary[];
  getSessions: () => Session[];
  getHistory: () => HistoryItem[];
  getExerciseStates: () => ExerciseState[];
}

/** Thin loader used by Today / Stats / Settings. Safe with empty storage. */
export function loadContinuitySnapshot(store: ContinuityStore, now?: Date | string): ContinuitySnapshot {
  return buildContinuitySnapshot({
    now,
    daySummaries: store.getDaySummaries(365),
    sessions: store.getSessions(),
    history: store.getHistory(),
    exerciseStates: store.getExerciseStates()
  });
}

export function ritualDurationSec(profileLengthSec: number, ritual: GentleReturn): number {
  if (!ritual.active) return profileLengthSec;
  return Math.min(profileLengthSec, ritual.durationCapSec);
}
