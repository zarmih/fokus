import { PERF_MAX, PERF_MIN, THETA_MAX, THETA_MIN } from './constants';

export function clip(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function sigmoid(z: number): number {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

export function logit(p: number): number {
  const q = clip(p, 1e-4, 1 - 1e-4);
  return Math.log(q / (1 - q));
}

/**
 * Map Fokus performance (0–1500) onto the 1–30 difficulty/ability scale.
 * 500 ≈ theta 8.3 (early developing); 1200 ≈ theta 18.6 (strong).
 */
export function performanceToTheta(perf: number): number {
  const p = clip(perf, PERF_MIN, PERF_MAX);
  return clip(1 + (p / PERF_MAX) * 22, THETA_MIN, THETA_MAX);
}

export function thetaToPerformance(theta: number): number {
  const t = clip(theta, THETA_MIN, THETA_MAX);
  return clip(((t - 1) / 22) * PERF_MAX, PERF_MIN, PERF_MAX);
}

/**
 * 2PL item-response model:
 *   P(correct | θ, β, α) = 1 / (1 + exp(-α (θ - β)))
 * θ = ability, β = item difficulty, α = discrimination.
 */
export function twoPl(theta: number, beta: number, alpha: number): number {
  return sigmoid(alpha * (theta - beta));
}

/**
 * Fisher information of a 2PL Bernoulli item at θ.
 * I(θ) = α² P (1-P). Peaks when P ≈ 0.5; we target ~0.72 so information
 * stays high while keeping the block in a productive-struggle band.
 */
export function fisher2pl(theta: number, beta: number, alpha: number): number {
  const p = twoPl(theta, beta, alpha);
  return alpha * alpha * p * (1 - p);
}

export function daysBetween(fromIso: string | null, nowMs: number): number {
  if (!fromIso) return Infinity;
  const t = Date.parse(fromIso);
  if (!Number.isFinite(t)) return Infinity;
  return (nowMs - t) / (1000 * 60 * 60 * 24);
}

export function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

export function addDaysIso(fromIso: string, days: number): string {
  const t = Date.parse(fromIso);
  return new Date(t + days * 86400000).toISOString();
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
