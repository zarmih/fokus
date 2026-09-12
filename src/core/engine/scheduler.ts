import {
  RITUAL_BLOCK_SEC,
  SPACING_DEFAULT_EASE,
  SPACING_DEFAULT_INTERVAL,
  SPACING_EASE_MAX,
  SPACING_EASE_MIN,
  SPACING_INTERVAL_MAX,
  SPACING_INTERVAL_MIN
} from './constants';
import { addDaysIso, clip, daysBetween, isoFromMs } from './math';
import type { AbilityModel, ExerciseSpacing, RitualSlotKind } from './types';

export function getSpacing(model: AbilityModel, exerciseId: string): ExerciseSpacing {
  return (
    model.spacing.find((s) => s.exerciseId === exerciseId) || {
      exerciseId,
      intervalDays: SPACING_DEFAULT_INTERVAL,
      ease: SPACING_DEFAULT_EASE,
      dueAt: null,
      lastPlayedAt: null,
      repetitions: 0
    }
  );
}

/**
 * Classify an exercise into a ritual slot.
 *
 *  - fresh: never trained, or fewer than 2 successful reviews
 *  - overdue: past dueAt by half a day or more
 *  - due: inside the review window (slightly early is OK so a 15-minute
 *    ritual can absorb "today's" cards)
 *
 * This is Leitner/SM-2 in spirit, not a clone: the "card" is a whole
 * cognitive block, and the mix of slots is what builds the daily ritual.
 */
export function classifySlot(spacing: ExerciseSpacing, nowMs: number): RitualSlotKind {
  if (!spacing.lastPlayedAt || spacing.repetitions < 1) return 'fresh';
  if (!spacing.dueAt) return 'due';
  const daysLate = daysBetween(spacing.dueAt, nowMs);
  if (daysLate >= 0.5) return 'overdue';
  if (daysLate >= -0.35) return 'due';
  // Reviewed recently and not yet in the window — treat as fresh-explore
  // only when the exercise is still new; otherwise it rests.
  if (spacing.repetitions < 2) return 'fresh';
  return 'due';
}

export function urgency(spacing: ExerciseSpacing, nowMs: number): number {
  const slot = classifySlot(spacing, nowMs);
  if (slot === 'fresh') return 0.35 + (spacing.repetitions === 0 ? 0.4 : 0);
  if (!spacing.dueAt) return 0.5;
  const late = Math.max(0, daysBetween(spacing.dueAt, nowMs));
  if (slot === 'overdue') return 1 + late;
  return 0.55 + Math.max(0, -daysBetween(spacing.dueAt, nowMs)) * -0.1;
}

/**
 * SM-2-like interval update after a block.
 * Quality is derived from accuracy (and a mild RT hint lives in the caller
 * via performance, not here — spacing cares about "did it stick").
 */
export function scheduleAfter(spacing: ExerciseSpacing, accuracy: number, nowMs: number): ExerciseSpacing {
  const at = isoFromMs(nowMs);
  let ease = spacing.ease || SPACING_DEFAULT_EASE;
  let interval = spacing.intervalDays || SPACING_DEFAULT_INTERVAL;
  const reps = spacing.repetitions + 1;

  if (accuracy >= 0.9) {
    ease += 0.12;
    interval = reps === 1 ? 1.2 : interval * ease;
  } else if (accuracy >= 0.75) {
    ease += 0.03;
    interval = reps === 1 ? 1.0 : interval * 1.2;
  } else if (accuracy >= 0.6) {
    ease -= 0.05;
    interval = Math.max(SPACING_INTERVAL_MIN, interval * 0.9);
  } else {
    ease -= 0.2;
    interval = Math.max(SPACING_INTERVAL_MIN, interval * 0.5);
  }

  ease = clip(ease, SPACING_EASE_MIN, SPACING_EASE_MAX);
  interval = clip(interval, SPACING_INTERVAL_MIN, SPACING_INTERVAL_MAX);

  return {
    exerciseId: spacing.exerciseId,
    intervalDays: interval,
    ease,
    lastPlayedAt: at,
    dueAt: addDaysIso(at, interval),
    repetitions: reps
  };
}

export function upsertSpacing(model: AbilityModel, next: ExerciseSpacing): AbilityModel {
  const spacing = model.spacing.filter((s) => s.exerciseId !== next.exerciseId);
  spacing.push(next);
  return { ...model, spacing };
}

/**
 * Slot mix for a ~15 minute ritual.
 * 5 min → 3 blocks (overdue, due, fresh)
 * 8 min → 4 (2 overdue, due, fresh)
 * 12–15 min → 5 (2 overdue, 2 due, 1 fresh)
 */
export function targetBlockCount(durationSec: number): number {
  if (durationSec >= 720) return 5;
  if (durationSec >= 480) return 4;
  if (durationSec >= 360) return 4;
  return 3;
}

export function slotMix(blockCount: number): RitualSlotKind[] {
  if (blockCount <= 3) return ['overdue', 'due', 'fresh'];
  if (blockCount === 4) return ['overdue', 'overdue', 'due', 'fresh'];
  return ['overdue', 'overdue', 'due', 'due', 'fresh'];
}

export function durationForBlocks(blocks: number): number {
  return blocks * RITUAL_BLOCK_SEC;
}

export const SLOT_LABEL: Record<RitualSlotKind, string> = {
  overdue: 'Просрочено',
  due: 'Слот дня',
  fresh: 'Новое'
};

export const SLOT_REASON: Record<RitualSlotKind, string> = {
  overdue: 'Давно не тренировали этот навык',
  due: 'Оптимальное время для закрепления',
  fresh: 'Новый вызов для мозга'
};
