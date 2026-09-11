import {
  RECAL_DRIFT_DOMAINS,
  RECAL_DRIFT_RATIO,
  RECAL_MIN_OBS,
  RECAL_PRECISION_COLLAPSE,
  RECAL_PROBE_BLOCKS,
  RECAL_STALE_DAYS
} from './constants';
import { daysBetween } from './math';
import { domainDrift, getDomain, strongestDomain, weakestDomains } from './ability';
import type {
  AbilityModel,
  CatalogItem,
  DomainId,
  RecalibrationDecision,
  RecalibrationReason
} from './types';

const REASON_COPY: Record<RecalibrationReason, string> = {
  stale: 'Прошло больше двух недель с последней оценки',
  drift: 'Форма заметно разошлась с базой сразу в нескольких областях',
  'precision-collapse': 'Модель потеряла уверенность — нужна короткая сверка'
};

export function evaluateRecalibration(params: {
  model: AbilityModel;
  catalog: CatalogItem[];
  nowMs: number;
  snoozedUntil?: string | null;
  primaryGoal?: string;
}): RecalibrationDecision {
  const { model, catalog, nowMs, snoozedUntil, primaryGoal } = params;
  const reasons: RecalibrationReason[] = [];

  const daysSinceCal = daysBetween(model.lastCalibrationAt, nowMs);
  const hasHistory = model.domains.some((d) => d.observations >= RECAL_MIN_OBS);

  if (model.lastCalibrationAt && daysSinceCal >= RECAL_STALE_DAYS) {
    reasons.push('stale');
  } else if (!model.lastCalibrationAt && hasHistory && daysSinceCal >= RECAL_STALE_DAYS) {
    reasons.push('stale');
  }

  const drifted = model.domains.filter(
    (d) => d.observations >= RECAL_MIN_OBS && domainDrift(d) >= RECAL_DRIFT_RATIO
  );
  if (drifted.length >= RECAL_DRIFT_DOMAINS) {
    reasons.push('drift');
  }

  const mature = model.domains.filter((d) => d.observations >= RECAL_MIN_OBS);
  if (mature.length >= 3) {
    const avgPrec =
      mature.reduce((s, d) => s + d.precision, 0) / Math.max(1, mature.length);
    if (avgPrec < RECAL_PRECISION_COLLAPSE) {
      reasons.push('precision-collapse');
    }
  }

  const snoozed = !!(snoozedUntil && daysBetween(snoozedUntil, nowMs) < 0);
  const needed = reasons.length > 0;

  return {
    needed,
    snoozed,
    reasons,
    summary: needed ? reasons.map((r) => REASON_COPY[r]).join('. ') : '',
    probe: needed ? pickProbe(model, catalog, primaryGoal) : []
  };
}

/**
 * Probe composition: weakest domain, goal (or least-observed), strongest.
 * Keeps recalibration to ~90 seconds and avoids wiping the profile.
 */
export function pickProbe(
  model: AbilityModel,
  catalog: CatalogItem[],
  primaryGoal?: string
): { exerciseId: string; domain: DomainId }[] {
  if (catalog.length === 0) return [];

  const weak = weakestDomains(model, 1)[0];
  const strong = strongestDomain(model);
  const leastObserved = [...model.domains].sort((a, b) => a.observations - b.observations)[0]
    ?.domain;
  const goal =
    primaryGoal && primaryGoal !== 'balance' ? (primaryGoal as DomainId) : leastObserved;

  const wanted: DomainId[] = [];
  [weak, goal, strong].forEach((d) => {
    if (d && !wanted.includes(d)) wanted.push(d);
  });
  while (wanted.length < RECAL_PROBE_BLOCKS) {
    const extra = model.domains.find((d) => !wanted.includes(d.domain));
    if (!extra) break;
    wanted.push(extra.domain);
  }

  const used = new Set<string>();
  const probe: { exerciseId: string; domain: DomainId }[] = [];
  wanted.forEach((domain) => {
    const pick = pickProbeExercise(model, catalog, domain, used);
    if (pick) {
      used.add(pick.exerciseId);
      probe.push(pick);
    }
  });

  if (probe.length < Math.min(RECAL_PROBE_BLOCKS, catalog.length)) {
    catalog.forEach((c) => {
      if (probe.length >= RECAL_PROBE_BLOCKS) return;
      if (used.has(c.id)) return;
      used.add(c.id);
      probe.push({ exerciseId: c.id, domain: c.domain });
    });
  }

  return probe.slice(0, RECAL_PROBE_BLOCKS);
}

function pickProbeExercise(
  model: AbilityModel,
  catalog: CatalogItem[],
  domain: DomainId,
  used: Set<string>
): { exerciseId: string; domain: DomainId } | null {
  const pool = catalog.filter((c) => c.domain === domain && !used.has(c.id));
  if (pool.length === 0) return null;
  const ranked = [...pool].sort((a, b) => {
    const sa = model.spacing.find((s) => s.exerciseId === a.id)?.repetitions || 0;
    const sb = model.spacing.find((s) => s.exerciseId === b.id)?.repetitions || 0;
    return sb - sa;
  });
  const chosen = ranked[0];
  return { exerciseId: chosen.id, domain: chosen.domain };
}

export function isRecalibrationActive(decision: RecalibrationDecision): boolean {
  return decision.needed && !decision.snoozed;
}
