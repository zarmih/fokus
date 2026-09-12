import type { ExerciseManifest } from '../exercises/contract';
import type { DomainIndex, SkillIndex, ExerciseState } from './types';
import { weeklyFocusBias } from './transfer';
import {
  buildAdaptivePlan as engineBuildAdaptivePlan,
  type AdaptivePlan,
  type AdaptivePlanParams
} from './engine/bridge';

export interface TrainingPlanItem {
  exerciseId: string;
  reason: string;
  slot?: 'overdue' | 'due' | 'fresh';
  difficulty?: number;
  pSuccess?: number;
  domain?: string;
}

export interface TrainingPlan {
  focusDomains: string[];
  items: TrainingPlanItem[];
  source?: 'engine' | 'legacy';
}

/**
 * Engine v2 planner with a silent fallback to the heuristic builder.
 * Phase 2 program screens can call this even if those PRs are not merged:
 * Today / Session already consume the same shape.
 */
export function buildAdaptivePlan(params: AdaptivePlanParams): AdaptivePlan {
  return engineBuildAdaptivePlan(params, (p) =>
    buildTrainingPlan({
      durationSec: p.durationSec,
      catalog: p.catalog,
      domains: p.domains,
      skills: p.skills,
      states: p.states,
      primaryGoal: p.primaryGoal
    })
  );
}

export function buildTrainingPlan(params: {
  durationSec: number;
  catalog: { manifest: ExerciseManifest }[];
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  primaryGoal?: string;
  /** Optional weekly focus domain. Omitted or null is a no-op. */
  focusOfTheWeek?: string | null;
}): TrainingPlan {
  const { durationSec, catalog, domains, skills, states, primaryGoal = 'balance', focusOfTheWeek } = params;
  
  let targetBlocks = 3;
  if (durationSec >= 480) targetBlocks = 4;
  if (durationSec >= 720) targetBlocks = 5;

  const sortedDomains = [...domains].sort((a, b) => a.value - b.value);
  const weakestDomain = sortedDomains.length > 0 ? sortedDomains[0].domain : null;
  const secondWeakestDomain = sortedDomains.length > 1 ? sortedDomains[1].domain : null;

  const focusDomains = new Set<string>();
  if (primaryGoal && primaryGoal !== 'balance') focusDomains.add(primaryGoal);
  if (weakestDomain) focusDomains.add(weakestDomain);
  if (focusOfTheWeek) focusDomains.add(focusOfTheWeek);
  if (secondWeakestDomain) focusDomains.add(secondWeakestDomain);

  const items: TrainingPlanItem[] = [];
  const selectedExerciseIds = new Set<string>();
  const selectedDomains = new Set<string>();
  
  for (let blockIndex = 0; blockIndex < targetBlocks; blockIndex++) {
    const scoredCandidates = catalog.map(c => {
      const manifest = c.manifest;
      const state = states.find(s => s.exerciseId === manifest.id);
      
      let goalAlignment = 0;
      if (primaryGoal !== 'balance' && manifest.domain === primaryGoal) {
        goalAlignment = 40;
      }

      let weaknessPriority = 0;
      if (weakestDomain === manifest.domain) {
        weaknessPriority = 35; 
      } else if (secondWeakestDomain === manifest.domain) {
        weaknessPriority = 15;
      }
      const weeklyFocus = weeklyFocusBias(manifest.domain, focusOfTheWeek);

      let skillNeed = 0;
      let maintenance = 0;
      let neglected = 0;
      
      manifest.skills.forEach(skillId => {
        const sIdx = skills.find(s => s.skill === skillId);
        if (sIdx) {
          if (sIdx.value < 500) {
            skillNeed += (500 - sIdx.value) / 25; // max 20 points
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
          repetitionPenalty = 80;
        } else if (hoursSincePlayed < 48) {
          repetitionPenalty = 40;
        } else if (hoursSincePlayed > 168) {
          novelty = 15;
        }
        
        if ((state.consecutivePlateau || 0) >= 3) {
          plateauPenalty = 40; // Encourage breaking plateau by doing a different exercise
        }
      } else {
        novelty = 20;
      }

      let sessionBalance = 0;
      if (selectedDomains.has(manifest.domain)) {
        sessionBalance = -100;
      }
      
      if (selectedExerciseIds.has(manifest.id)) {
        repetitionPenalty += 1000;
      }

      // Calculate score and generate trace
      const score = goalAlignment + weaknessPriority + weeklyFocus + skillNeed + neglected + novelty + maintenance - repetitionPenalty - plateauPenalty + sessionBalance;
      
      const trace = `Goal:${goalAlignment} Weak:${weaknessPriority} Skill:${skillNeed.toFixed(1)} Negl:${neglected} Nov:${novelty} Maint:${maintenance} Rep:-${repetitionPenalty} Plat:-${plateauPenalty} Bal:${sessionBalance} = ${score.toFixed(1)}`;
      
      let reason = 'Для баланса с другими задачами';
      if (maintenance > 0 && skillNeed < 5) {
        reason = `Поддержание формы`;
      } else if (plateauPenalty > 0 && selectedDomains.has(manifest.domain) === false) {
        reason = `Смена фокуса для прорыва`;
      } else if (neglected > 0) {
        reason = `Давно не тренировали этот навык`;
      } else if (goalAlignment > 0 && weaknessPriority > 0) {
        reason = `Идеально ложится на вашу цель и слабую зону`;
      } else if (goalAlignment > 0) {
        reason = `Главная цель на сегодня`;
      } else if (weaknessPriority > 0) {
        reason = `Подтягиваем слабую зону`;
      } else if (weeklyFocus > 0) {
        reason = `Фокус этой недели`;
      } else if (skillNeed > 10) {
        reason = `Тренировка отстающего навыка`;
      } else if (novelty > 0) {
        reason = `Новый вызов для мозга`;
      }

      return {
        exerciseId: manifest.id,
        manifest,
        score,
        reason,
        trace
      };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    // Controlled exploration: 10% chance to pick the 2nd best option if it's within 15 points
    let chosen = scoredCandidates[0];
    if (scoredCandidates.length > 1 && Math.random() < 0.1 && (scoredCandidates[0].score - scoredCandidates[1].score) < 15) {
      chosen = scoredCandidates[1];
    }

    // Pass the trace directly to the item reason in debug mode (disabled for normal UI, logged to console)
    // console.debug(`[Recommender] Selected ${chosen.exerciseId}: ${chosen.trace}`);
    
    items.push({ exerciseId: chosen.exerciseId, reason: chosen.reason });
    selectedExerciseIds.add(chosen.exerciseId);
    selectedDomains.add(chosen.manifest.domain);
  }

  return { focusDomains: Array.from(focusDomains), items };
}

// Keep old signature for backward compatibility with tests
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
  return plan.items.map(item => ({ exerciseId: item.exerciseId }));
}
