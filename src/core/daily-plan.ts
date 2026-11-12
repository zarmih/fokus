/**
 * The one daily plan. Today (what you see), Program (what is explained) and Session (what you play)
 * all consume `planToday()`; nothing re-plans on its own.
 *
 * Before: Today showed a plan from `ritual-targeter` on top of `planWithRecovery`, explained a third
 * one, and Session re-planned every block after the first via `planWithRecovery` again — the user saw
 * one list and played another. Budget caps (first week ramp, soft return, retention, recovery,
 * resume) were applied in different orders in different screens.
 *
 * Here: one budget (`resolveDailyBudget`: the tightest applicable cap wins and says why), one
 * composition (`planWithRecovery` → engine `composeRitual`, gentle-return bias inside `planForNow`),
 * one retention re-order, one explanation derived from the items actually planned.
 */
import { storage } from './storage';
import { registry } from '../exercises/registry';
import { planWithRecovery } from './recovery';
import { loadContinuitySnapshot, ritualDurationSec } from './continuity';
import { assessRetention, describeProgramRetention } from './retention';
import { applyRetentionRitualOrder } from './today-plan';
import { getTodayRitual } from './onboarding';
import { getProgramPosition } from './adaptive-plan';
import { CORE_PROGRAM_DAYS, inCoreProgram, isCoreExercise, programDayNumber } from './core-catalog';
import { domainLabel } from './labels';
import type { RecoverySnapshot } from './recovery';
import type { AdaptivePlan } from './engine';

/** The single primary action, on Today and Program. */
export const PRIMARY_CTA = 'Тренировка на сегодня';

export type BudgetSource = 'profile' | 'first-week' | 'soft-return' | 'retention' | 'recovery' | 'resume';

export const BUDGET_REASON: Record<BudgetSource, string> = {
  profile: 'ваш выбранный бюджет',
  'first-week': 'разгон первой недели',
  'soft-return': 'мягкое возвращение после паузы',
  retention: 'короткий день, чтобы не терять ритм',
  recovery: 'облегчённый день по нагрузке последних сессий',
  resume: 'остаток начатой тренировки'
};

/** The tightest applicable cap wins; ties keep the earlier (more specific) source. */
export function resolveDailyBudget(caps: Partial<Record<BudgetSource, number | null | undefined>> & { profile: number }): {
  durationSec: number;
  source: BudgetSource;
} {
  const order: BudgetSource[] = ['resume', 'recovery', 'soft-return', 'retention', 'first-week', 'profile'];
  let best: { durationSec: number; source: BudgetSource } = { durationSec: Math.max(60, Math.round(caps.profile)), source: 'profile' };
  for (const src of order) {
    const v = caps[src];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    const sec = Math.max(60, Math.round(v));
    if (sec < best.durationSec || (sec === best.durationSec && order.indexOf(src) < order.indexOf(best.source))) {
      best = { durationSec: sec, source: src };
    }
  }
  return best;
}

export interface DailyPlanItem {
  exerciseId: string;
  reason: string;
  domain?: string;
  difficulty?: number;
  slot?: string;
  nextExerciseId?: string;
  nextDomain?: string;
  rerolled?: boolean;
  core?: boolean;
}

export interface DailyPlan {
  items: DailyPlanItem[];
  focusDomains: string[];
  durationSec: number;
  budgetSource: BudgetSource;
  programDay: number;
  inCoreProgram: boolean;
  /** One sentence about why these exercises, built from the items actually planned. */
  why: string;
  recovery: RecoverySnapshot;
  recalibration: AdaptivePlan['recalibration'];
  softReturn: boolean;
}

export function explainComposition(items: { domain?: string; core?: boolean }[], programDay: number, durationSec: number): string {
  const domains = [...new Set(items.map((i) => i.domain).filter((d): d is string => !!d))];
  const minutes = Math.max(1, Math.round(durationSec / 60));
  const areas = domains.map((d) => domainLabel(d)).join(', ');
  const program = inCoreProgram(programDay)
    ? `День ${programDay} из ${CORE_PROGRAM_DAYS}: упражнения из основного набора.`
    : 'Программа 14 дней пройдена: подключаем весь каталог.';
  return `${program} ${items.length} ${plural(items.length, 'блок', 'блока', 'блоков')} ≈ ${minutes} мин, области: ${areas || '—'}.`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function planToday(opts: { nowMs?: number; excludeIds?: string[]; resumeSec?: number } = {}): DailyPlan {
  const now = new Date(opts.nowMs ?? Date.now());
  const profile = storage.getProfile();
  const snap = loadContinuitySnapshot(storage, now);
  const ds = storage.getDaySummaries();
  const sessions = storage.getSessions();
  const domains = storage.getDomains();
  const states = storage.getExerciseStates();
  const profileSec = profile.sessionLengthSec || 300;

  const weekRitual = getTodayRitual(profile.firstWeekPlan, snap.today, ds);
  let retentionSec: number | null = null;
  let retSnap: ReturnType<typeof assessRetention> | null = null;
  let programRet: ReturnType<typeof describeProgramRetention> | null = null;
  try {
    retSnap = assessRetention({
      daySummaries: ds,
      sessions,
      domains,
      playedToday: snap.streak.playedToday,
      streak: snap.streak.current,
      skippedYesterday: snap.streak.openMisses === 1,
      sessionLengthSec: profileSec,
      shieldCharges: (profile as { shieldCharges?: number }).shieldCharges,
      now
    });
    programRet = describeProgramRetention(retSnap, {
      profileLengthSec: profileSec,
      softReturnActive: snap.ritual.active,
      playedToday: snap.streak.playedToday
    });
    if (!snap.ritual.active) retentionSec = programRet.durationSec;
  } catch {
    retSnap = null;
    programRet = null;
  }

  const pre = resolveDailyBudget({
    profile: profileSec,
    'first-week': weekRitual.inFirstWeek && weekRitual.ritualDay ? weekRitual.ritualDay.durationSec : null,
    'soft-return': snap.ritual.active ? ritualDurationSec(profileSec, snap.ritual) : null,
    retention: retentionSec,
    resume: opts.resumeSec ?? null
  });

  const ritual = planWithRecovery({
    durationSec: pre.durationSec,
    catalog: registry as any,
    domains,
    skills: storage.getSkills(),
    states,
    primaryGoal: profile.primaryGoal,
    sessions,
    daySummaries: ds,
    recoveryHintsEnabled: profile.recoveryHints !== false,
    nowIso: now.toISOString(),
    excludeIds: opts.excludeIds
  });

  const budget = resolveDailyBudget({
    profile: profileSec,
    'first-week': pre.source === 'first-week' ? pre.durationSec : null,
    'soft-return': pre.source === 'soft-return' ? pre.durationSec : null,
    retention: pre.source === 'retention' ? pre.durationSec : null,
    resume: pre.source === 'resume' ? pre.durationSec : null,
    recovery: ritual.snapshot.gate.active ? ritual.snapshot.durationSec : null
  });

  let items: DailyPlanItem[] = (ritual.plan.items || []).map((it: any) => ({ ...it }));
  let focusDomains = ritual.plan.focusDomains || [];
  if (programRet && retSnap) {
    const ordered = applyRetentionRitualOrder({ items, focusDomains } as any, {
      focusDomain: programRet.focusDomain,
      band: retSnap.band,
      gapDays: retSnap.gapDays,
      softReturnActive: snap.ritual.active,
      catalog: registry.map((r) => ({ id: r.manifest.id, domain: r.manifest.domain }))
    });
    items = ordered.items as DailyPlanItem[];
    focusDomains = ordered.focusDomains;
  }
  const domainOf = new Map(registry.map((r) => [r.manifest.id, r.manifest.domain] as const));
  items = items.map((it) => ({ ...it, domain: it.domain || domainOf.get(it.exerciseId), core: isCoreExercise(it.exerciseId) }));

  const pos = getProgramPosition(snap, profile as any);
  const programDay = programDayNumber(pos.playedCount, pos.playedToday);

  return {
    items,
    focusDomains,
    durationSec: budget.durationSec,
    budgetSource: budget.source,
    programDay,
    inCoreProgram: inCoreProgram(programDay),
    why: explainComposition(items, programDay, budget.durationSec),
    recovery: ritual.snapshot,
    recalibration: ritual.recalibration,
    softReturn: snap.ritual.active
  };
}
