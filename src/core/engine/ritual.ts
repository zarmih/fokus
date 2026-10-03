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
import { phaseForWeek } from '../program-phases';

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

  mix.forEach((wanted) => {
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
    if (hoursSince < 10) repeat -= 48;
    else if (hoursSince < 30) repeat -= 16;
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
