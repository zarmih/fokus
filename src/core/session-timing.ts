/**
 * Session timing rules (one place, pure, tested).
 *
 * - The session budget is spent only while an exercise is actually being played: reading the
 *   instruction, the 3-2-1 countdown, a pause or a hidden tab do not consume it.
 * - Each block gets a fair share of what is left, so one exercise without its own block limit
 *   cannot eat the whole session (168 of 181 modules end only when `isTimeUp()` says so).
 * - A block interrupted by a pause or by the tab going to the background is aborted without
 *   scoring and restarted; it never produces a result the user did not play.
 */

export type SessionPhase = 'intro' | 'countdown' | 'play' | 'feedback' | 'paused' | string | undefined;

/** Never give a block less than this (a meaningful number of trials). */
export const MIN_BLOCK_SEC = 45;
/** And never more than this, even for long budgets with few blocks. */
export const MAX_BLOCK_SEC = 180;

export function blockBudgetSec(params: {
  mode: string;
  timeLeftSec: number;
  remainingBlocks: number;
  probeBlockSec?: number;
}): number {
  const { mode, timeLeftSec, remainingBlocks } = params;
  if (mode === 'calibration') return params.probeBlockSec ?? 18;
  if (mode === 'recalibration') return 30;
  const left = Math.max(0, Math.floor(timeLeftSec));
  if (mode !== 'normal') return left; // practice: one exercise, whole budget
  const share = Math.floor(left / Math.max(1, remainingBlocks));
  return Math.min(left, MAX_BLOCK_SEC, Math.max(MIN_BLOCK_SEC, share));
}

/** The session clock advances only during play, not paused, tab visible. */
export function shouldTick(phase: SessionPhase, paused: boolean, hidden: boolean): boolean {
  return phase === 'play' && !paused && !hidden;
}

/** Interrupting these phases aborts the block (restart, not scored). */
export function interruptAbortsBlock(phase: SessionPhase): boolean {
  return phase === 'play' || phase === 'countdown';
}

export interface RawBlockResult {
  accuracy: number;
  avgRtMs: number;
  rounds: number;
}

/** A block counts only if at least one trial happened and the numbers are sane. */
export function isScorableBlock(res: RawBlockResult | null | undefined): boolean {
  if (!res) return false;
  if (!Number.isFinite(res.rounds) || res.rounds < 1) return false;
  if (!Number.isFinite(res.accuracy) || res.accuracy < 0 || res.accuracy > 1) return false;
  if (!Number.isFinite(res.avgRtMs) || res.avgRtMs < 0) return false;
  return true;
}
