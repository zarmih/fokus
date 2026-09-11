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

export interface ComposeRitualParams {
  model: AbilityModel;
  catalog: CatalogItem[];
  states: ExerciseState[];
  durationSec: number;
  primaryGoal?: string;
  nowMs: number;
  excludeIds?: string[];
  rng?: () => number;
}

/**
 * Compose the daily ritual.
 *
 * Pipeline:
 *  1. Decide how many blocks the ~15m (or shorter) session holds.
 *  2. Lay out overdue / due / fresh slots.
 *  3. For each slot, score the catalog with IRT information, spacing
 *     urgency, domain need, and goal alignment — then pick a winner
 *     that respects domain diversity.
 *
 * Falls through slot kinds if the catalog has no matching card
 * (overdue → due → fresh) so a brand-new profile still gets a plan.
 */
export function composeRitual(params: ComposeRitualParams): RitualPlan {
  const rng = params.rng || Math.random;
  const goal = params.primaryGoal || 'balance';
  const exclude = new Set(params.excludeIds || []);
  const catalog = params.catalog.filter((c) => !exclude.has(c.id));
  const targetBlocks = Math.min(targetBlockCount(params.durationSec), Math.max(1, catalog.length));
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
      goal
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
}): ScoredCandidate[] {
  const { model, catalog, states, nowMs, wantedSlot, selectedIds, selectedDomains, goal, rng } = params;

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
    if (goal !== 'balance' && item.domain === goal) goalPts = 34;
    score += goalPts;

    let diversity = 0;
    if (selectedDomains.includes(item.domain)) diversity = -100;
    score += diversity;

    let repeat = 0;
    if (selectedIds.has(item.id)) repeat = -1000;
    const hoursSince = spacing.lastPlayedAt
      ? (nowMs - Date.parse(spacing.lastPlayedAt)) / 3600000
      : 999;
    if (hoursSince < 12) repeat -= 80;
    else if (hoursSince < 36) repeat -= 40;
    score += repeat;

    let plateau = 0;
    if ((state?.consecutivePlateau || 0) >= 3) plateau = -40;
    score += plateau;

    let novelty = 0;
    if (!state || spacing.repetitions === 0) novelty = 16;
    score += novelty;

    const reason = reasonFor({
      wantedSlot,
      slot,
      goalPts,
      need,
      novelty,
      plateau,
      goal,
      itemDomain: item.domain
    });

    const trace = `I:${info.toFixed(2)} Urg:${urgency(spacing, nowMs).toFixed(2)} Need:${need.toFixed(2)} Slot:${slotMatch} Goal:${goalPts} Div:${diversity} Rep:${repeat} Plat:${plateau} Nov:${novelty} = ${score.toFixed(1)}`;

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
}): string {
  if (args.plateau < 0) return 'Смена фокуса для прорыва';
  if (args.wantedSlot === 'overdue' || args.slot === 'overdue') return SLOT_REASON.overdue;
  if (args.novelty > 0 && args.wantedSlot === 'fresh') return SLOT_REASON.fresh;
  if (args.goalPts > 0 && args.need > 0.6) return 'Идеально ложится на вашу цель и слабую зону';
  if (args.goalPts > 0) return 'Главная цель на сегодня';
  if (args.need > 0.7) return 'Подтягиваем слабую зону';
  if (args.wantedSlot === 'due' || args.slot === 'due') return SLOT_REASON.due;
  if (args.novelty > 0) return SLOT_REASON.fresh;
  return 'Для баланса с другими задачами';
}

function pickWithExplore(ranked: ScoredCandidate[], rng: () => number): ScoredCandidate | null {
  const live = ranked.filter((c) => c.score > -500).sort((a, b) => b.score - a.score);
  if (live.length === 0) return null;
  if (live.length > 1 && rng() < 0.08 && live[0].score - live[1].score < 12) {
    return live[1];
  }
  return live[0];
}
