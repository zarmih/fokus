export { ENGINE_VERSION, DOMAIN_IDS, SKILL_DOMAIN, RECAL_SNOOZE_DAYS, RECAL_STALE_DAYS } from './constants';
export type {
  AbilityModel,
  CatalogItem,
  DifficultyPick,
  DomainAbility,
  DomainId,
  Observation,
  RecalibrationDecision,
  RitualItem,
  RitualPlan,
  RitualSlotKind,
  SkillAbility
} from './types';

export {
  bootstrapAbilityModel,
  confidencePct,
  createAbilityModel,
  domainDrift,
  getDomain,
  impliedTheta,
  markCalibrated,
  observeBlock,
  projectDomainIndex
} from './ability';

export { catalogFromManifests } from './catalog';
export { selectDifficulty, targetSuccessProb } from './irt';
export { twoPl, logit, fisher2pl } from './math';
export { evaluateRecalibration, isRecalibrationActive, pickProbe } from './recalibration';
export { composeRitual } from './ritual';
export {
  classifySlot,
  getSpacing,
  scheduleAfter,
  slotMix,
  SLOT_LABEL,
  SLOT_REASON,
  targetBlockCount
} from './scheduler';
export {
  applyObservation,
  buildAdaptivePlan,
  ensureModel,
  pickPlayDifficulty,
  resolveModel,
  snoozeUntil
} from './bridge';
export type { AdaptivePlan, AdaptivePlanItem, AdaptivePlanParams } from './bridge';
