/**
 * Bounded helpers for answer-option generation.
 *
 * Several exercises built options with `while (options.length < N) { pick random; if unique push }`.
 * When the candidate pool has fewer than N distinct values that loop never ends and freezes the tab
 * (avatar-names at level 1–2, word-pairs, shape-count for answers 0/1, dot-span above level 14).
 * These helpers always terminate: they draw without replacement from a finite pool and return fewer
 * options when the pool is too small.
 */

export type Rng = () => number;

/** Fisher–Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * `count` distinct options containing `correct`, distractors drawn first from `preferred`
 * (e.g. items seen this round), then from `fallback`. Never loops forever.
 */
export function distinctOptions<T>(
  correct: T,
  count: number,
  preferred: readonly T[],
  fallback: readonly T[] = [],
  rng: Rng = Math.random
): T[] {
  const seen = new Set<T>([correct]);
  const picks: T[] = [correct];
  for (const pool of [shuffled(preferred, rng), shuffled(fallback, rng)]) {
    for (const v of pool) {
      if (picks.length >= count) break;
      if (seen.has(v)) continue;
      seen.add(v);
      picks.push(v);
    }
  }
  return shuffled(picks, rng);
}

/** `count` distinct integers in [0, size). Clamps `count` to `size`. */
export function distinctIndices(count: number, size: number, rng: Rng = Math.random): number[] {
  const n = Math.max(0, Math.min(Math.floor(count), Math.floor(size)));
  return shuffled(Array.from({ length: Math.max(0, Math.floor(size)) }, (_, i) => i), rng).slice(0, n);
}

/** Numeric distractors near `answer`, never negative; widens the window until `count` options fit. */
export function nearbyNumberOptions(answer: number, count: number, rng: Rng = Math.random, spread = 2): number[] {
  let radius = Math.max(1, spread);
  const window = () => {
    const out: number[] = [];
    for (let v = Math.max(0, answer - radius); v <= answer + radius; v++) if (v !== answer) out.push(v);
    return out;
  };
  let candidates = window();
  while (candidates.length < count - 1) {
    radius++;
    candidates = window();
  }
  // Prefer the closest values so distractors stay plausible.
  const near = candidates.filter((v) => Math.abs(v - answer) <= Math.max(spread, radius));
  return distinctOptions(answer, count, near, [], rng);
}
