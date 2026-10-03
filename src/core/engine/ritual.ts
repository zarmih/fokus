import { DOMAIN_IDS } from './constants';
import { clip } from './math';
import { confidence01, getDomain } from './ability';
import { itemInformation, selectDifficulty } from './irt';
import { classifySlot, getSpacing, slotMix, targetBlockCount, urgency, SLOT_REASON } from './scheduler';
import type {
  AbilityModel,
  CatalogItem,
  DomainId,
  RitualItem,
  RitualPlan,
  RitualSlotKind,
  ScoredCandidate
} from './types';
import type { ExerciseState } from '../types';
import { phaseForWeek, isPhaseMilestoneDay, milestoneExerciseId, milestoneReason, MILESTONE_EXERCISE_IDS } from '../program-phases';

export interface ComposeRitualParams {
  model: AbilityModel;
  catalog: CatalogItem[];
  states: ExerciseState[];
  durationSec: number;
  primaryGoal?: string;
  focusOfTheWeek?: string | null;
  nowMs: number;
  excludeIds?: string[];
  rng?: () => number;
  programWeek?: number;
  programDay?: number;
  programPhase?: string;
  fatigueOrChurn?: boolean;
  isSparse?: boolean;
}

export function composeRitual(params: ComposeRitualParams): RitualPlan {
  const rng = params.rng || Math.random;
  const goal = params.primaryGoal || 'balance';
  const exclude = new Set(params.excludeIds || []);
  const catalog = params.catalog.filter((c) => !exclude.has(c.id));
  const phaseId = params.programPhase ?? phaseForWeek(params.programWeek ?? 1).id;

  let maxBlocks = targetBlockCount(params.durationSec);
  if (phaseId === 'orient' && maxBlocks > 3) maxBlocks = 3;
  if (phaseId === 'sustain' && params.fatigueOrChurn && maxBlocks > 2) maxBlocks = 2;

  const targetBlocks = Math.min(maxBlocks, Math.max(1, catalog.length));
  const mix = slotMix(targetBlocks).slice(0, targetBlocks);

  const focus = focusDomains(params.model, goal);
  const selectedIds = new Set<string>();
  const selectedDomains: DomainId[] = [];
  const items: RitualItem[] = [];

  const pw = params.programWeek || 1;
  const pd = params.programDay || 1;
  let lockedMilestone: { id: string; domain: DomainId; reason: string } | null = null;
  
  if (isPhaseMilestoneDay(pw, pd)) {
    const desiredId = milestoneExerciseId(pw);
    let lockedManifest = catalog.find(c => c.id === desiredId);
    if (!lockedManifest) {
      const fallbackId = MILESTONE_EXERCISE_IDS.find(id => id !== desiredId);
      if (fallbackId) {
        lockedManifest = catalog.find(c => c.id === fallbackId);
      }
    }
    if (lockedManifest) {
      lockedMilestone = {
        id: lockedManifest.id,
        domain: lockedManifest.domain,
        reason: milestoneReason(pw)
      };
      selectedIds.add(lockedManifest.id);
      selectedDomains.push(lockedManifest.domain);
    }
  }

  mix.forEach((wanted, i) => {
    if (lockedMilestone && i === targetBlocks - 1) {
      const state = params.states.find(s => s.exerciseId === lockedMilestone!.id);
      const stored = state?.difficulty ?? 3;
      const item = catalog.find(c => c.id === lockedMilestone!.id)!;
      const pick = selectDifficulty({ model: params.model, item, storedDifficulty: stored, rng });
      
      items.push({
        exerciseId: lockedMilestone.id,
        domain: lockedMilestone.domain,
        slot: wanted,
        reason: lockedMilestone.reason,
        difficulty: pick.difficulty,
        pSuccess: pick.pSuccess,
        trace: 'Milestone lock'
      });
      return;
    }

    const ranked = scoreCatalog({
      ...params,
      catalog,
      rng,
      wantedSlot: wanted,
      selectedIds,
      selectedDomains,
      goal,
      phaseId
    });
    const chosen = pickWithExplore(ranked, rng);
    if (!chosen) return;
    selectedIds.add(chosen.exerciseId);
    selectedDomains.push(chosen.domain);
    items.push({
      exerciseId: chosen.exerciseId,
      domain: chosen.domain,
      slot: chosen.slot,
      reason: chosen.reason,
      difficulty: chosen.difficulty,
      pSuccess: chosen.pSuccess,
      trace: chosen.trace
    });
  });


  // Compute nextExerciseId for each slot
  const domainCounts: Record<string, number> = {};
  for (const item of items) {
    domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
  }
  const maxDomainCount = Math.max(0, ...Object.values(domainCounts));

  for (let i = 0; i < items.length; i++) {
    const currentItem = items[i];
    if (lockedMilestone && currentItem.exerciseId === lockedMilestone.id) continue;
    const selIds = new Set<string>();
    const selDomains: DomainId[] = [];
    for (let j = 0; j < items.length; j++) {
      if (j === i) continue;
      selIds.add(items[j].exerciseId);
      selDomains.push(items[j].domain);
    }

    const ranked = scoreCatalog({
      ...params,
      catalog,
      rng,
      wantedSlot: currentItem.slot,
      selectedIds: selIds,
      selectedDomains: selDomains,
      goal,
      phaseId
    });

    const live = ranked.filter((c) => c.score > -500).sort((a, b) => b.score - a.score);

    let nextCandidate = null;
    for (const c of live) {
      if (selIds.has(c.exerciseId)) continue;
      if (c.exerciseId === currentItem.exerciseId) continue;
      
      const tempCounts: Record<string, number> = {};
      for (let j = 0; j < items.length; j++) {
        if (j === i) tempCounts[c.domain] = (tempCounts[c.domain] || 0) + 1;
        else {
          const dom = items[j].domain;
          tempCounts[dom] = (tempCounts[dom] || 0) + 1;
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
      items[i].nextDomain = nextCandidate.domain;
    }
  }

  return { focusDomains: focus, items, targetBlocks, mix };

}

function focusDomains(model: AbilityModel, goal: string): DomainId[] {
  const set = new Set<DomainId>();
  if (goal && goal !== 'balance' && DOMAIN_IDS.includes(goal as DomainId)) {
    set.add(goal as DomainId);
  }
  const weakest = [...model.domains].sort((a, b) => a.theta - b.theta)[0];
  if (weakest) set.add(weakest.domain);
  return Array.from(set);
}

function domainNeed(model: AbilityModel, domain: DomainId): number {
  const ranked = [...model.domains].sort((a, b) => a.theta - b.theta);
  const idx = ranked.findIndex((d) => d.domain === domain);
  if (idx < 0) return 0.5;
  return clip(1 - idx / Math.max(1, ranked.length - 1), 0, 1);
}

function scoreCatalog(params: ComposeRitualParams & {
  wantedSlot: RitualSlotKind;
  selectedIds: Set<string>;
  selectedDomains: DomainId[];
  goal: string;
  rng: () => number;
  programWeek?: number;
  programDay?: number;
  focusOfTheWeek?: string | null;
  isSparse?: boolean;
  phaseId: string;
}): ScoredCandidate[] {
  const { model, catalog, states, nowMs, wantedSlot, selectedIds, selectedDomains, goal, rng, programWeek, programDay, focusOfTheWeek, isSparse, phaseId } = params;

  return catalog.map((item) => {
    const spacing = getSpacing(model, item.id);
    const slot = classifySlot(spacing, nowMs);
    const state = states.find((s) => s.exerciseId === item.id);
    const stored = state?.difficulty ?? 3;
    const pick = selectDifficulty({ model, item, storedDifficulty: stored, rng: () => 0.5 });
    const info = itemInformation(model, item, pick.difficulty);
    const domain = getDomain(model, item.domain);
    const need = domainNeed(model, item.domain);
    const conf = confidence01(domain.precision, domain.sources.length);

    let score = info * 48;
    score += urgency(spacing, nowMs) * 18;
    score += need * 30;
    score += (1 - conf) * 10;

    let slotMatch = 0;
    if (slot === wantedSlot) slotMatch = 52;
    else if (wantedSlot === 'overdue' && slot === 'due') slotMatch = 18;
    else if (wantedSlot === 'due' && slot === 'overdue') slotMatch = 22;
    else if (wantedSlot === 'fresh' && spacing.repetitions === 0) slotMatch = 40;
    else slotMatch = -8;
    score += slotMatch;

    let goalPts = 0;
    if (goal !== 'balance' && item.domain === goal) {
      goalPts = 34;
      if (phaseId === 'focus') goalPts = 55;
      if (phaseId === 'balance') goalPts = 10;
    }
    score += goalPts;

    let weeklyFocusPts = 0;
    if (focusOfTheWeek && item.domain === focusOfTheWeek) weeklyFocusPts = 18;
    score += weeklyFocusPts;

    let diversity = 0;
    if (selectedDomains.includes(item.domain)) diversity = -42;
    score += diversity;

    let repeat = 0;
    if (selectedIds.has(item.id)) repeat = -1000;
    const hoursSince = spacing.lastPlayedAt
      ? (nowMs - Date.parse(spacing.lastPlayedAt)) / 3600000
      : 999;
    
    let timeRepeatPenalty = 0;
    if (hoursSince < 10) timeRepeatPenalty = 48;
    else if (hoursSince < 30) timeRepeatPenalty = 16;
    
    const isThinDomain = catalog.filter(c => c.domain === item.domain).length < 4;
    if (isThinDomain) {
      timeRepeatPenalty /= 2;
    }
    
    repeat -= timeRepeatPenalty;
    score += repeat;

    let plateau = 0;
    if ((state?.consecutivePlateau || 0) >= 3) plateau = -22;
    score += plateau;

    let novelty = 0;
    const isUnplayed = (!state || spacing.repetitions === 0);
    if (isUnplayed) {
      if (phaseId !== 'orient') novelty = 16;
    } else {
      if (phaseId === 'orient') novelty = 24;
    }
    score += novelty;

    const reason = reasonFor({
      wantedSlot,
      slot,
      goalPts,
      need,
      novelty,
      plateau,
      goal,
      itemDomain: item.domain,
      conf,
      programWeek,
      programDay,
      weeklyFocusPts,
      isSparse: isSparse ?? (conf < 0.4)
    });

    const trace = `I:${info.toFixed(2)} Urg:${urgency(spacing, nowMs).toFixed(2)} Need:${need.toFixed(2)} Slot:${slotMatch} Goal:${goalPts} WFocus:${weeklyFocusPts} Div:${diversity} Rep:${repeat} Plat:${plateau} Nov:${novelty} = ${score.toFixed(1)}`;

    return {
      exerciseId: item.id,
      domain: item.domain,
      slot: slot === wantedSlot ? wantedSlot : slot,
      score,
      difficulty: pick.difficulty,
      pSuccess: pick.pSuccess,
      reason,
      trace
    };
  });
}

function reasonFor(args: {
  wantedSlot: RitualSlotKind;
  slot: RitualSlotKind;
  goalPts: number;
  need: number;
  novelty: number;
  plateau: number;
  goal: string;
  itemDomain: DomainId;
  conf: number;
  programWeek?: number;
  programDay?: number;
  weeklyFocusPts?: number;
  isSparse: boolean;
}): string {
  if (args.plateau < 0) return 'Смена контекста для прорыва';
  if (args.wantedSlot === 'overdue' || args.slot === 'overdue') return SLOT_REASON.overdue;
  
  if (args.goalPts > 0 && args.need > 0.6) {
    if (args.isSparse) return `Ваша цель: день ${args.programDay || 1} (сбор данных)`;
    return `Неделя ${args.programWeek || 1}: цель и отстающий навык`;
  }
  
  if (args.goalPts > 0) return `Неделя ${args.programWeek || 1}: работа над целью`;
  if (args.weeklyFocusPts && args.weeklyFocusPts > 0) return `Фокус ${args.programWeek ? args.programWeek + '-й недели' : 'недели'}`;
  
  if (args.need > 0.7) {
    if (args.isSparse) return 'Сбор данных для адаптации';
    return `День ${args.programDay || 1}: акцент на отстающий навык`;
  }

  if (args.novelty > 0 && args.wantedSlot === 'fresh') return SLOT_REASON.fresh;
  if (args.wantedSlot === 'due' || args.slot === 'due') return SLOT_REASON.due;
  if (args.novelty > 0) return SLOT_REASON.fresh;
  return `Фокус ${args.programWeek ? args.programWeek + '-й недели' : 'недели'}`;
}

function pickWithExplore(ranked: ScoredCandidate[], rng: () => number): ScoredCandidate | null {
  const live = ranked.filter((c) => c.score > -500).sort((a, b) => b.score - a.score);
  if (live.length === 0) return null;
  if (live.length > 1 && rng() < 0.08 && live[0].score - live[1].score < 12) {
    return live[1];
  }
  return live[0];
}


export function rerollRitualSlot(params: ComposeRitualParams, ritual: RitualPlan, slotIndex: number): { ritual: RitualPlan; applied: boolean } {
  if (slotIndex < 0 || slotIndex >= ritual.items.length) return { ritual, applied: false };
  const currentItem = ritual.items[slotIndex];
  if (currentItem.rerolled) return { ritual, applied: false };

  const domainCounts: Record<string, number> = {};
  for (const item of ritual.items) {
    domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
  }
  const maxDomainCount = Math.max(0, ...Object.values(domainCounts));

  const selectedIds = new Set<string>();
  const selectedDomains: DomainId[] = [];
  for (let i = 0; i < ritual.items.length; i++) {
    if (i === slotIndex) continue;
    selectedIds.add(ritual.items[i].exerciseId);
    selectedDomains.push(ritual.items[i].domain);
  }

  const rng = params.rng || Math.random;
  const goal = params.primaryGoal || 'balance';
  const exclude = new Set(params.excludeIds || []);
  const catalog = params.catalog.filter((c) => !exclude.has(c.id));
  const phaseId = params.programPhase ?? 'orient'; // phaseForWeek logic handles default better but we can just use params.programPhase

  const ranked = scoreCatalog({
    ...params,
    catalog,
    rng,
    wantedSlot: currentItem.slot,
    selectedIds,
    selectedDomains,
    goal,
    phaseId: params.programPhase ?? 'orient'
  });

  const live = ranked.filter((c) => c.score > -500).sort((a, b) => b.score - a.score);

  let nextCandidate = null;
  let nextCandidateIndex = -1;
  for (let i = 0; i < live.length; i++) {
    const c = live[i];
    if (c.exerciseId === currentItem.exerciseId) continue;
    if (selectedIds.has(c.exerciseId)) continue;
    
    const tempCounts: Record<string, number> = {};
    for (let j = 0; j < ritual.items.length; j++) {
      if (j === slotIndex) tempCounts[c.domain] = (tempCounts[c.domain] || 0) + 1;
      else {
        const dom = ritual.items[j].domain;
        tempCounts[dom] = (tempCounts[dom] || 0) + 1;
      }
    }
    const tempMax = Math.max(0, ...Object.values(tempCounts));
    if (tempMax <= maxDomainCount) {
      nextCandidate = c;
      nextCandidateIndex = i;
      break;
    }
  }

  if (!nextCandidate) return { ritual, applied: false };

  let nextNextId: string | undefined;
  let nextNextDomain: string | undefined;
  for (let i = nextCandidateIndex + 1; i < live.length; i++) {
    const c = live[i];
    if (selectedIds.has(c.exerciseId)) continue;
    const tempCounts: Record<string, number> = {};
    for (let j = 0; j < ritual.items.length; j++) {
      if (j === slotIndex) tempCounts[c.domain] = (tempCounts[c.domain] || 0) + 1;
      else {
        const dom = ritual.items[j].domain;
        tempCounts[dom] = (tempCounts[dom] || 0) + 1;
      }
    }
    const tempMax = Math.max(0, ...Object.values(tempCounts));
    if (tempMax <= maxDomainCount) {
      nextNextId = c.exerciseId;
      nextNextDomain = c.domain;
      break;
    }
  }

  const newItems = [...ritual.items];
  newItems[slotIndex] = {
    ...currentItem,
    exerciseId: nextCandidate.exerciseId,
    domain: nextCandidate.domain,
    slot: nextCandidate.slot,
    reason: nextCandidate.reason,
    difficulty: nextCandidate.difficulty,
    pSuccess: nextCandidate.pSuccess,
    trace: nextCandidate.trace,
    nextExerciseId: nextNextId,
    nextDomain: nextNextDomain,
    rerolled: true
  };

  return { ritual: { ...ritual, items: newItems }, applied: true };
}
