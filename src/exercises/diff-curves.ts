/**
 * Exercise-facing re-export of G19 intra-block curves.
 * Adaptive Engine v2 (`src/core/engine/`) does not import this module.
 */
export {
  BLOCK_SHAPE_MS,
  CALIBRATION_BAND,
  CURVE_DIFFICULTY_MAX,
  CURVE_DIFFICULTY_MIN,
  SURGE_FRACTION,
  SURGE_LIFT,
  SURGE_START_T,
  WARMUP_DROP,
  WARMUP_END_T,
  WARMUP_FLOOR_RATIO,
  WARMUP_FRACTION,
  amplitudeScale,
  clampCurveDifficulty,
  clampUnit,
  defaultCurveKind,
  elapsedProgress,
  isDiffCurveKind,
  observationDifficulty,
  paramsAlongCurve,
  phaseList,
  planCurve,
  plateauDifficulty,
  progressDifficulty,
  resolveCurveKind,
  sampleCurve,
  shiftDeadline,
  surgeDifficulty,
  surgePeak,
  trialDifficulty,
  warmupDifficulty,
  warmupStart
} from '../core/diff-curves';

export type { CurvePhase, CurveSample, DiffCurveKind, SampleCurveOpts } from '../core/diff-curves';
