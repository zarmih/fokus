import type {
  CognitiveDomain,
  DomainAbility,
  DomainIndex,
  ExerciseState,
  ProbeSnapshot,
  SkillIndex
} from './types';
import {
  initializeExerciseStateFromCalibration,
  initializeSkillFromCalibration
} from './adaptive';

export const PROBE_BUDGET_MIN_SEC = 60;
export const PROBE_BUDGET_SEC = 90;
export const PROBE_BLOCK_SEC = 18;
export const PROBE_MIN_BLOCKS = 3;
export const PROBE_MAX_BLOCKS = 5;

export const PROBE_DOMAINS: CognitiveDomain[] = [
  'memory',
  'attention',
  'logic',
  'speed',
  'flexibility'
];

/** Preferred short, well-tested probes per domain. Catalog filters at plan time. */
export const PREFERRED_PROBE: Record<CognitiveDomain, string[]> = {
  memory: ['grid-memory', 'corsi', 'n-back', 'dot-span'],
  attention: ['odd-one', 'posner', 'go-no-go', 'schulte'],
  logic: ['pattern-next', 'pulley'],
  speed: ['reaction-strike', 'math-sprint', 'schulte'],
  flexibility: ['stroop', 'switch-rule', 'go-no-go']
};

const PRIOR_THETA = 0;
const PRIOR_PRECISION = 1;
const SURPRISE_THETA = 1.15;

export interface ProbeCatalogItem {
  id: string;
  domain: string;
  skills?: string[];
}

export interface ProbeBlock {
  exerciseId: string;
  domain: CognitiveDomain;
  difficulty: number;
  budgetSec: number;
}

export interface ProbePlan {
  items: ProbeBlock[];
  budgetSec: number;
  blockSec: number;
  domains: CognitiveDomain[];
}

export interface ProbeOutcome {
  exerciseId: string;
  domain: string;
  accuracy: number;
  avgRtMs: number;
  rounds?: number;
  difficulty: number;
  performance?: number;
  skills?: string[];
}

export function mapAccuracyToStartLevel(accuracy: number): number {
  if (accuracy >= 0.95) return 8.0;
  if (accuracy >= 0.8) return 5.0; // high
  if (accuracy >= 0.5) return 3.0; // mid
  return 1.5; // low
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function difficultyToB(difficulty: number): number {
  return clamp((difficulty - 3) * 0.35, -2, 2);
}

export function sigmoid(x: number): number {
  if (x > 12) return 1;
  if (x < -12) return 0;
  return 1 / (1 + Math.exp(-x));
}

export function thetaToStartLevel(theta: number): number {
  return Math.round(clamp(3 + theta * 2, 1.5, 8) * 10) / 10;
}

export function thetaToPerformance(theta: number): number {
  return Math.round(clamp(500 + theta * 200, 150, 1100));
}

export function precisionLabel(precision: number): string {
  const se = 1 / Math.sqrt(Math.max(0.15, precision));
  if (se > 0.85) return 'очень мало данных';
  if (se > 0.6) return 'черновик';
  if (se > 0.4) return 'предварительно';
  return 'можно опираться';
}

export function updateAbility(
  prior: { theta: number; precision: number },
  obs: { accuracy: number; rounds?: number; difficulty: number }
): { theta: number; precision: number; se: number } {
  const n = clamp(Math.round(obs.rounds ?? 8), 4, 20);
  const a = clamp(obs.accuracy, 0, 1);
  const b = difficultyToB(obs.difficulty);
  const p = sigmoid(prior.theta - b);
  const info = Math.max(0.15, n * p * (1 - p));
  const precision = prior.precision + info;
  const score = n * (a - p);
  const theta = clamp(prior.theta + score / precision, -3, 3);
  return { theta, precision, se: 1 / Math.sqrt(precision) };
}

function asDomain(raw: string): CognitiveDomain | null {
  return (PROBE_DOMAINS as string[]).includes(raw) ? (raw as CognitiveDomain) : null;
}

const DOMAIN_COMPLEMENT: Record<CognitiveDomain, CognitiveDomain[]> = {
  memory: ['attention', 'logic', 'flexibility', 'speed'],
  attention: ['memory', 'speed', 'flexibility', 'logic'],
  speed: ['attention', 'flexibility', 'memory', 'logic'],
  flexibility: ['attention', 'logic', 'memory', 'speed'],
  logic: ['memory', 'attention', 'flexibility', 'speed']
};

export function domainOrder(primaryGoal?: string): CognitiveDomain[] {
  const goal = asDomain(primaryGoal || '');
  if (goal) return [goal, ...DOMAIN_COMPLEMENT[goal]];
  return ['attention', 'memory', 'flexibility', 'logic', 'speed'];
}

function pickExercise(
  domain: CognitiveDomain,
  catalog: ProbeCatalogItem[] | undefined,
  used: Set<string>
): string | null {
  const preferred = PREFERRED_PROBE[domain];
  const inCatalog = (id: string) =>
    !catalog || catalog.length === 0 || catalog.some((c) => c.id === id);

  for (const id of preferred) {
    if (!used.has(id) && inCatalog(id)) {
      if (catalog && catalog.length > 0) {
        const row = catalog.find((c) => c.id === id);
        if (row && row.domain !== domain) continue;
      }
      return id;
    }
  }

  if (catalog && catalog.length > 0) {
    const alt = catalog.find((c) => c.domain === domain && !used.has(c.id));
    return alt ? alt.id : null;
  }
  return null;
}

function anyUnused(catalog: ProbeCatalogItem[] | undefined, used: Set<string>): ProbeBlock | null {
  if (!catalog || catalog.length === 0) {
    for (const domain of PROBE_DOMAINS) {
      const id = pickExercise(domain, undefined, used);
      if (id) {
        return { exerciseId: id, domain, difficulty: 3, budgetSec: PROBE_BLOCK_SEC };
      }
    }
    return null;
  }
  const row = catalog.find((c) => !used.has(c.id) && asDomain(c.domain));
  if (!row) return null;
  return {
    exerciseId: row.id,
    domain: asDomain(row.domain) as CognitiveDomain,
    difficulty: 3,
    budgetSec: PROBE_BLOCK_SEC
  };
}

export function estimateDomainAbilities(outcomes: ProbeOutcome[]): DomainAbility[] {
  const byDomain = new Map<CognitiveDomain, { theta: number; precision: number; observations: number }>();
  for (const d of PROBE_DOMAINS) {
    byDomain.set(d, { theta: PRIOR_THETA, precision: PRIOR_PRECISION, observations: 0 });
  }

  for (const obs of outcomes) {
    const domain = asDomain(obs.domain);
    if (!domain) continue;
    const cur = byDomain.get(domain)!;
    const next = updateAbility(cur, obs);
    byDomain.set(domain, {
      theta: next.theta,
      precision: next.precision,
      observations: cur.observations + 1
    });
  }

  return PROBE_DOMAINS.map((domain) => {
    const cur = byDomain.get(domain)!;
    return {
      domain,
      theta: cur.theta,
      precision: cur.precision,
      se: 1 / Math.sqrt(cur.precision),
      startLevel: thetaToStartLevel(cur.theta),
      observations: cur.observations,
      probed: cur.observations > 0
    };
  });
}

export function decideNextProbeStep(input: {
  outcomes: ProbeOutcome[];
  primaryGoal?: string;
  catalog?: ProbeCatalogItem[];
  budgetSec?: number;
  blockSec?: number;
}): ProbeBlock | null {
  const budget = input.budgetSec ?? PROBE_BUDGET_SEC;
  const blockSec = input.blockSec ?? PROBE_BLOCK_SEC;
  const n = input.outcomes.length;
  if (n >= PROBE_MAX_BLOCKS) return null;

  const elapsed = n * blockSec;
  const fits = elapsed + blockSec <= budget;
  const used = new Set(input.outcomes.map((o) => o.exerciseId));
  const probed = new Set(
    input.outcomes.map((o) => asDomain(o.domain)).filter((d): d is CognitiveDomain => !!d)
  );
  const order = domainOrder(input.primaryGoal);

  const takeUncovered = (): ProbeBlock | null => {
    for (const d of order) {
      if (probed.has(d)) continue;
      const id = pickExercise(d, input.catalog, used);
      if (id) return { exerciseId: id, domain: d, difficulty: 3, budgetSec: blockSec };
    }
    return anyUnused(input.catalog, used);
  };

  if (n < PROBE_MIN_BLOCKS) {
    return takeUncovered();
  }

  if (!fits) return null;

  const uncovered = takeUncovered();
  if (!uncovered) return null;

  if (n === 3) {
    // 4th block stays inside 60–90s and covers another domain without a second pass.
    return uncovered;
  }

  // 5th block only when the profile is still surprising or the user asked for balance.
  const abilities = estimateDomainAbilities(input.outcomes);
  const surprise = abilities.some((a) => a.probed && Math.abs(a.theta) >= SURPRISE_THETA);
  const wantsFullCover = !input.primaryGoal || input.primaryGoal === 'balance';
  if (surprise || wantsFullCover) return uncovered;
  return null;
}

export function planProbeBlocks(input: {
  primaryGoal?: string;
  catalog?: ProbeCatalogItem[];
  budgetSec?: number;
} = {}): ProbePlan {
  const items: ProbeBlock[] = [];
  const fake: ProbeOutcome[] = [];
  for (let i = 0; i < PROBE_MIN_BLOCKS; i++) {
    const next = decideNextProbeStep({
      outcomes: fake,
      primaryGoal: input.primaryGoal,
      catalog: input.catalog,
      budgetSec: input.budgetSec
    });
    if (!next) break;
    items.push(next);
    fake.push({
      exerciseId: next.exerciseId,
      domain: next.domain,
      accuracy: 0.5,
      avgRtMs: 800,
      difficulty: 3,
      rounds: 8
    });
  }
  return {
    items,
    budgetSec: input.budgetSec ?? PROBE_BUDGET_SEC,
    blockSec: PROBE_BLOCK_SEC,
    domains: items.map((i) => i.domain)
  };
}

export function calibrationSessionItems(input: {
  primaryGoal?: string;
  catalog?: ProbeCatalogItem[];
} = {}): { exerciseId: string }[] {
  const plan = planProbeBlocks(input);
  if (plan.items.length > 0) {
    return plan.items.map((i) => ({ exerciseId: i.exerciseId }));
  }
  return [{ exerciseId: 'odd-one' }, { exerciseId: 'grid-memory' }, { exerciseId: 'stroop' }];
}

export function bootstrapFromProbe(
  outcomes: ProbeOutcome[],
  opts?: { now?: string; durationSec?: number }
): ProbeSnapshot {
  const domains = estimateDomainAbilities(outcomes);
  const running: ProbeOutcome[] = [];
  const blocks = outcomes.map((o) => {
    running.push(o);
    const abilities = estimateDomainAbilities(running);
    const row = abilities.find((a) => a.domain === o.domain);
    return {
      exerciseId: o.exerciseId,
      domain: o.domain,
      accuracy: o.accuracy,
      avgRtMs: o.avgRtMs,
      thetaAfter: row ? row.theta : 0
    };
  });
  const probed = domains.filter((d) => d.probed);
  const overallTheta = probed.length
    ? probed.reduce((s, d) => s + d.theta, 0) / probed.length
    : 0;
  const overallPrecision = probed.length
    ? probed.reduce((s, d) => s + d.precision, 0) / probed.length
    : PRIOR_PRECISION;

  return {
    completedAt: opts?.now ?? new Date().toISOString(),
    durationSec: opts?.durationSec ?? clamp(outcomes.length * PROBE_BLOCK_SEC, 0, PROBE_BUDGET_SEC),
    blocks,
    domains,
    overallTheta,
    overallPrecision,
    disclaimer: 'not-iq'
  };
}

export function domainStartLevels(snapshot: ProbeSnapshot): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of snapshot.domains) out[d.domain] = d.startLevel;
  return out;
}

export function seedStatesFromSnapshot(
  snapshot: ProbeSnapshot,
  catalog: ProbeCatalogItem[]
): { exerciseStates: ExerciseState[]; domains: DomainIndex[]; skills: SkillIndex[] } {
  const levels = domainStartLevels(snapshot);
  const thetaByDomain: Record<string, number> = {};
  for (const d of snapshot.domains) thetaByDomain[d.domain] = d.theta;

  const exerciseStates: ExerciseState[] = [];
  const skills: SkillIndex[] = [];
  const seenSkills = new Set<string>();

  const probed = new Set(
    snapshot.domains.filter((d) => d.probed).map((d) => d.domain)
  );

  for (const item of catalog) {
    if (!probed.has(item.domain as CognitiveDomain)) continue;
    const level = levels[item.domain] ?? 3;
    const perf = thetaToPerformance(thetaByDomain[item.domain] ?? 0);
    exerciseStates.push(initializeExerciseStateFromCalibration(item.id, level, perf));
    (item.skills || []).forEach((skillId) => {
      if (seenSkills.has(skillId)) return;
      seenSkills.add(skillId);
      skills.push(initializeSkillFromCalibration(skillId, perf, item.id));
    });
  }

  const domains: DomainIndex[] = snapshot.domains
    .filter((d) => d.probed)
    .map((d) => ({
      domain: d.domain,
      value: thetaToPerformance(d.theta),
      trend: 0,
      updatedAt: snapshot.completedAt
    }));

  return { exerciseStates, domains, skills };
}
