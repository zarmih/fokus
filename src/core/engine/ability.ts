import {
  BASE_ALPHA,
  BLOCK_NOISE_VAR,
  DISCRIMINATION,
  DOMAIN_IDS,
  ENGINE_VERSION,
  FORM_ALPHA,
  PERF_MAX,
  PERF_MIN,
  PRECISION_REF,
  PRIOR_PERFORMANCE,
  PRIOR_PRECISION,
  PRIOR_THETA,
  PROBE_NOISE_VAR,
  SKILL_DOMAIN,
  THETA_MAX,
  THETA_MIN
} from './constants';
import { clip, daysBetween, isoFromMs, logit, performanceToTheta, thetaToPerformance } from './math';
import type {
  AbilityModel,
  CatalogItem,
  DomainAbility,
  DomainId,
  Observation,
  SkillAbility
} from './types';
import type { DomainIndex, ExerciseState, SkillIndex } from '../types';

export function emptyDomain(domain: DomainId): DomainAbility {
  return {
    domain,
    theta: PRIOR_THETA,
    precision: PRIOR_PRECISION,
    formEwma: PRIOR_PERFORMANCE,
    baseEwma: PRIOR_PERFORMANCE,
    observations: 0,
    lastObservedAt: null,
    sources: []
  };
}

export function emptySkill(skill: string, domain: DomainId): SkillAbility {
  return {
    skill,
    domain,
    theta: PRIOR_THETA,
    precision: PRIOR_PRECISION * 0.8,
    formEwma: PRIOR_PERFORMANCE,
    baseEwma: PRIOR_PERFORMANCE,
    observations: 0,
    lastObservedAt: null,
    sources: []
  };
}

export function createAbilityModel(nowMs: number, lastCalibrationAt: string | null = null): AbilityModel {
  return {
    version: ENGINE_VERSION,
    domains: DOMAIN_IDS.map(emptyDomain),
    skills: [],
    spacing: [],
    lastCalibrationAt,
    updatedAt: isoFromMs(nowMs)
  };
}

export function getDomain(model: AbilityModel, domain: DomainId): DomainAbility {
  return model.domains.find((d) => d.domain === domain) || emptyDomain(domain);
}

export function getSkill(model: AbilityModel, skill: string, domain: DomainId): SkillAbility {
  return model.skills.find((s) => s.skill === skill) || emptySkill(skill, domain);
}

/**
 * UI confidence 0–100 from precision.
 * 1 - exp(-τ / τ_ref) is asymptotic: never quite 100, climbs fast then slows.
 * Diversity of sources raises the ceiling (one-exercise evidence is discounted).
 */
export function confidence01(precision: number, sources = 1): number {
  const diversity = sources <= 1 ? 0.72 : sources === 2 ? 0.9 : 1;
  return clip(1 - Math.exp(-precision / PRECISION_REF), 0, 1) * diversity;
}

export function confidencePct(precision: number, sources = 1): number {
  return Math.round(confidence01(precision, sources) * 100);
}

/**
 * Invert the 2PL: given the item they actually faced (β = difficulty) and
 * the observed accuracy, the implied ability is
 *   θ̂ = β + logit(a) / α
 * A 72% block at difficulty 8 implies θ̂ ≈ 8; 90% implies the item was easy
 * relative to ability, so θ̂ sits above 8.
 */
export function impliedTheta(obs: Observation): number {
  const alpha = DISCRIMINATION[obs.metricModel] || 1;
  const acc = clip(obs.accuracy, 0.05, 0.95);
  let thetaHat = obs.difficulty + logit(acc) / alpha;

  if (obs.metricModel !== 'memory-span' && obs.avgRtMs > 0 && obs.targetMs > 0) {
    const ratio = obs.targetMs / obs.avgRtMs;
    thetaHat += clip(Math.log(Math.max(ratio, 1e-3)) * 0.45, -1.2, 1.2);
  }

  return clip(thetaHat, THETA_MIN, THETA_MAX);
}

function observationVariance(obs: Observation): number {
  const base = obs.probe ? PROBE_NOISE_VAR : BLOCK_NOISE_VAR;
  const rounds = obs.rounds && obs.rounds > 0 ? obs.rounds : 8;
  const nFactor = 8 / Math.max(4, Math.min(16, rounds));
  let rtInflation = 1;
  if (obs.avgRtMs > 0 && obs.targetMs > 0) {
    const miss = Math.abs(obs.avgRtMs - obs.targetMs) / obs.targetMs;
    rtInflation = 1 + clip(miss, 0, 1.5) * 0.35;
  }
  return base * nFactor * rtInflation;
}

function ewma(prev: number, next: number, alpha: number): number {
  return prev + alpha * (next - prev);
}

/**
 * Gaussian–Gaussian conjugate update:
 *   prior     N(μ, 1/τ)
 *   likelihood N(θ̂, σ²)
 *   posterior τ' = τ + 1/σ²
 *             μ' = (τ μ + θ̂/σ²) / τ'
 *
 * If the residual |θ̂ − μ| is huge relative to current σ, we slightly
 * *decay* precision first (the "lite" robustness substitute for a
 * heavy-tailed likelihood) so one outlier cannot lock the model.
 */
function bayesUpdate(
  theta: number,
  precision: number,
  thetaHat: number,
  variance: number
): { theta: number; precision: number } {
  const residual = Math.abs(thetaHat - theta);
  const sigma = Math.sqrt(Math.max(variance, 0.2));
  let tau = precision;
  if (residual > 2.5 * sigma && tau > PRIOR_PRECISION) {
    tau = Math.max(PRIOR_PRECISION, tau * 0.82);
  }
  const likePrec = 1 / Math.max(variance, 0.2);
  const tauNext = tau + likePrec;
  const muNext = (tau * theta + likePrec * thetaHat) / tauNext;
  return {
    theta: clip(muNext, THETA_MIN, THETA_MAX),
    precision: clip(tauNext, 0.15, 24)
  };
}

function upsertDomain(model: AbilityModel, next: DomainAbility): void {
  const i = model.domains.findIndex((d) => d.domain === next.domain);
  if (i >= 0) model.domains[i] = next;
  else model.domains.push(next);
}

function upsertSkill(model: AbilityModel, next: SkillAbility): void {
  const i = model.skills.findIndex((s) => s.skill === next.skill);
  if (i >= 0) model.skills[i] = next;
  else model.skills.push(next);
}

function touchSources(sources: string[], id: string): string[] {
  if (sources.includes(id)) return sources;
  return [...sources, id];
}

export function observeBlock(model: AbilityModel, obs: Observation, nowMs: number): AbilityModel {
  const next: AbilityModel = {
    version: ENGINE_VERSION,
    domains: model.domains.map((d) => ({ ...d, sources: [...d.sources] })),
    skills: model.skills.map((s) => ({ ...s, sources: [...s.sources] })),
    spacing: model.spacing.map((s) => ({ ...s })),
    lastCalibrationAt: model.lastCalibrationAt,
    updatedAt: isoFromMs(nowMs)
  };

  const thetaHat = impliedTheta(obs);
  const variance = observationVariance(obs);
  const perf = clip(obs.performance, PERF_MIN, PERF_MAX);
  const at = isoFromMs(nowMs);

  const domain = { ...getDomain(next, obs.domain) };
  const updated = bayesUpdate(domain.theta, domain.precision, thetaHat, variance);
  domain.theta = updated.theta;
  domain.precision = updated.precision;
  domain.formEwma = ewma(domain.formEwma, perf, FORM_ALPHA);
  domain.baseEwma = ewma(domain.baseEwma, perf, BASE_ALPHA);
  domain.observations += 1;
  domain.lastObservedAt = at;
  domain.sources = touchSources(domain.sources, obs.exerciseId);
  upsertDomain(next, domain);

  const skillIds = obs.skills.length > 0 ? obs.skills : [];
  skillIds.forEach((skillId) => {
    const parent = SKILL_DOMAIN[skillId] || obs.domain;
    const skill = { ...getSkill(next, skillId, parent) };
    const su = bayesUpdate(skill.theta, skill.precision, thetaHat, variance * 1.1);
    skill.theta = su.theta;
    skill.precision = su.precision;
    skill.formEwma = ewma(skill.formEwma, perf, FORM_ALPHA);
    skill.baseEwma = ewma(skill.baseEwma, perf, BASE_ALPHA);
    skill.observations += 1;
    skill.lastObservedAt = at;
    skill.sources = touchSources(skill.sources, obs.exerciseId);
    upsertSkill(next, skill);
  });

  return next;
}

export function markCalibrated(model: AbilityModel, nowMs: number): AbilityModel {
  return {
    ...model,
    lastCalibrationAt: isoFromMs(nowMs),
    updatedAt: isoFromMs(nowMs)
  };
}

/**
 * |form − base| / base is the "drift" ratio. A hot streak or a slump that
 * has not yet been absorbed by the slow EWMA is the signal for a soft
 * recalibration, not a wipe.
 */
export function domainDrift(d: DomainAbility): number {
  const denom = Math.max(80, d.baseEwma);
  return Math.abs(d.formEwma - d.baseEwma) / denom;
}

export function weakestDomains(model: AbilityModel, n = 2): DomainId[] {
  return [...model.domains]
    .sort((a, b) => a.theta - b.theta)
    .slice(0, n)
    .map((d) => d.domain);
}

export function strongestDomain(model: AbilityModel): DomainId {
  const ranked = [...model.domains].sort((a, b) => b.theta - a.theta);
  return ranked[0]?.domain || 'attention';
}

/**
 * Bootstrap the engine from the existing Fokus indexes so v2 works the
 * day it ships, without waiting for a fresh calibration.
 */
export function bootstrapAbilityModel(input: {
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  catalog?: CatalogItem[];
  lastCalibrationAt?: string | null;
  nowMs: number;
}): AbilityModel {
  const model = createAbilityModel(input.nowMs, input.lastCalibrationAt ?? null);

  DOMAIN_IDS.forEach((id) => {
    const src = input.domains.find((d) => d.domain === id);
    if (!src || !(src.value > 0)) return;
    const d = getDomain(model, id);
    d.theta = performanceToTheta(src.value);
    d.formEwma = src.value;
    d.baseEwma = src.value;
    d.precision = 0.7;
    d.observations = 1;
    d.lastObservedAt = src.updatedAt || null;
    const i = model.domains.findIndex((x) => x.domain === id);
    model.domains[i] = d;
  });

  input.skills.forEach((s) => {
    const domain = SKILL_DOMAIN[s.skill] || 'logic';
    const skill = emptySkill(s.skill, domain);
    skill.theta = performanceToTheta(s.value);
    skill.formEwma = s.value;
    skill.baseEwma = s.value;
    skill.precision = 0.35 + clip(s.confidence / 100, 0, 1) * 3;
    skill.observations = Math.max(1, s.attempts || 1);
    skill.lastObservedAt = s.lastUpdated || null;
    skill.sources = [...(s.sources || [])];
    model.skills.push(skill);

    const parent = getDomain(model, domain);
    if (skill.sources.length) {
      parent.sources = Array.from(new Set([...parent.sources, ...skill.sources]));
    }
  });

  input.states.forEach((st) => {
    if (!st.lastPlayedAt) return;
    const catalogItem = input.catalog?.find((c) => c.id === st.exerciseId);
    const interval = spacingIntervalFromState(st);
    model.spacing.push({
      exerciseId: st.exerciseId,
      intervalDays: interval,
      ease: 2.1,
      lastPlayedAt: st.lastPlayedAt,
      dueAt: new Date(Date.parse(st.lastPlayedAt) + interval * 86400000).toISOString(),
      repetitions: Math.max(1, st.attempts || 1)
    });
    if (catalogItem) {
      const d = getDomain(model, catalogItem.domain);
      d.sources = touchSources(d.sources, st.exerciseId);
    }
  });

  model.updatedAt = isoFromMs(input.nowMs);
  return model;
}

function spacingIntervalFromState(st: ExerciseState): number {
  const stability = st.stability ?? 0.5;
  const plateau = st.consecutivePlateau ?? 0;
  if (plateau >= 3) return 2.5;
  if (stability >= 0.8) return 2.0;
  if ((st.lastAccuracy || 0) < 0.6) return 0.7;
  return 1.0;
}

export function projectDomainIndex(d: DomainAbility, nowMs: number): DomainIndex {
  return {
    domain: d.domain,
    value: thetaToPerformance(d.theta),
    trend: d.formEwma - d.baseEwma,
    updatedAt: isoFromMs(nowMs)
  };
}

export function staleDays(model: AbilityModel, nowMs: number): number {
  return daysBetween(model.lastCalibrationAt, nowMs);
}
