import type { ExerciseManifest } from '../exercises/contract';
import type { DomainIndex, SkillIndex, ExerciseState } from './types';
import { weeklyFocusBias } from './transfer';
import {
  buildAdaptivePlan as engineBuildAdaptivePlan,
  type AdaptivePlan,
  type AdaptivePlanParams
} from './engine/bridge';
import { phaseForWeek } from './program-phases';

export interface TrainingPlanItem {
  exerciseId: string;
  reason: string;
  slot?: 'overdue' | 'due' | 'fresh';
  difficulty?: number;
  pSuccess?: number;
  domain?: string;
  nextExerciseId?: string;
  nextDomain?: string;
  rerolled?: boolean;
}

export interface TrainingPlan {
  focusDomains: string[];
  items: TrainingPlanItem[];
  source?: 'engine' | 'legacy';
}

export function buildAdaptivePlan(params: AdaptivePlanParams): AdaptivePlan {
  return engineBuildAdaptivePlan(params, (p) =>
    buildTrainingPlan({
      durationSec: p.durationSec,
      catalog: p.catalog,
      domains: p.domains,
      skills: p.skills,
      states: p.states,
      primaryGoal: p.primaryGoal,
      programWeek: p.programWeek,
      programDay: p.programDay,
      programPhase: p.programPhase,
      fatigueOrChurn: p.fatigueOrChurn,
      excludeIds: p.excludeIds,
      isSparse: p.isSparse
    })
  );
}


export function getScoredCandidates(params: {
  catalog: { manifest: ExerciseManifest }[];
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  primaryGoal?: string;
  focusOfTheWeek?: string | null;
  programWeek?: number;
  programDay?: number;
  programPhase?: string;
  excludeIds?: string[];
  isSparse?: boolean;
  selectedExerciseIds: Set<string>;
  selectedDomains: Set<string>;
}) {
  const { catalog, domains, skills, states, primaryGoal = 'balance', focusOfTheWeek, programWeek, programDay, programPhase, excludeIds = [], isSparse = states.length < 9, selectedExerciseIds, selectedDomains } = params;
  const phaseId = programPhase ?? phaseForWeek(programWeek ?? 1).id;
  const sortedDomains = [...domains].sort((a, b) => a.value - b.value);
  const isGlobalSparse = states.length < 9;
  const weakestDomain = (!isGlobalSparse && sortedDomains.length > 0) ? sortedDomains[0].domain : null;
  const secondWeakestDomain = (!isGlobalSparse && sortedDomains.length > 1) ? sortedDomains[1].domain : null;

    const scoredCandidates = catalog
      .filter(c => !excludeIds.includes(c.manifest.id))
      .map(c => {
      const manifest = c.manifest;
      const state = states.find(s => s.exerciseId === manifest.id);
      
      let goalAlignment = 0;
      if (primaryGoal !== 'balance' && manifest.domain === primaryGoal) {
        goalAlignment = 40;
        if (phaseId === 'focus') goalAlignment = 60;
        if (phaseId === 'balance') goalAlignment = 20;
      }

      let weaknessPriority = 0;
      const domainStates = states.filter(s => {
        const m = catalog.find(c => c.manifest.id === s.exerciseId);
        return m && m.manifest.domain === manifest.domain;
      });
      const isSparseDomain = domainStates.length < 3;

      if (!isSparseDomain) {
        if (weakestDomain === manifest.domain) {
          weaknessPriority = 35;
          if (phaseId === 'balance') weaknessPriority = 60;
        } else if (secondWeakestDomain === manifest.domain) {
          weaknessPriority = 15;
          if (phaseId === 'balance') weaknessPriority = 25;
        }
      }
      const weeklyFocus = weeklyFocusBias(manifest.domain, focusOfTheWeek);

      let skillNeed = 0;
      let maintenance = 0;
      let neglected = 0;
      
      manifest.skills.forEach(skillId => {
        const sIdx = skills.find(s => s.skill === skillId);
        if (sIdx) {
          if (sIdx.value < 500) {
            skillNeed += (500 - sIdx.value) / 25;
          } else if (sIdx.value > 850 && sIdx.confidence > 70) {
            maintenance += 10;
          }
          
          const daysSinceUpdate = (Date.now() - new Date(sIdx.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate > 7) {
            neglected += 15;
          }
        } else {
          skillNeed += 10;
        }
      });

      let repetitionPenalty = 0;
      let novelty = 0;
      let plateauPenalty = 0;
      
      if (state) {
        const hoursSincePlayed = (Date.now() - new Date(state.lastPlayedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSincePlayed < 12) {
          repetitionPenalty = 50;
        } else if (hoursSincePlayed < 48) {
          repetitionPenalty = 20;
        } else if (hoursSincePlayed > 168) {
          novelty = 15;
        }
        
        if ((state.consecutivePlateau || 0) >= 3) {
          plateauPenalty = 30;
        }
        if (phaseId === 'orient') novelty += 30;
      } else {
        if (phaseId !== 'orient') novelty = 20;
      }

      let sessionBalance = 0;
      if (selectedDomains.has(manifest.domain)) {
        sessionBalance = (manifest.domain === weakestDomain) ? -15 : -40;
      }
      
      if (selectedExerciseIds.has(manifest.id)) {
        repetitionPenalty += 1000;
      }

      const score = goalAlignment + weaknessPriority + weeklyFocus + skillNeed + neglected + novelty + maintenance - repetitionPenalty - plateauPenalty + sessionBalance;
      
      const trace = `Goal:${goalAlignment} Weak:${weaknessPriority} Skill:${skillNeed.toFixed(1)} Negl:${neglected} Nov:${novelty} Maint:${maintenance} Rep:-${repetitionPenalty} Plat:-${plateauPenalty} Bal:${sessionBalance} = ${score.toFixed(1)}`;

      let baseReason = 'Сбалансированная тренировка';
      const pw = programWeek || 1;
      const pd = programDay || 1;
      const dayPrefix = `Неделя ${pw} · День ${pd} · `;
      
      const isNew = !state;
      if (isSparse || isSparseDomain) {
        baseReason = (novelty > 0 || isNew) ? `Знакомство` : `Сбор данных`;
      } else if (maintenance > 0 && skillNeed < 5) {
        baseReason = `Поддержание тонуса`;
      } else if (plateauPenalty > 0 && selectedDomains.has(manifest.domain) === false) {
        baseReason = `Смена контекста`;
      } else if (neglected > 0) {
        baseReason = `Давно не тренировали`;
      } else if (goalAlignment > 0 && weaknessPriority > 0) {
        baseReason = `Цель и отстающий навык`;
      } else if (goalAlignment > 0) {
        baseReason = `Работа над целью`;
      } else if (weaknessPriority > 0) {
        baseReason = `Отстающий навык`;
      } else if (weeklyFocus > 0) {
        baseReason = `Фокус недели`;
      } else if (skillNeed > 10) {
        baseReason = `Актуальная задача`;
      } else if (novelty > 0) {
        baseReason = `Новая задача`;
      }

      const reason = `${dayPrefix}${baseReason}`;

      return {
        exerciseId: manifest.id,
        manifest,
        score,
        reason,
        trace
      };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates;
}

export function buildTrainingPlan(params: {
  durationSec: number;
  catalog: { manifest: ExerciseManifest }[];
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  primaryGoal?: string;
  focusOfTheWeek?: string | null;
  programWeek?: number;
  programDay?: number;
  programPhase?: string;
  fatigueOrChurn?: boolean;
  excludeIds?: string[];
  isSparse?: boolean;
}): TrainingPlan {
  const { durationSec, catalog, domains, skills, states, primaryGoal = 'balance', focusOfTheWeek, programWeek, programDay, programPhase, fatigueOrChurn, excludeIds = [], isSparse = states.length < 9 } = params;
  
  const phaseId = programPhase ?? phaseForWeek(programWeek ?? 1).id;
  const blockDurationSec = 180; // ~3 minutes per block
  let targetBlocks = Math.max(2, Math.round(durationSec / blockDurationSec));
  if (targetBlocks > 6) targetBlocks = 6;
  if (phaseId === 'orient' && targetBlocks > 3) targetBlocks = 3;
  if (phaseId === 'sustain' && fatigueOrChurn && targetBlocks > 2) targetBlocks = 2;

  const sortedDomains = [...domains].sort((a, b) => a.value - b.value);
  const isGlobalSparse = states.length < 9;
  const weakestDomain = (!isGlobalSparse && sortedDomains.length > 0) ? sortedDomains[0].domain : null;
  const secondWeakestDomain = (!isGlobalSparse && sortedDomains.length > 1) ? sortedDomains[1].domain : null;

  const focusDomains = new Set<string>();
  if (primaryGoal && primaryGoal !== 'balance') focusDomains.add(primaryGoal);
  if (weakestDomain) focusDomains.add(weakestDomain);
  if (focusOfTheWeek) focusDomains.add(focusOfTheWeek);
  if (secondWeakestDomain) focusDomains.add(secondWeakestDomain);

  const items: TrainingPlanItem[] = [];
  const selectedExerciseIds = new Set<string>();
  const selectedDomains = new Set<string>();
  
  for (let blockIndex = 0; blockIndex < targetBlocks; blockIndex++) {
    const scoredCandidates = getScoredCandidates({ ...params, selectedExerciseIds, selectedDomains });

    let chosen = scoredCandidates[0];
    
    items.push({ 
      exerciseId: chosen.exerciseId, 
      reason: chosen.reason,
      domain: chosen.manifest.domain
    });
    selectedExerciseIds.add(chosen.exerciseId);
    selectedDomains.add(chosen.manifest.domain);
  }


  // Set initial nextExerciseId for each slot
  const domainCounts: Record<string, number> = {};
  for (const item of items) {
    if (item.domain) domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
  }
  const maxDomainCount = Math.max(0, ...Object.values(domainCounts));

  for (let i = 0; i < items.length; i++) {
    const currentItem = items[i];
    const selectedExerciseIdsFixed = new Set<string>();
    const selectedDomainsFixed = new Set<string>();
    for (let j = 0; j < items.length; j++) {
      if (j === i) continue;
      selectedExerciseIdsFixed.add(items[j].exerciseId);
      if (items[j].domain) selectedDomainsFixed.add(items[j].domain!);
    }
    const scoredCandidates = getScoredCandidates({
      ...params,
      selectedExerciseIds: selectedExerciseIdsFixed,
      selectedDomains: selectedDomainsFixed
    });

    let nextCandidate = null;
    for (const c of scoredCandidates) {
      if (selectedExerciseIdsFixed.has(c.exerciseId)) continue;
      if (c.exerciseId === currentItem.exerciseId) continue;
      
      const tempCounts: Record<string, number> = {};
      for (let j = 0; j < items.length; j++) {
        if (j === i) tempCounts[c.manifest.domain] = (tempCounts[c.manifest.domain] || 0) + 1;
        else {
          const dom = items[j].domain;
          if (dom) tempCounts[dom] = (tempCounts[dom] || 0) + 1;
        }
      }
      const tempMax = Math.max(0, ...Object.values(tempCounts));
      if (tempMax <= maxDomainCount) {
        nextCandidate = c;
        break;
      }
    }
    if (nextCandidate) {
      items[i].nextExerciseId = nextCandidate.exerciseId;
      items[i].nextDomain = nextCandidate.manifest.domain;
    }
  }

  return { focusDomains: Array.from(focusDomains), items };

}

export function buildSession(params: {
  durationSec: number, 
  catalog: any[], 
  domainIndexes: any[], 
  lastPlayedByExercise: Record<string, string>, 
  yesterdayDomains: string[]
}): any[] {
  const mockCatalog = params.catalog.map(c => ({ manifest: { id: c.id, domain: c.domain, skills: [] } as any }));
  const plan = buildTrainingPlan({
    durationSec: params.durationSec,
    catalog: mockCatalog,
    domains: params.domainIndexes,
    skills: [],
    states: Object.keys(params.lastPlayedByExercise).map(id => ({
      exerciseId: id,
      lastPlayedAt: params.lastPlayedByExercise[id],
      level: 1, difficulty: 1, performance: 0, lastAccuracy: 0
    }))
  });
  return plan.items;
}


export function rerollTrainingPlanSlot(params: {
  catalog: { manifest: ExerciseManifest }[];
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  primaryGoal?: string;
  focusOfTheWeek?: string | null;
  programWeek?: number;
  programDay?: number;
  programPhase?: string;
  excludeIds?: string[];
  isSparse?: boolean;
}, plan: TrainingPlan, slotIndex: number): { plan: TrainingPlan; applied: boolean } {
  if (slotIndex < 0 || slotIndex >= plan.items.length) return { plan, applied: false };
  const currentItem = plan.items[slotIndex];
  if (currentItem.rerolled) return { plan, applied: false };

  // Calculate pre-reroll domain max count
  const domainCounts: Record<string, number> = {};
  for (const item of plan.items) {
    if (item.domain) domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
  }
  const maxDomainCount = Math.max(0, ...Object.values(domainCounts));

  // Build selected sets excluding the rerolled slot
  const selectedExerciseIds = new Set<string>();
  const selectedDomains = new Set<string>();
  for (let i = 0; i < plan.items.length; i++) {
    if (i === slotIndex) continue;
    selectedExerciseIds.add(plan.items[i].exerciseId);
    if (plan.items[i].domain) selectedDomains.add(plan.items[i].domain!);
  }

  const scoredCandidates = getScoredCandidates({
    ...params,
    selectedExerciseIds,
    selectedDomains
  });

  // Exclude ids already used in other slots (already heavily penalized, but to be sure we can filter or skip them)
  // Find next eligible candidate
  let nextCandidate = null;
  let nextCandidateIndex = -1;
  
  // The first candidate might be the original one, we want the NEXT eligible one.
  // Wait, if we use nextExerciseId, we want the next highest score after the current or whatever satisfies the rule.
  
  for (let i = 0; i < scoredCandidates.length; i++) {
    const c = scoredCandidates[i];
    if (c.exerciseId === currentItem.exerciseId) continue;
    if (selectedExerciseIds.has(c.exerciseId)) continue;
    
    // Check balance rule
    const newCount = (domainCounts[c.manifest.domain] || 0) + (c.manifest.domain === currentItem.domain ? 0 : 1) - (c.manifest.domain === currentItem.domain ? 1 : 0);
    // Actually simpler:
    const tempCounts: Record<string, number> = {};
    for (let j = 0; j < plan.items.length; j++) {
      if (j === slotIndex) tempCounts[c.manifest.domain] = (tempCounts[c.manifest.domain] || 0) + 1;
      else {
        const dom = plan.items[j].domain;
        if (dom) tempCounts[dom] = (tempCounts[dom] || 0) + 1;
      }
    }
    const tempMax = Math.max(0, ...Object.values(tempCounts));
    if (tempMax <= maxDomainCount) {
      nextCandidate = c;
      nextCandidateIndex = i;
      break;
    }
  }

  if (!nextCandidate) return { plan, applied: false };

  // Find next after next for the new nextExerciseId
  let nextNextId: string | undefined;
  let nextNextDomain: string | undefined;
  for (let i = nextCandidateIndex + 1; i < scoredCandidates.length; i++) {
    const c = scoredCandidates[i];
    if (selectedExerciseIds.has(c.exerciseId)) continue;
    const tempCounts: Record<string, number> = {};
    for (let j = 0; j < plan.items.length; j++) {
      if (j === slotIndex) tempCounts[c.manifest.domain] = (tempCounts[c.manifest.domain] || 0) + 1;
      else {
        const dom = plan.items[j].domain;
        if (dom) tempCounts[dom] = (tempCounts[dom] || 0) + 1;
      }
    }
    const tempMax = Math.max(0, ...Object.values(tempCounts));
    if (tempMax <= maxDomainCount) {
      nextNextId = c.exerciseId;
      nextNextDomain = c.manifest.domain;
      break;
    }
  }

  const newItems = [...plan.items];
  newItems[slotIndex] = {
    ...currentItem,
    exerciseId: nextCandidate.exerciseId,
    reason: nextCandidate.reason,
    domain: nextCandidate.manifest.domain,
    nextExerciseId: nextNextId,
    nextDomain: nextNextDomain,
    rerolled: true
  };

  return { plan: { ...plan, items: newItems }, applied: true };
}

/** Fill a one-shot runner-up on rendered Today rows using scoredCandidates. */
export function fillRenderedSlotAlternatives<T extends {
  exerciseId: string;
  domain?: string;
  nextExerciseId?: string;
  nextDomain?: string;
  rerolled?: boolean;
}>(items: T[], catalog: { manifest: ExerciseManifest }[]): T[] {
  if (!items.length) return items;
  const domainOf = (id: string, domain?: string) =>
    domain || catalog.find((c) => c.manifest.id === id)?.manifest.domain;
  const domainCounts: Record<string, number> = {};
  for (const it of items) {
    const d = domainOf(it.exerciseId, it.domain);
    if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
  }
  const maxDomainCount = Math.max(0, ...Object.values(domainCounts), 0);
  return items.map((item, i) => {
    if (item.rerolled || item.nextExerciseId) return item;
    const selectedExerciseIds = new Set<string>();
    const selectedDomains = new Set<string>();
    items.forEach((other, j) => {
      if (j === i) return;
      selectedExerciseIds.add(other.exerciseId);
      const d = domainOf(other.exerciseId, other.domain);
      if (d) selectedDomains.add(d);
    });
    const scoredCandidates = getScoredCandidates({
      catalog,
      domains: [],
      skills: [],
      states: [],
      selectedExerciseIds,
      selectedDomains,
      isSparse: true
    });
    for (const c of scoredCandidates) {
      if (c.exerciseId === item.exerciseId || selectedExerciseIds.has(c.exerciseId)) continue;
      const temp: Record<string, number> = {};
      items.forEach((other, j) => {
        const d = j === i ? c.manifest.domain : domainOf(other.exerciseId, other.domain);
        if (d) temp[d] = (temp[d] || 0) + 1;
      });
      const tempMax = Math.max(0, ...Object.values(temp), 0);
      if (tempMax <= maxDomainCount) {
        return {
          ...item,
          domain: item.domain || domainOf(item.exerciseId),
          nextExerciseId: c.exerciseId,
          nextDomain: c.manifest.domain
        };
      }
    }
    return item;
  });
}
