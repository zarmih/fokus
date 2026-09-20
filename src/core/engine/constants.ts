import type { DomainId, MetricModel } from './types';

export const ENGINE_VERSION = 2;

export const DOMAIN_IDS: readonly DomainId[] = [
  'memory',
  'attention',
  'logic',
  'speed',
  'flexibility'
];

/** Map each cognitive skill onto its parent domain. */
export const SKILL_DOMAIN: Record<string, DomainId> = {
  working_memory: 'memory',
  visual_memory: 'memory',
  spatial_memory: 'memory',
  recall: 'memory',
  selective_attention: 'attention',
  sustained_attention: 'attention',
  divided_attention: 'attention',
  inhibition: 'attention',
  processing_speed: 'speed',
  reaction_speed: 'speed',
  visual_scanning: 'speed',
  task_switching: 'flexibility',
  rule_switching: 'flexibility',
  cognitive_flexibility: 'flexibility',
  pattern_recognition: 'logic',
  logical_reasoning: 'logic',
  spatial_reasoning: 'logic',
  mental_calculation: 'logic',
  estimation: 'logic',
  numerical_processing: 'logic'
};

/**
 * 2PL discrimination α by metric family.
 * Memory span is well-ordered (steep), timing is noisier (shallower).
 */
export const DISCRIMINATION: Record<MetricModel, number> = {
  'memory-span': 1.35,
  'logic-correctness': 1.15,
  'speed-accuracy': 1.0,
  'timing-precision': 0.85,
  'sequence-accuracy': 1.0,
  'capacity': 1.35
};

export const DEFAULT_ALPHA = 1.0;

/** Prior for a never-seen domain: modest ability, wide posterior. */
export const PRIOR_THETA = 5.0;
export const PRIOR_PRECISION = 0.4;
export const PRIOR_PERFORMANCE = 500;

/** EWMA alphas: form tracks recent sessions, base is the slow career curve. */
export const FORM_ALPHA = 0.32;
export const BASE_ALPHA = 0.07;

/** Likelihood noise on the difficulty scale for a typical block. */
export const BLOCK_NOISE_VAR = 2.6;
export const PROBE_NOISE_VAR = 1.15;

/** Precision reference: τ ≈ 4 → ~80% UI confidence. */
export const PRECISION_REF = 4.0;

export const THETA_MIN = 1.0;
export const THETA_MAX = 28.0;
export const DIFFICULTY_MIN = 1.0;
export const DIFFICULTY_MAX = 30.0;
/** Max jump away from stored exercise difficulty in one block. */
export const MAX_DIFFICULTY_STEP = 2.0;

export const PERF_MIN = 0;
export const PERF_MAX = 1500;

/** Target P(success) range. Low confidence → gentler; high confidence → harder. */
export const TARGET_P_LO_CONF = 0.8;
export const TARGET_P_HI_CONF = 0.65;
export const TARGET_P_FLOOR = 0.62;
export const TARGET_P_CEIL = 0.82;

export const FORM_ALPHA_EASY_DAY = 0.08;

export const SPACING_EASE_MIN = 1.3;
export const SPACING_EASE_MAX = 2.7;
export const SPACING_INTERVAL_MIN = 0.5;
export const SPACING_INTERVAL_MAX = 21;
export const SPACING_DEFAULT_INTERVAL = 1.0;
export const SPACING_DEFAULT_EASE = 2.1;

export const RECAL_STALE_DAYS = 14;
export const RECAL_DRIFT_RATIO = 0.22;
export const RECAL_DRIFT_DOMAINS = 2;
export const RECAL_MIN_OBS = 6;
export const RECAL_PRECISION_COLLAPSE = 0.55;
export const RECAL_SNOOZE_DAYS = 3;
export const RECAL_PROBE_BLOCKS = 3;

export const RITUAL_BLOCK_SEC = 180;
