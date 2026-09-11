import type { DomainIndex, ExerciseState, Session, SkillIndex } from './types';
import { domainLabel } from './labels';
import { computeAbilityTrajectory, type AbilityTrajectory, type CatalogDomainRef } from './ability-trajectory';
import { inspectSpacing } from './spaced-difficulty';

/**
 * Ritual targeter: pick the next 3–5 catalog slots.
 *
 * Favours the weakest domain on the live trajectory, freshness, and a small
 * exploration budget. Graceful no-op (null) when the catalog is empty — e.g.
 * if a program/adaptive PR has not landed and the caller has nothing to score.
 * Never invents IQ scores.
 */

export const EXPLORATION_BUDGET = 0.12;
export const MIN_SLOTS = 3;
export const MAX_SLOTS = 5;

export type RitualReason =
  | 'weakness'
  | 'freshness'
  | 'goal'
  | 'explore'
  | 'reapproach'
  | 'spacing'
  | 'balance';

export interface RitualCatalogEntry {
  manifest: {
    id: string;
    domain: string;
    skills?: string[];
    name?: string;
  };
}

export interface RitualSlot {
  exerciseId: string;
  domain: string;
  reason: RitualReason;
  reasonLabel: string;
}

export interface RitualPlan {
  items: RitualSlot[];
  focusDomains: string[];
  why: string;
  explored: boolean;
}

export function ritualSlotCount(durationSec: number): number {
  if (durationSec >= 720) return MAX_SLOTS;
  if (durationSec >= 480) return 4;
  return MIN_SLOTS;
}

function hoursSince(iso: string | undefined, now: number): number {
  if (!iso) return 10_000;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 10_000;
  return Math.max(0, (now - t) / (1000 * 60 * 60));
}

function reasonLabel(reason: RitualReason, domain: string): string {
  const name = domainLabel(domain);
  switch (reason) {
    case 'weakness':
      return `Укрепление области «${name}»`;
    case 'freshness':
      return `Свежий слот — «${name}» давно не было`;
    case 'goal':
      return `Слот под вашу цель — ${name}`;
    case 'explore':
      return 'Разведчик: другой тренажёр из каталога';
    case 'reapproach':
      return `Мягкий повтор по области «${name}»`;
    case 'spacing':
      return 'Пик сложности подошёл по паузе';
    default:
      return 'Сбалансированный слот';
  }
}

function primaryReason(flags: {
  weakness: number;
  freshness: number;
  goal: number;
  reapproach: number;
  spacing: number;
}): RitualReason {
  const ranked: Array<[RitualReason, number]> = [
    ['weakness', flags.weakness],
    ['reapproach', flags.reapproach],
    ['freshness', flags.freshness],
    ['goal', flags.goal],
    ['spacing', flags.spacing]
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] <= 0) return 'balance';
  return ranked[0][0];
}

function composeWhy(params: {
  weakestName: string | null;
  explored: boolean;
  hasReapproach: boolean;
  hasCooldownSkip: boolean;
  goalName: string | null;
}): string {
  if (params.hasReapproach && params.weakestName) {
    return `Мягкий повтор по области «${params.weakestName}» после сбоя — без скачка на прежний пик.`;
  }
  if (params.hasCooldownSkip) {
    return 'После недавнего пика не возвращаем ту же высоту сложности сразу — так нагрузка закрепляется.';
  }
  if (params.explored && params.weakestName) {
    return `Сегодня опираемся на «${params.weakestName}» и оставляем один слот на разведку.`;
  }
  if (params.weakestName) {
    return `Сегодня опираемся на «${params.weakestName}»: это самая слабая область по последним сессиям.`;
  }
  if (params.goalName) {
    return `Слоты под вашу цель — ${params.goalName}.`;
  }
  return 'Сбалансированный ритуал: слабая область, свежесть и небольшой запас на разведку.';
}

export function targetRitual(params: {
  catalog?: RitualCatalogEntry[] | null;
  domains?: DomainIndex[];
  skills?: SkillIndex[];
  states?: ExerciseState[];
  sessions?: Session[];
  durationSec?: number;
  primaryGoal?: string;
  now?: number;
  rng?: () => number;
  trajectory?: AbilityTrajectory;
}): RitualPlan | null {
  const catalog = params.catalog;
  if (!catalog || catalog.length === 0) return null;

  const now = params.now ?? Date.now();
  const rng = params.rng ?? Math.random;
  const sessions = params.sessions || [];
  const states = params.states || [];
  const domains = params.domains || [];
  const primaryGoal = params.primaryGoal && params.primaryGoal !== 'balance' ? params.primaryGoal : null;
  const slots = Math.min(catalog.length, ritualSlotCount(params.durationSec ?? 300));

  const catalogRefs: CatalogDomainRef[] = catalog.map((c) => ({
    id: c.manifest.id,
    domain: c.manifest.domain
  }));

  const trajectory =
    params.trajectory ||
    computeAbilityTrajectory({ sessions, domains, catalog: catalogRefs });

  const weakestDomain = trajectory.weakest?.domain || null;
  const thetaByDomain = new Map(trajectory.domains.map((d) => [d.domain, d.theta]));

  const selectedIds = new Set<string>();
  const selectedDomains: string[] = [];
  const items: RitualSlot[] = [];
  let explored = false;
  let hasReapproach = false;
  let hasCooldownSkip = false;

  for (let i = 0; i < slots; i++) {
    const scored = catalog.map((c) => {
      const id = c.manifest.id;
      const domain = c.manifest.domain;
      const state = states.find((s) => s.exerciseId === id);
      const spacing = inspectSpacing({
        exerciseId: id,
        currentDifficulty: state?.difficulty ?? 1,
        sessions
      });

      const theta = thetaByDomain.get(domain);
      const weakness = theta === undefined ? 8 : 40 * (1 - theta);
      const goal = primaryGoal && domain === primaryGoal ? 20 : 0;

      const hours = hoursSince(state?.lastPlayedAt, now);
      let freshness = 0;
      if (!state) freshness = 18;
      else if (hours > 168) freshness = 16;
      else if (hours > 48) freshness = 8;
      else if (hours < 12) freshness = -28;
      else if (hours < 36) freshness = -10;

      const reapproach = spacing.mode === 'reapproach' ? 16 : 0;
      const spacingDue = spacing.due ? 12 : 0;
      const cooldownPenalty = spacing.mode === 'peak-cooldown' ? -22 : 0;
      if (spacing.mode === 'peak-cooldown') hasCooldownSkip = true;

      let domainBalance = 0;
      if (selectedDomains.includes(domain)) domainBalance = -32;
      const repeatPenalty = selectedIds.has(id) ? -1000 : 0;

      const score =
        weakness +
        goal +
        freshness +
        reapproach +
        spacingDue +
        cooldownPenalty +
        domainBalance +
        repeatPenalty;

      const reason = primaryReason({
        weakness: weakness >= 22 && domain === weakestDomain ? weakness : 0,
        freshness: Math.max(0, freshness),
        goal,
        reapproach,
        spacing: spacingDue
      });

      return { id, domain, score, reason, reapproach, cooldown: spacing.mode === 'peak-cooldown' };
    });

    scored.sort((a, b) => b.score - a.score);
    const playable = scored.filter((s) => s.score > -500);
    const pool = playable.length > 0 ? playable : scored;

    let chosen = pool[0];
    const exploreNow = i > 0 && pool.length > 1 && rng() < EXPLORATION_BUDGET;
    if (exploreNow) {
      const altCap = Math.min(3, pool.length);
      const altIndex = 1 + Math.floor(rng() * Math.max(1, altCap - 1));
      chosen = pool[Math.min(altIndex, pool.length - 1)];
      explored = true;
    }

    if (chosen.reapproach) hasReapproach = true;

    items.push({
      exerciseId: chosen.id,
      domain: chosen.domain,
      reason: exploreNow ? 'explore' : chosen.reason,
      reasonLabel: reasonLabel(exploreNow ? 'explore' : chosen.reason, chosen.domain)
    });
    selectedIds.add(chosen.id);
    selectedDomains.push(chosen.domain);
  }

  const focusDomains = new Set<string>();
  if (primaryGoal) focusDomains.add(primaryGoal);
  if (weakestDomain) focusDomains.add(weakestDomain);

  const why = composeWhy({
    weakestName: weakestDomain ? domainLabel(weakestDomain) : null,
    explored,
    hasReapproach,
    hasCooldownSkip,
    goalName: primaryGoal ? domainLabel(primaryGoal) : null
  });

  return {
    items,
    focusDomains: Array.from(focusDomains),
    why,
    explored
  };
}
