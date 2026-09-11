import type { Session, SessionItem } from './types';

/**
 * Spaced difficulty — explicit, documented rules.
 *
 * After a hard success near a personal peak, do not re-hit that same peak
 * immediately: step down and wait a small number of sessions.
 * After a failure, drop gently and re-approach the failed height over
 * successful blocks instead of snapping back.
 *
 * These constants are the contract; UX copy should describe them, not hide them.
 */

export const HARD_SUCCESS_ACCURACY = 0.90;
export const FAILURE_ACCURACY = 0.65;
export const SOLID_SUCCESS_ACCURACY = 0.75;
/** Peak spacing only applies once difficulty has left the calibration band. */
export const PEAK_DIFFICULTY_FLOOR = 6.0;
export const PEAK_PROXIMITY = 0.85;
export const PEAK_COOLDOWN_SESSIONS = 2;
export const PEAK_STEP_DOWN = 0.45;
export const FAIL_MAX_DROP = 0.5;
export const REAPPROACH_CLEAR_SUCCESSES = 2;
export const REAPPROACH_CAP_MARGIN = 0.25;
export const MIN_DIFFICULTY = 1.0;
export const MAX_DIFFICULTY = 30.0;

export type SpacingMode = 'open' | 'peak-cooldown' | 'reapproach';

export type SpacingReasonCode =
  | 'open'
  | 'peak-hold'
  | 'peak-cooldown'
  | 'fail-drop'
  | 'reapproach-cap';

export interface SpacingHistoryItem {
  accuracy: number;
  difficulty: number;
  sessionIndex?: number;
}

export interface SpacingDecision {
  mode: SpacingMode;
  target: number;
  cap: number;
  reasonCode: SpacingReasonCode;
  sessionsRemaining: number;
  peakDifficulty: number;
  lastFailDifficulty: number | null;
}

export interface SpacingSnapshot {
  mode: SpacingMode;
  peakDifficulty: number;
  lastFailDifficulty: number | null;
  sessionsSincePeakSuccess: number | null;
  successesSinceFail: number | null;
  due: boolean;
  sessionsRemaining: number;
}

function clampDiff(n: number): number {
  if (!Number.isFinite(n)) return MIN_DIFFICULTY;
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, n));
}

function itemDifficulty(item: SessionItem): number {
  if (typeof item.difficultyAfter === 'number') return item.difficultyAfter;
  if (typeof item.difficultyBefore === 'number') return item.difficultyBefore;
  if (typeof item.level === 'number') return item.level;
  return 1;
}

export function isHardSuccess(accuracy: number, difficulty: number, peak: number): boolean {
  if (accuracy < HARD_SUCCESS_ACCURACY) return false;
  const peakBar = Math.max(PEAK_DIFFICULTY_FLOOR, peak * PEAK_PROXIMITY);
  return difficulty >= peakBar;
}

export function isFailure(accuracy: number): boolean {
  return accuracy < FAILURE_ACCURACY;
}

export function historyForExercise(exerciseId: string, sessions: Session[]): SpacingHistoryItem[] {
  const out: SpacingHistoryItem[] = [];
  sessions.forEach((session, sessionIndex) => {
    if (!session?.items) return;
    for (const item of session.items) {
      if (item.exerciseId !== exerciseId) continue;
      out.push({
        accuracy: item.accuracy ?? 0,
        difficulty: itemDifficulty(item),
        sessionIndex
      });
    }
  });
  return out;
}

export function inspectSpacing(params: {
  exerciseId: string;
  currentDifficulty: number;
  sessions: Session[];
}): SpacingSnapshot {
  const history = historyForExercise(params.exerciseId, params.sessions);
  const peak = Math.max(
    params.currentDifficulty,
    ...history.map((h) => h.difficulty),
    MIN_DIFFICULTY
  );

  let lastPeakSuccessIdx = -1;
  let lastPeakSession: number | null = null;
  history.forEach((h, i) => {
    if (isHardSuccess(h.accuracy, h.difficulty, peak)) {
      lastPeakSuccessIdx = i;
      lastPeakSession = typeof h.sessionIndex === 'number' ? h.sessionIndex : i;
    }
  });

  let lastFailIdx = -1;
  let lastFailDifficulty: number | null = null;
  history.forEach((h, i) => {
    if (isFailure(h.accuracy)) {
      lastFailIdx = i;
      lastFailDifficulty = h.difficulty;
    }
  });

  let successesSinceFail: number | null = null;
  if (lastFailIdx >= 0) {
    successesSinceFail = history
      .slice(lastFailIdx + 1)
      .filter((h) => h.accuracy >= SOLID_SUCCESS_ACCURACY).length;
  }

  const lastSessionIndex = history.length > 0 ? (history[history.length - 1].sessionIndex ?? 0) : 0;
  let sessionsSincePeakSuccess: number | null = null;
  if (lastPeakSession !== null) {
    sessionsSincePeakSuccess = Math.max(0, lastSessionIndex - lastPeakSession);
  }

  const inCooldown =
    lastPeakSuccessIdx >= 0 &&
    sessionsSincePeakSuccess !== null &&
    sessionsSincePeakSuccess < PEAK_COOLDOWN_SESSIONS &&
    lastPeakSuccessIdx >= lastFailIdx;

  const inReapproach =
    lastFailDifficulty !== null &&
    successesSinceFail !== null &&
    successesSinceFail < REAPPROACH_CLEAR_SUCCESSES &&
    !inCooldown;

  let mode: SpacingMode = 'open';
  if (inReapproach) mode = 'reapproach';
  else if (inCooldown) mode = 'peak-cooldown';

  const sessionsRemaining = inCooldown
    ? Math.max(0, PEAK_COOLDOWN_SESSIONS - (sessionsSincePeakSuccess || 0))
    : 0;

  return {
    mode,
    peakDifficulty: peak,
    lastFailDifficulty,
    sessionsSincePeakSuccess,
    successesSinceFail,
    due: mode === 'open' && lastPeakSuccessIdx >= 0 && !inCooldown,
    sessionsRemaining
  };
}

/**
 * Adjust a staircase proposal. `history` is prior outcomes for this exercise
 * (oldest first). The current block is `accuracy` at `currentDifficulty`.
 */
export function applySpacedDifficulty(params: {
  currentDifficulty: number;
  proposedDifficulty: number;
  accuracy: number;
  history?: SpacingHistoryItem[];
}): SpacingDecision {
  const current = clampDiff(params.currentDifficulty);
  const proposed = clampDiff(params.proposedDifficulty);
  const history = params.history || [];
  const peak = Math.max(current, ...history.map((h) => h.difficulty), MIN_DIFFICULTY);

  if (isFailure(params.accuracy)) {
    const gentle = clampDiff(current - FAIL_MAX_DROP);
    const target = Math.max(proposed, gentle);
    return {
      mode: 'reapproach',
      target,
      cap: target,
      reasonCode: 'fail-drop',
      sessionsRemaining: 0,
      peakDifficulty: peak,
      lastFailDifficulty: current
    };
  }

  let lastFailDifficulty: number | null = null;
  let lastFailIdx = -1;
  history.forEach((h, i) => {
    if (isFailure(h.accuracy)) {
      lastFailIdx = i;
      lastFailDifficulty = h.difficulty;
    }
  });
  const successesSinceFail =
    lastFailIdx >= 0
      ? history.slice(lastFailIdx + 1).filter((h) => h.accuracy >= SOLID_SUCCESS_ACCURACY).length +
        (params.accuracy >= SOLID_SUCCESS_ACCURACY ? 1 : 0)
      : null;

  if (
    lastFailDifficulty !== null &&
    successesSinceFail !== null &&
    successesSinceFail < REAPPROACH_CLEAR_SUCCESSES
  ) {
    const cap = clampDiff(lastFailDifficulty - REAPPROACH_CAP_MARGIN);
    if (proposed >= lastFailDifficulty || proposed > cap) {
      return {
        mode: 'reapproach',
        target: Math.min(proposed, cap),
        cap,
        reasonCode: 'reapproach-cap',
        sessionsRemaining: 0,
        peakDifficulty: peak,
        lastFailDifficulty
      };
    }
  }

  const hardNow = isHardSuccess(params.accuracy, current, peak);
  let lastPeakSession: number | null = null;
  history.forEach((h, i) => {
    if (isHardSuccess(h.accuracy, h.difficulty, peak)) {
      lastPeakSession = typeof h.sessionIndex === 'number' ? h.sessionIndex : i;
    }
  });
  const lastSessionIndex =
    history.length > 0 ? (history[history.length - 1].sessionIndex ?? history.length - 1) : -1;
  const sessionsSincePeak =
    lastPeakSession === null ? null : Math.max(0, lastSessionIndex - lastPeakSession);

  if (hardNow) {
    const target = clampDiff(Math.min(proposed, current - PEAK_STEP_DOWN));
    return {
      mode: 'peak-cooldown',
      target,
      cap: target,
      reasonCode: 'peak-hold',
      sessionsRemaining: PEAK_COOLDOWN_SESSIONS,
      peakDifficulty: Math.max(peak, current),
      lastFailDifficulty
    };
  }

  if (
    sessionsSincePeak !== null &&
    sessionsSincePeak < PEAK_COOLDOWN_SESSIONS &&
    proposed >= peak - 0.05
  ) {
    const cap = clampDiff(peak - PEAK_STEP_DOWN);
    return {
      mode: 'peak-cooldown',
      target: Math.min(proposed, cap),
      cap,
      reasonCode: 'peak-cooldown',
      sessionsRemaining: Math.max(0, PEAK_COOLDOWN_SESSIONS - sessionsSincePeak),
      peakDifficulty: peak,
      lastFailDifficulty
    };
  }

  return {
    mode: 'open',
    target: proposed,
    cap: MAX_DIFFICULTY,
    reasonCode: 'open',
    sessionsRemaining: 0,
    peakDifficulty: peak,
    lastFailDifficulty
  };
}
