import type { DomainIndex, ExerciseState, Session, SkillIndex } from './types';
import { domainLabel } from './labels';
import {
  computeAbilityTrajectory,
  type AbilityTrajectory,
  type CatalogDomainRef
} from './ability-trajectory';
import {
  targetRitual,
  type RitualCatalogEntry,
  type RitualPlan
} from './ritual-targeter';

export {
  computeAbilityTrajectory,
  observationEvidence,
  updateTheta,
  collectObservations,
  THETA_PRIOR_MU,
  MIN_OBSERVATIONS_READY,
  MIN_SESSIONS_READY
} from './ability-trajectory';
export type { AbilityTrajectory, DomainTrajectory, AbilityTrend, BlockObservation } from './ability-trajectory';

export {
  applySpacedDifficulty,
  inspectSpacing,
  historyForExercise,
  isHardSuccess,
  isFailure,
  HARD_SUCCESS_ACCURACY,
  FAILURE_ACCURACY,
  PEAK_DIFFICULTY_FLOOR,
  PEAK_COOLDOWN_SESSIONS,
  PEAK_STEP_DOWN,
  FAIL_MAX_DROP,
  REAPPROACH_CLEAR_SUCCESSES
} from './spaced-difficulty';
export type { SpacingDecision, SpacingMode, SpacingSnapshot } from './spaced-difficulty';

export {
  targetRitual,
  ritualSlotCount,
  EXPLORATION_BUDGET,
  MIN_SLOTS,
  MAX_SLOTS
} from './ritual-targeter';
export type { RitualPlan, RitualSlot, RitualReason, RitualCatalogEntry } from './ritual-targeter';

export interface AbilityTrendChip {
  label: string;
  domain: string;
  trend: string;
  aria: string;
}

export const ADAPTIVE_SETTINGS_COPY = {
  title: 'Как подстраивается сложность',
  body: 'Fokus ведёт траекторию по пяти областям из точности, времени ответа и сложности, которые уже сохраняются после блоков. После удачного пика та же высота не предлагается сразу — даём паузу. После сбоя подходим мягче. Это не IQ и не диагноз.'
};

export function abilityTrendChip(trajectory: AbilityTrajectory): AbilityTrendChip | null {
  if (!trajectory.ready || !trajectory.headline) return null;
  const d = trajectory.headline;
  const name = domainLabel(d.domain);
  let label = `${name} стабильно`;
  let spoken = `Тренд способности: ${name} стабильно`;
  if (d.trend === 'rising') {
    label = `${name} растёт`;
    spoken = `Тренд способности: ${name} растёт`;
  } else if (d.trend === 'falling') {
    label = `${name} проседает`;
    spoken = `Тренд способности: ${name} проседает`;
  }
  return { label, domain: d.domain, trend: d.trend, aria: spoken };
}

export function describeAdaptiveDepth(params: {
  sessions?: Session[];
  domains?: DomainIndex[];
  skills?: SkillIndex[];
  states?: ExerciseState[];
  catalog?: RitualCatalogEntry[] | null;
  durationSec?: number;
  primaryGoal?: string;
  now?: number;
  rng?: () => number;
}): {
  trajectory: AbilityTrajectory;
  ritual: RitualPlan | null;
  chip: AbilityTrendChip | null;
  why: string | null;
} {
  const catalog = params.catalog || [];
  const catalogRefs: CatalogDomainRef[] = catalog.map((c) => ({
    id: c.manifest.id,
    domain: c.manifest.domain
  }));
  const trajectory = computeAbilityTrajectory({
    sessions: params.sessions,
    domains: params.domains,
    catalog: catalogRefs
  });
  const ritual = targetRitual({
    catalog: params.catalog,
    domains: params.domains,
    skills: params.skills,
    states: params.states,
    sessions: params.sessions,
    durationSec: params.durationSec,
    primaryGoal: params.primaryGoal,
    now: params.now,
    rng: params.rng,
    trajectory
  });
  return {
    trajectory,
    ritual,
    chip: abilityTrendChip(trajectory),
    why: ritual?.why || null
  };
}
