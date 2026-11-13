/**
 * Measurement mode for the block being played (methodology v2).
 * 'accessible' variants change what is measured (e.g. odd-one by shape angle instead of hue), so the
 * session stores the mode on the block and personal trends compare only blocks of the same mode.
 */
export type ExerciseMode = 'standard' | 'accessible';

/** Exercises that have an accessible variant which does not rely on colour. */
export const ACCESSIBLE_VARIANTS: ReadonlySet<string> = new Set(['odd-one', 'stroop', 'helix-flip']);

/** What the accessible variant changes, shown on the intro card (RU, EN). */
export const ACCESSIBLE_NOTE: Record<string, [string, string]> = {
  'odd-one': ['Доступный режим: найдите стрелку с другим наклоном.', 'Accessible mode: find the arrow tilted differently.'],
  stroop: ['Доступный режим: отвечайте, куда указывает стрелка, а не что написано в ней.', 'Accessible mode: answer where the arrow points, not what it says.'],
  'helix-flip': ['Доступный режим: вместо цвета сравнивается заливка — сплошная, контур или штриховка.', 'Accessible mode: fill (solid, outline or striped) replaces colour.']
};

export type Direction = 'up' | 'down' | 'left' | 'right';
/** Accessible Stroop: the four colour ids become four directions; the engine and its congruence stay the same. */
export const STROOP_DIRECTION: Record<string, Direction> = { red: 'up', blue: 'down', green: 'left', yellow: 'right' };
export const DIRECTION_WORD: Record<Direction, [string, string]> = {
  up: ['ВВЕРХ', 'UP'], down: ['ВНИЗ', 'DOWN'], left: ['ВЛЕВО', 'LEFT'], right: ['ВПРАВО', 'RIGHT']
};
export const DIRECTION_ROTATION: Record<Direction, number> = { up: -90, down: 90, left: 180, right: 0 };

/** Accessible helix-flip: each colour maps to a fill style, so the rule never depends on hue. */
export type FillStyle = 'solid' | 'outline' | 'striped';
export const HELIX_FILL: Record<string, FillStyle> = { 'Красный': 'solid', 'Синий': 'outline', 'Зеленый': 'striped' };

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
