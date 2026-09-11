import {
  DEFAULT_ALPHA,
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  DISCRIMINATION,
  FORM_ALPHA_EASY_DAY,
  MAX_DIFFICULTY_STEP,
  TARGET_P_CEIL,
  TARGET_P_FLOOR,
  TARGET_P_HI_CONF,
  TARGET_P_LO_CONF
} from './constants';
import { clip, fisher2pl, logit, twoPl } from './math';
import { confidence01, domainDrift, getDomain } from './ability';
import type { AbilityModel, CatalogItem, DifficultyPick, DomainId, MetricModel } from './types';

export function discriminationOf(model: MetricModel | undefined): number {
  if (!model) return DEFAULT_ALPHA;
  return DISCRIMINATION[model] || DEFAULT_ALPHA;
}

/**
 * Confidence-aware challenge zone.
 *
 * Classic IRT tutoring aims for P ≈ 0.7–0.8 (the "zone of proximal
 * development" analogue): hard enough to inform θ, easy enough to avoid
 * collapse. Fokus shifts that target with two original knobs:
 *
 *  1. Low posterior precision → higher target P (gentler while the model
 *     is still learning the person).
 *  2. A bad-form day (form EWMA well below base) raises target P so the
 *     ritual does not punish a slump.
 *
 * Then invert 2PL: β* = θ − logit(P*) / α.
 */
export function targetSuccessProb(model: AbilityModel, domain: DomainId): number {
  const d = getDomain(model, domain);
  const conf = confidence01(d.precision, d.sources.length);
  let p = TARGET_P_LO_CONF + (TARGET_P_HI_CONF - TARGET_P_LO_CONF) * conf;

  const drift = domainDrift(d);
  if (d.formEwma + 40 < d.baseEwma && drift > 0.08) {
    p += clip(drift, 0, 0.35) * FORM_ALPHA_EASY_DAY * 4;
  }

  return clip(p, TARGET_P_FLOOR, TARGET_P_CEIL);
}

export function targetBeta(theta: number, targetP: number, alpha: number): number {
  const a = Math.max(0.35, alpha);
  return theta - logit(targetP) / a;
}

export function clampDifficulty(raw: number, stored: number, maxLevel: number): number {
  const cap = Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, maxLevel + 4));
  const stepped = clip(raw, stored - MAX_DIFFICULTY_STEP, stored + MAX_DIFFICULTY_STEP);
  return clip(stepped, DIFFICULTY_MIN, cap);
}

export function selectDifficulty(params: {
  model: AbilityModel;
  item: CatalogItem;
  storedDifficulty: number;
  rng?: () => number;
}): DifficultyPick {
  const { model, item, storedDifficulty } = params;
  const rng = params.rng || (() => 0.5);
  const domain = getDomain(model, item.domain);
  const alpha = discriminationOf(item.metricModel);
  const targetP = targetSuccessProb(model, item.domain);
  const betaStar = targetBeta(domain.theta, targetP, alpha);

  // Blend domain-level IRT target with the exercise's own stored rating so
  // a single easy/hard outlier exercise does not yank the whole domain.
  const blended = 0.58 * betaStar + 0.42 * storedDifficulty;
  const explore = (rng() - 0.5) * 0.25;
  const difficulty = clampDifficulty(blended + explore, storedDifficulty, item.maxLevel);
  const pSuccess = twoPl(domain.theta, difficulty, alpha);

  let reason = 'Зона вызова';
  if (targetP >= 0.78) reason = 'Мягкий шаг — модель ещё учится';
  else if (domain.formEwma + 40 < domain.baseEwma) reason = 'Снижаем нагрузку: форма ниже базы';
  else if (pSuccess < 0.55) reason = 'Жёсткий вызов';
  else if (pSuccess > 0.85) reason = 'Закрепление уверенного уровня';

  return {
    exerciseId: item.id,
    difficulty,
    theta: domain.theta,
    beta: difficulty,
    alpha,
    pSuccess,
    targetP,
    reason
  };
}

export function itemInformation(model: AbilityModel, item: CatalogItem, beta: number): number {
  const domain = getDomain(model, item.domain);
  return fisher2pl(domain.theta, beta, discriminationOf(item.metricModel));
}
