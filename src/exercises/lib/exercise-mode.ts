/**
 * Measurement mode for the block being played (methodology v2).
 * 'accessible' variants change what is measured (e.g. odd-one by shape angle instead of hue), so the
 * session stores the mode on the block and personal trends compare only blocks of the same mode.
 */
export type ExerciseMode = 'standard' | 'accessible';

/** Exercises that have an accessible variant which does not rely on colour. */
export const ACCESSIBLE_VARIANTS: ReadonlySet<string> = new Set(['odd-one']);

let current: ExerciseMode = 'standard';

export function setExerciseMode(mode: ExerciseMode): void {
  current = mode;
}

export function getExerciseMode(): ExerciseMode {
  return current;
}

export function modeFor(exerciseId: string, accessiblePreferred: boolean | undefined): ExerciseMode {
  return accessiblePreferred && ACCESSIBLE_VARIANTS.has(exerciseId) ? 'accessible' : 'standard';
}

/** Accessible odd-one: same base colour, the odd tile's arrow is rotated; smaller hue gap → smaller angle. */
export function oddOneAngleDeg(deltaHue: number): number {
  return Math.max(8, Math.min(90, Math.round(deltaHue * 1.5)));
}
