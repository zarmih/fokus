import type { DiffCurveKind } from '../exercises/contract';
import { DIFFICULTY_MAX, DIFFICULTY_MIN } from './engine/constants';
import type { MetricModel } from './engine/types';

export type { DiffCurveKind };

/**
 * Intra-block difficulty curves (G19).
 *
 * Adaptive Engine v2 / G10 pick the **block anchor** (the number stored on
 * ExerciseState and observed by IRT). These helpers only shape trial-to-trial
 * difficulty *around* that anchor. They never write storage and they never
 * wrap `updateExerciseState`.
 *
 * Constants below are the contract; engines should not invent a second scale.
 */

export const CURVE_DIFFICULTY_MIN = DIFFICULTY_MIN;
export const CURVE_DIFFICULTY_MAX = DIFFICULTY_MAX;

/** Subtracted from the anchor at the start of warmup (before calibration shrink). */
export const WARMUP_DROP = 1.5;
/** Added to the anchor at the peak of surge. */
export const SURGE_LIFT = 1.0;
/** Warmup never drops below this fraction of the anchor. */
export const WARMUP_FLOOR_RATIO = 0.75;
/** Below this anchor, warmup/surge amplitude scales down so probes stay mid-item. */
export const CALIBRATION_BAND = 4.0;

/** Time-boxed engines treat this window as one block shape (matches existing 70s caps). */
export const BLOCK_SHAPE_MS = 70_000;

/** Composite mix for warmup-plateau-surge (index-based plans). */
export const WARMUP_FRACTION = 0.2;
export const SURGE_FRACTION = 0.15;
export const WARMUP_END_T = 0.2;
export const SURGE_START_T = 0.85;

export type CurvePhase = 'warmup' | 'plateau' | 'surge';

export interface CurveSample {
  phase: CurvePhase;
  /** Effective trial difficulty on the 1–30 scale. */
  difficulty: number;
  /** Anchor the Adaptive Engine / staircase assigned to the block. */
  target: number;
  /** difficulty − target. Negative in warmup, ~0 on plateau, positive in surge. */
  offset: number;
  /** 0–1 position used to pick the phase (progress or index mapping). */
  t: number;
}

export interface SampleCurveOpts {
  /** Block anchor. Session still reports this number, not the surge peak. */
  target: number;
  kind?: DiffCurveKind;
  /** Continuous 0–1 progress (time-boxed engines). Ignored when index+count are set. */
  t?: number;
  /** 0-based trial index. Used with `count` for discrete schedules. */
  index?: number;
  /** Planned trial count. With `index`, builds a warmup/plateau/surge run. */
  count?: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampCurveDifficulty(n: number): number {
  if (!Number.isFinite(n)) return CURVE_DIFFICULTY_MIN;
  return clamp(n, CURVE_DIFFICULTY_MIN, CURVE_DIFFICULTY_MAX);
}

export function clampUnit(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return clamp(t, 0, 1);
}

export function isDiffCurveKind(value: unknown): value is DiffCurveKind {
  return (
    value === 'flat' ||
    value === 'warmup' ||
    value === 'plateau' ||
    value === 'surge' ||
    value === 'warmup-plateau' ||
    value === 'plateau-surge' ||
    value === 'warmup-plateau-surge'
  );
}

/**
 * Default shape by metric family.
 * Memory-span and logic keep structural params stable (no late-block surge).
 */
export function defaultCurveKind(metricModel?: MetricModel | string): DiffCurveKind {
  if (metricModel === 'memory-span' || metricModel === 'logic-correctness') {
    return 'warmup-plateau';
  }
  return 'warmup-plateau-surge';
}

export function resolveCurveKind(
  explicit?: DiffCurveKind | string,
  metricModel?: MetricModel | string
): DiffCurveKind {
  if (isDiffCurveKind(explicit)) return explicit;
  return defaultCurveKind(metricModel);
}

/** Shrink amplitude in the calibration band so a probe stays a mid-difficulty item. */
export function amplitudeScale(target: number): number {
  const t = clampCurveDifficulty(target);
  if (t >= CALIBRATION_BAND) return 1;
  return t / CALIBRATION_BAND;
}

export function warmupStart(target: number): number {
  const t = clampCurveDifficulty(target);
  const drop = WARMUP_DROP * amplitudeScale(t);
  const floor = Math.max(CURVE_DIFFICULTY_MIN, t * WARMUP_FLOOR_RATIO);
  return clamp(t - drop, floor, t);
}

export function surgePeak(target: number): number {
  const t = clampCurveDifficulty(target);
  const lift = SURGE_LIFT * amplitudeScale(t);
  return clamp(t + lift, t, CURVE_DIFFICULTY_MAX);
}

export function warmupDifficulty(target: number, localT = 0): number {
  return lerp(warmupStart(target), clampCurveDifficulty(target), clampUnit(localT));
}

export function plateauDifficulty(target: number): number {
  return clampCurveDifficulty(target);
}

export function surgeDifficulty(target: number, localT = 1): number {
  return lerp(clampCurveDifficulty(target), surgePeak(target), clampUnit(localT));
}

export function elapsedProgress(elapsedMs: number, windowMs: number = BLOCK_SHAPE_MS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (!Number.isFinite(windowMs) || windowMs <= 0) return 1;
  return clampUnit(elapsedMs / windowMs);
}

function localTInRun(position: number, runLength: number, single: number): number {
  if (runLength <= 1) return single;
  return position / (runLength - 1);
}

/**
 * Discrete phase list for a planned trial count.
 * Short blocks keep a plateau so a 1-trial probe is not a warmup-only sample.
 */
export function phaseList(count: number, kind: DiffCurveKind = 'warmup-plateau-surge'): CurvePhase[] {
  const n = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));

  if (kind === 'flat' || kind === 'plateau') {
    return Array.from({ length: n }, () => 'plateau' as const);
  }
  if (kind === 'warmup') {
    return Array.from({ length: n }, () => 'warmup' as const);
  }
  if (kind === 'surge') {
    return Array.from({ length: n }, () => 'surge' as const);
  }

  if (kind === 'warmup-plateau') {
    if (n === 1) return ['plateau'];
    const w = Math.min(n - 1, Math.max(1, Math.round(n * 0.25)));
    return [
      ...Array.from({ length: w }, () => 'warmup' as const),
      ...Array.from({ length: n - w }, () => 'plateau' as const)
    ];
  }

  if (kind === 'plateau-surge') {
    if (n === 1) return ['plateau'];
    const s = Math.min(n - 1, Math.max(1, Math.round(n * 0.2)));
    return [
      ...Array.from({ length: n - s }, () => 'plateau' as const),
      ...Array.from({ length: s }, () => 'surge' as const)
    ];
  }

  if (n === 1) return ['plateau'];
  if (n === 2) return ['warmup', 'plateau'];
  if (n === 3) return ['warmup', 'plateau', 'plateau'];
  if (n === 4) return ['warmup', 'plateau', 'plateau', 'surge'];

  let w = Math.max(1, Math.round(n * WARMUP_FRACTION));
  let s = Math.max(1, Math.round(n * SURGE_FRACTION));
  let p = n - w - s;
  if (p < 1) {
    const overflow = 1 - p;
    const fromWarmup = Math.min(w - 1, Math.ceil(overflow / 2));
    w -= fromWarmup;
    s -= overflow - fromWarmup;
    p = 1;
  }
  return [
    ...Array.from({ length: w }, () => 'warmup' as const),
    ...Array.from({ length: p }, () => 'plateau' as const),
    ...Array.from({ length: s }, () => 'surge' as const)
  ];
}

function difficultyForPhase(target: number, phase: CurvePhase, localT: number): number {
  if (phase === 'warmup') return warmupDifficulty(target, localT);
  if (phase === 'surge') return surgeDifficulty(target, localT);
  return plateauDifficulty(target);
}

function sampleAtIndex(target: number, kind: DiffCurveKind, index: number, count: number): CurveSample {
  const phases = phaseList(count, kind);
  const n = phases.length;
  const i = clamp(Math.floor(Number.isFinite(index) ? index : 0), 0, n - 1);
  const phase = phases[i];
  const runStart = phases.indexOf(phase);
  const runLength = phases.filter((p) => p === phase).length;
  const single = phase === 'surge' ? 1 : 0;
  const localT = localTInRun(i - runStart, runLength, single);
  const t = n <= 1 ? 0.5 : i / (n - 1);
  const difficulty = difficultyForPhase(target, phase, localT);
  return {
    phase,
    difficulty,
    target: clampCurveDifficulty(target),
    offset: difficulty - clampCurveDifficulty(target),
    t
  };
}

function phaseAtProgress(t: number, kind: DiffCurveKind): { phase: CurvePhase; localT: number } {
  const u = clampUnit(t);
  if (kind === 'flat' || kind === 'plateau') return { phase: 'plateau', localT: 0 };
  if (kind === 'warmup') return { phase: 'warmup', localT: u };
  if (kind === 'surge') return { phase: 'surge', localT: u };

  if (kind === 'warmup-plateau') {
    const end = 0.25;
    if (u < end) return { phase: 'warmup', localT: end <= 0 ? 0 : u / end };
    return { phase: 'plateau', localT: 0 };
  }
  if (kind === 'plateau-surge') {
    const start = 0.8;
    if (u >= start) return { phase: 'surge', localT: (u - start) / (1 - start) };
    return { phase: 'plateau', localT: 0 };
  }

  if (u < WARMUP_END_T) return { phase: 'warmup', localT: u / WARMUP_END_T };
  if (u >= SURGE_START_T) return { phase: 'surge', localT: (u - SURGE_START_T) / (1 - SURGE_START_T) };
  return { phase: 'plateau', localT: 0 };
}

/**
 * Sample the curve.
 *
 * Prefer `index` + `count` for engines with a planned trial list.
 * Use `t` (0–1) for time-boxed engines. Default `t = 0.5` (plateau) if neither
 * is given — a missing progress value must not accidentally warmup or surge.
 */
export function sampleCurve(opts: SampleCurveOpts): CurveSample {
  const target = clampCurveDifficulty(opts.target);
  const kind = resolveCurveKind(opts.kind);

  if (typeof opts.index === 'number' && typeof opts.count === 'number' && opts.count > 0) {
    return sampleAtIndex(target, kind, opts.index, opts.count);
  }

  const t = typeof opts.t === 'number' ? clampUnit(opts.t) : 0.5;
  const { phase, localT } = phaseAtProgress(t, kind);
  const difficulty = difficultyForPhase(target, phase, localT);
  return {
    phase,
    difficulty,
    target,
    offset: difficulty - target,
    t
  };
}

/** Precompute a whole block. Engines that generate trials up front should use this. */
export function planCurve(
  target: number,
  count: number,
  kind: DiffCurveKind = 'warmup-plateau-surge'
): CurveSample[] {
  const n = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  return Array.from({ length: n }, (_, index) => sampleCurve({ target, index, count: n, kind }));
}

export function progressDifficulty(opts: {
  target: number;
  progress: number;
  kind?: DiffCurveKind;
}): CurveSample {
  return sampleCurve({ target: opts.target, t: opts.progress, kind: opts.kind });
}

export function trialDifficulty(opts: {
  target: number;
  index: number;
  count: number;
  kind?: DiffCurveKind;
}): CurveSample {
  return sampleCurve({
    target: opts.target,
    index: opts.index,
    count: opts.count,
    kind: opts.kind
  });
}

/**
 * Map a level→params table through the curve.
 * `hold` pins structural fields (n-back n, grid size) to the block anchor.
 */
export function paramsAlongCurve<T>(
  getParams: (difficulty: number) => T,
  opts: SampleCurveOpts & { hold?: Partial<T> }
): { params: T; sample: CurveSample } {
  const sample = sampleCurve(opts);
  const params = { ...getParams(sample.difficulty), ...(opts.hold || {}) } as T;
  return { params, sample };
}

/**
 * Shift a deadline/ISI using the curve offset. Use this when the level table
 * is not monotonic (n-back n-bands reset delayMs).
 * Positive offset (surge) shortens the window.
 */
export function shiftDeadline(
  baseMs: number,
  offset: number,
  msPerStep = 220,
  floor = 400
): number {
  const base = Number.isFinite(baseMs) ? baseMs : floor;
  const shift = Number.isFinite(offset) ? offset * msPerStep : 0;
  return Math.max(floor, base - shift);
}

/**
 * Block-level observation must use the assigned anchor.
 * Engines can call this when they need to be explicit; session.ts already
 * records `state.difficulty` from Adaptive Engine v2 / the staircase.
 */
export function observationDifficulty(target: number): number {
  return clampCurveDifficulty(target);
}
