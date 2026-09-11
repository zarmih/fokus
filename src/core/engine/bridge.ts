import type { ExerciseManifest } from '../../exercises/contract';
import type { DomainIndex, ExerciseState, SkillIndex } from '../types';
import { bootstrapAbilityModel, createAbilityModel, observeBlock } from './ability';
import { catalogFromManifests } from './catalog';
import { RECAL_SNOOZE_DAYS } from './constants';
import { selectDifficulty } from './irt';
import { evaluateRecalibration, isRecalibrationActive } from './recalibration';
import { composeRitual } from './ritual';
import { scheduleAfter, upsertSpacing, getSpacing } from './scheduler';
import { addDaysIso, isoFromMs } from './math';
import type {
  AbilityModel,
  CatalogItem,
  DifficultyPick,
  Observation,
  RecalibrationDecision,
  RitualPlan
} from './types';

export interface AdaptivePlanItem {
  exerciseId: string;
  reason: string;
  slot?: 'overdue' | 'due' | 'fresh';
  difficulty?: number;
  pSuccess?: number;
  domain?: string;
}

export interface AdaptivePlan {
  source: 'engine' | 'legacy';
  focusDomains: string[];
  items: AdaptivePlanItem[];
  recalibration: RecalibrationDecision;
  ritual?: RitualPlan;
}

export interface LegacyPlan {
  focusDomains: string[];
  items: { exerciseId: string; reason: string }[];
}

export interface AdaptivePlanParams {
  durationSec: number;
  catalog: { manifest: ExerciseManifest }[];
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  primaryGoal?: string;
  abilityModel?: AbilityModel | null;
  lastCalibrationAt?: string | null;
  snoozedUntil?: string | null;
  excludeIds?: string[];
  nowMs?: number;
  rng?: () => number;
}

/**
 * Primary entry used by Today / Session / Program / Result.
 * Always returns a plan: engine first, legacy builder if the catalog is
 * unusable (Phase 2 program PRs not merged, empty registry, etc.).
 */
export function buildAdaptivePlan(
  params: AdaptivePlanParams,
  legacyBuild?: (p: AdaptivePlanParams) => LegacyPlan
): AdaptivePlan {
  const nowMs = params.nowMs ?? Date.now();
  const catalogItems = catalogFromManifests(params.catalog || []);
  const recalibrationEmpty: RecalibrationDecision = {
    needed: false,
    snoozed: false,
    reasons: [],
    summary: '',
    probe: []
  };

  if (catalogItems.length === 0) {
    return fallback(params, legacyBuild, recalibrationEmpty, 'legacy');
  }

  try {
    const model = resolveModel(params, catalogItems, nowMs);
    const ritual = composeRitual({
      model,
      catalog: catalogItems,
      states: params.states || [],
      durationSec: params.durationSec,
      primaryGoal: params.primaryGoal,
      nowMs,
      excludeIds: params.excludeIds,
      rng: params.rng
    });

    if (!ritual.items.length) {
      return fallback(params, legacyBuild, recalibrationEmpty, 'legacy');
    }

    const recalibration = evaluateRecalibration({
      model,
      catalog: catalogItems,
      nowMs,
      snoozedUntil: params.snoozedUntil,
      primaryGoal: params.primaryGoal
    });

    return {
      source: 'engine',
      focusDomains: ritual.focusDomains,
      items: ritual.items.map((it) => ({
        exerciseId: it.exerciseId,
        reason: it.reason,
        slot: it.slot,
        difficulty: it.difficulty,
        pSuccess: it.pSuccess,
        domain: it.domain
      })),
      recalibration,
      ritual
    };
  } catch {
    return fallback(params, legacyBuild, recalibrationEmpty, 'legacy');
  }
}

function fallback(
  params: AdaptivePlanParams,
  legacyBuild: ((p: AdaptivePlanParams) => LegacyPlan) | undefined,
  recalibration: RecalibrationDecision,
  source: 'engine' | 'legacy'
): AdaptivePlan {
  const plan = legacyBuild
    ? legacyBuild(params)
    : { focusDomains: [], items: [] as AdaptivePlanItem[] };
  return {
    source,
    focusDomains: plan.focusDomains || [],
    items: plan.items || [],
    recalibration
  };
}

export function resolveModel(
  params: Pick<AdaptivePlanParams, 'abilityModel' | 'domains' | 'skills' | 'states' | 'lastCalibrationAt'>,
  catalog: CatalogItem[],
  nowMs: number
): AbilityModel {
  if (params.abilityModel && params.abilityModel.domains?.length) {
    return params.abilityModel;
  }
  return bootstrapAbilityModel({
    domains: params.domains || [],
    skills: params.skills || [],
    states: params.states || [],
    catalog,
    lastCalibrationAt: params.lastCalibrationAt ?? null,
    nowMs
  });
}

export function pickPlayDifficulty(params: {
  model: AbilityModel;
  catalog: CatalogItem[];
  exerciseId: string;
  storedDifficulty: number;
  rng?: () => number;
}): DifficultyPick {
  const item = params.catalog.find((c) => c.id === params.exerciseId);
  if (!item) {
    return {
      exerciseId: params.exerciseId,
      difficulty: params.storedDifficulty,
      theta: params.storedDifficulty,
      beta: params.storedDifficulty,
      alpha: 1,
      pSuccess: 0.72,
      targetP: 0.72,
      reason: 'Сохранённый уровень'
    };
  }
  return selectDifficulty({
    model: params.model,
    item,
    storedDifficulty: params.storedDifficulty,
    rng: params.rng
  });
}

export function applyObservation(
  model: AbilityModel,
  obs: Observation,
  nowMs: number
): AbilityModel {
  let next = observeBlock(model, obs, nowMs);
  const spacing = scheduleAfter(getSpacing(next, obs.exerciseId), obs.accuracy, nowMs);
  next = upsertSpacing(next, spacing);
  if (obs.probe) {
    next = { ...next, lastCalibrationAt: isoFromMs(nowMs), updatedAt: isoFromMs(nowMs) };
  }
  return next;
}

export function snoozeUntil(nowMs: number, days = RECAL_SNOOZE_DAYS): string {
  return addDaysIso(isoFromMs(nowMs), days);
}

export function ensureModel(model: AbilityModel | null | undefined, nowMs: number): AbilityModel {
  if (model && model.domains?.length) return model;
  return createAbilityModel(nowMs);
}

export { isRecalibrationActive };
