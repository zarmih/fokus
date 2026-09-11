import type { DomainIndex, Session, SessionItem } from './types';
import { calculateEMA } from './domains';
import { DOMAIN_ORDER } from './labels';

/**
 * Multi-session latent ability θ per domain.
 *
 * Evidence comes only from already-stored session items (accuracy, RT, difficulty)
 * plus the live DomainIndex as a weak prior. θ lives on [0, 1] and is never
 * mapped to IQ, BPI, NeuroScore, or any 100-point “intelligence” scale.
 */

export const THETA_PRIOR_MU = 0.5;
export const THETA_PRIOR_PRECISION = 2;
export const EVIDENCE_LIKELIHOOD = 3;
export const SESSION_EWMA_ALPHA = 0.28;
export const SLOPE_RISING = 0.03;
export const SLOPE_FALLING = -0.03;
export const MIN_OBSERVATIONS_READY = 3;
export const MIN_SESSIONS_READY = 2;
export const DEFAULT_TARGET_MS = 1500;
export const DOMAIN_VALUE_SCALE = 1200;

export type AbilityTrend = 'rising' | 'stable' | 'falling' | 'unknown';

export interface CatalogDomainRef {
  id: string;
  domain: string;
}

export interface BlockObservation {
  domain: string;
  accuracy: number;
  avgRtMs: number;
  difficulty: number;
  at: string;
  sessionId: string;
}

export interface DomainTrajectory {
  domain: string;
  /** Latent ability in [0, 1]. Internal only — do not show as a score. */
  theta: number;
  /** Bayesian precision; grows with evidence. */
  precision: number;
  ewma: number;
  /** Per-session EWMA slope over the last few sessions. */
  slope: number;
  trend: AbilityTrend;
  samples: number;
  sessions: number;
  lastSessionAt: string | null;
}

export interface AbilityTrajectory {
  domains: DomainTrajectory[];
  weakest: DomainTrajectory | null;
  headline: DomainTrajectory | null;
  ready: boolean;
  observations: number;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function observationEvidence(obs: Pick<BlockObservation, 'accuracy' | 'avgRtMs' | 'difficulty'>, targetMs = DEFAULT_TARGET_MS): number {
  const acc = clamp(obs.accuracy, 0, 1);
  const speed = obs.avgRtMs > 0 ? clamp(targetMs / obs.avgRtMs, 0.6, 1.25) : 1;
  const speed01 = (speed - 0.6) / (1.25 - 0.6);
  const diff01 = clamp((obs.difficulty - 1) / 24, 0, 1);
  return clamp(0.55 * acc + 0.20 * speed01 + 0.25 * diff01, 0, 1);
}

export function updateTheta(
  prior: { mu: number; precision: number },
  evidence: number,
  weight = 1
): { mu: number; precision: number } {
  const kappa = EVIDENCE_LIKELIHOOD * Math.max(0.25, weight);
  const precision = prior.precision + kappa;
  const mu = (prior.precision * prior.mu + kappa * clamp(evidence, 0, 1)) / precision;
  return { mu: clamp(mu, 0, 1), precision };
}

function itemDifficulty(item: SessionItem): number {
  if (typeof item.difficultyBefore === 'number' && Number.isFinite(item.difficultyBefore)) {
    return item.difficultyBefore;
  }
  if (typeof item.level === 'number' && Number.isFinite(item.level)) return item.level;
  return 1;
}

export function collectObservations(
  sessions: Session[],
  catalog: CatalogDomainRef[]
): BlockObservation[] {
  const domainById = new Map<string, string>();
  for (const c of catalog) {
    if (c.id && c.domain) domainById.set(c.id, c.domain);
  }

  const out: BlockObservation[] = [];
  for (const session of sessions) {
    if (!session?.items) continue;
    for (const item of session.items) {
      const domain = domainById.get(item.exerciseId);
      if (!domain) continue;
      out.push({
        domain,
        accuracy: item.accuracy ?? 0,
        avgRtMs: item.avgRtMs ?? DEFAULT_TARGET_MS,
        difficulty: itemDifficulty(item),
        at: session.finishedAt || session.startedAt,
        sessionId: session.id
      });
    }
  }
  return out;
}

function trendFromSlope(slope: number, sessions: number): AbilityTrend {
  if (sessions < MIN_SESSIONS_READY) return 'unknown';
  if (slope >= SLOPE_RISING) return 'rising';
  if (slope <= SLOPE_FALLING) return 'falling';
  return 'stable';
}

function priorFromDomain(domain: DomainIndex | undefined): { mu: number; precision: number } {
  if (!domain || !(domain.value > 0)) {
    return { mu: THETA_PRIOR_MU, precision: THETA_PRIOR_PRECISION };
  }
  return {
    mu: clamp(domain.value / DOMAIN_VALUE_SCALE, 0.05, 0.95),
    precision: THETA_PRIOR_PRECISION + 1
  };
}

function buildDomainTrajectory(
  domain: string,
  observations: BlockObservation[],
  stored: DomainIndex | undefined
): DomainTrajectory {
  const prior = priorFromDomain(stored);
  let mu = prior.mu;
  let precision = prior.precision;

  const bySession = new Map<string, BlockObservation[]>();
  for (const obs of observations) {
    const list = bySession.get(obs.sessionId) || [];
    list.push(obs);
    bySession.set(obs.sessionId, list);
  }

  const sessionMeans: { at: string; mean: number }[] = [];
  for (const [, blocks] of bySession) {
    const mean = blocks.reduce((s, b) => s + observationEvidence(b), 0) / blocks.length;
    const at = blocks[blocks.length - 1].at;
    sessionMeans.push({ at, mean });
    const updated = updateTheta({ mu, precision }, mean, Math.sqrt(blocks.length));
    mu = updated.mu;
    precision = updated.precision;
  }

  let ewma = sessionMeans.length > 0 ? sessionMeans[0].mean : mu;
  for (let i = 1; i < sessionMeans.length; i++) {
    ewma = calculateEMA(ewma, sessionMeans[i].mean, SESSION_EWMA_ALPHA);
  }

  const window = sessionMeans.slice(-4);
  let slope = 0;
  if (window.length >= 2) {
    slope = (window[window.length - 1].mean - window[0].mean) / (window.length - 1);
  } else if (stored && typeof stored.trend === 'number') {
    slope = stored.trend / 800;
  }

  const sessionCount = bySession.size;
  const last = sessionMeans.length > 0 ? sessionMeans[sessionMeans.length - 1].at : stored?.updatedAt || null;

  return {
    domain,
    theta: mu,
    precision,
    ewma,
    slope,
    trend: trendFromSlope(slope, sessionCount),
    samples: observations.length,
    sessions: sessionCount,
    lastSessionAt: last
  };
}

export function computeAbilityTrajectory(params: {
  sessions?: Session[];
  domains?: DomainIndex[];
  catalog?: CatalogDomainRef[];
}): AbilityTrajectory {
  const sessions = params.sessions || [];
  const domains = params.domains || [];
  const catalog = params.catalog || [];
  const observations = collectObservations(sessions, catalog);

  const domainIds = new Set<string>(DOMAIN_ORDER as unknown as string[]);
  for (const d of domains) domainIds.add(d.domain);
  for (const obs of observations) domainIds.add(obs.domain);

  const byDomain = new Map<string, BlockObservation[]>();
  for (const obs of observations) {
    const list = byDomain.get(obs.domain) || [];
    list.push(obs);
    byDomain.set(obs.domain, list);
  }

  const built: DomainTrajectory[] = [];
  for (const id of domainIds) {
    const obs = byDomain.get(id) || [];
    const stored = domains.find((d) => d.domain === id);
    if (obs.length === 0 && !(stored && stored.value > 0)) continue;
    built.push(buildDomainTrajectory(id, obs, stored));
  }

  built.sort((a, b) => a.theta - b.theta);

  const withSamples = built.filter((d) => d.samples > 0);
  const weakest = (withSamples.length > 0 ? withSamples : built)[0] || null;

  const totalObs = observations.length;
  const distinctSessions = new Set(observations.map((o) => o.sessionId)).size;
  const ready = totalObs >= MIN_OBSERVATIONS_READY && distinctSessions >= MIN_SESSIONS_READY;

  let headline: DomainTrajectory | null = null;
  if (ready && weakest) {
    headline = weakest;
  }

  return {
    domains: built,
    weakest,
    headline,
    ready,
    observations: totalObs
  };
}
