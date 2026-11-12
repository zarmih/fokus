/**
 * Core catalog: 15 exercises, 3 per domain (docs/core-program/core-catalog.md).
 * The daily planner draws from these during the first CORE_PROGRAM_DAYS training days.
 * Everything else stays in the catalog and in the user's history — nothing is removed.
 */
export const CORE_PROGRAM_DAYS = 14;

export const CORE_EXERCISES = {
  attention: ['odd-one', 'go-no-go', 'tide-gate'],
  memory: ['grid-memory', 'sequence', 'anchor-pair'],
  speed: ['math-sprint', 'slip-mark', 'cut-bar'],
  flexibility: ['stroop', 'switch-rule', 'helix-flip'],
  logic: ['pattern-next', 'shape-equation', 'pulley']
} as const;

export const CORE_EXERCISE_IDS: readonly string[] = Object.values(CORE_EXERCISES).flat();

const CORE_SET = new Set(CORE_EXERCISE_IDS);

export function isCoreExercise(id: string): boolean {
  return CORE_SET.has(id);
}

/** Training day of the 14-day program (1-based; counts today if not played yet). */
export function programDayNumber(playedDays: number, playedToday: boolean): number {
  return Math.max(1, playedDays + (playedToday ? 0 : 1));
}

export function inCoreProgram(programDay: number): boolean {
  return programDay <= CORE_PROGRAM_DAYS;
}

/**
 * Ids to exclude so the planner draws from the core, given what is already excluded.
 * Falls back to the full catalog when the core would cover fewer than `minDomains` domains
 * (e.g. several core domains are resting), so a plan always stays balanced.
 */
export function nonCoreExclusions(
  catalog: readonly { id: string; domain: string }[],
  alreadyExcluded: ReadonlySet<string>,
  minDomains = 3
): string[] {
  const coreLeft = catalog.filter((c) => isCoreExercise(c.id) && !alreadyExcluded.has(c.id));
  const domains = new Set(coreLeft.map((c) => c.domain));
  if (domains.size < minDomains) return [];
  return catalog.filter((c) => !isCoreExercise(c.id)).map((c) => c.id);
}
