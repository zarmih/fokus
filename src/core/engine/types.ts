import type { Domain } from '../../exercises/contract';

/** The five Fokus training domains. Order is stable for vector math and UI. */
export type DomainId = Domain;

export type MetricModel =
  | 'speed-accuracy'
  | 'memory-span'
  | 'timing-precision'
  | 'logic-correctness';

export type RitualSlotKind = 'overdue' | 'due' | 'fresh';

export type RecalibrationReason = 'stale' | 'drift' | 'precision-collapse';

/**
 * Latent ability for one domain on the same 1–30 scale as exercise difficulty.
 * Posterior is a Gaussian N(theta, 1/precision) — Bayesian-lite, not MCMC.
 */
export interface DomainAbility {
  domain: DomainId;
  /** Posterior mean of latent ability θ. */
  theta: number;
  /** Inverse variance τ. Grows with consistent evidence, shrinks on contradiction. */
  precision: number;
  /** Short-horizon EWMA of observed performance (0–1500). Recent "form". */
  formEwma: number;
  /** Long-horizon EWMA of observed performance. Stable "base". */
  baseEwma: number;
  observations: number;
  lastObservedAt: string | null;
  sources: string[];
}

export interface SkillAbility {
  skill: string;
  domain: DomainId;
  theta: number;
  precision: number;
  formEwma: number;
  baseEwma: number;
  observations: number;
  lastObservedAt: string | null;
  sources: string[];
}

/**
 * Spaced-practice card for one exercise. SM-2-inspired intervals, but the
 * unit is a training block rather than a flashcard.
 */
export interface ExerciseSpacing {
  exerciseId: string;
  /** Current review interval in days (0.5–21). */
  intervalDays: number;
  /** Ease factor (1.3–2.7). Higher = intervals grow faster after success. */
  ease: number;
  dueAt: string | null;
  lastPlayedAt: string | null;
  repetitions: number;
}

export interface AbilityModel {
  version: number;
  domains: DomainAbility[];
  skills: SkillAbility[];
  spacing: ExerciseSpacing[];
  lastCalibrationAt: string | null;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  domain: DomainId;
  skills: string[];
  metricModel: MetricModel;
  /** Highest discrete level in the manifest, if known. Used as a soft cap. */
  maxLevel: number;
}

export interface Observation {
  exerciseId: string;
  domain: DomainId;
  skills: string[];
  metricModel: MetricModel;
  difficulty: number;
  accuracy: number;
  avgRtMs: number;
  targetMs: number;
  performance: number;
  rounds?: number;
  /** Tighter likelihood (calibration / recalibration probe). */
  probe?: boolean;
}

export interface DifficultyPick {
  exerciseId: string;
  difficulty: number;
  theta: number;
  beta: number;
  alpha: number;
  /** Predicted P(success) under the 2PL mapping. */
  pSuccess: number;
  targetP: number;
  reason: string;
}

export interface ScoredCandidate {
  exerciseId: string;
  domain: DomainId;
  slot: RitualSlotKind;
  score: number;
  difficulty: number;
  pSuccess: number;
  reason: string;
  trace: string;
}

export interface RitualItem {
  exerciseId: string;
  domain: DomainId;
  slot: RitualSlotKind;
  reason: string;
  difficulty: number;
  pSuccess: number;
  trace: string;
}

export interface RitualPlan {
  focusDomains: DomainId[];
  items: RitualItem[];
  targetBlocks: number;
  mix: RitualSlotKind[];
}

export interface RecalibrationDecision {
  needed: boolean;
  snoozed: boolean;
  reasons: RecalibrationReason[];
  /** Human-readable explanation for Today / Program copy. */
  summary: string;
  /** Short probe set (typically 3 blocks) if a recalibration is due. */
  probe: { exerciseId: string; domain: DomainId }[];
}

export interface EngineContext {
  nowMs: number;
  primaryGoal: string;
  rng: () => number;
}
