/**
 * Shared «объяснение плана на сегодня» — one story for Today / Program / Coach.
 * Pure view-model: no DOM, no storage. Composes retention + continuity + adaptive why.
 */
import { domainLabel } from './labels';
import {
  assessRetention,
  bandLabel,
  describeProgramRetention,
  type ChurnBand,
  type ProgramRetentionView,
  type RetentionSnapshot
} from './retention';
import type { ContinuitySnapshot } from './continuity';
import {
  describeFirstWeekContinuity,
  type TodayRitual
} from './onboarding';
import type { DaySummary, DomainIndex, Session } from './types';

export type PlanTone = 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';

export type PlanExplainSource =
  | 'calibration'
  | 'soft_return'
  | 'retention'
  | 'adaptive'
  | 'done'
  | 'first_week'
  | 'default';

export interface TodayPlanItem {
  exerciseId: string;
  reason: string;
  domain?: string;
  slot?: string;
}

export interface CatalogDomainHint {
  id: string;
  domain: string;
}

/** Single shared explanation object for Today hero, Program coach, Coach tip. */
export interface TodayPlanExplanation {
  title: string;
  body: string;
  /** Why these exercises / this mix (one sentence). */
  whyExercises: string;
  /** Short next-step hint for CTA / coach. */
  nextAction: string;
  tone: PlanTone;
  rhythmLine: string | null;
  band: ChurnBand | null;
  rhythm: number | null;
  softenCta: boolean;
  /** Suggested duration override; null = keep caller duration. */
  durationSec: number | null;
  focusDomain: string | null;
  /** Gap / at_risk / neglect recovery path is visible. */
  recoveryPath: boolean;
  aria: string;
  source: PlanExplainSource;
  /** Underlying Program←Retention view when available. */
  programRetention: ProgramRetentionView | null;
}

export interface ExplainTodayPlanInput {
  calibrated: boolean;
  playedToday: boolean;
  continuity: ContinuitySnapshot;
  retention: RetentionSnapshot;
  programRetention?: ProgramRetentionView | null;
  focusDomains?: string[];
  planItems?: TodayPlanItem[];
  /** Adaptive / ritual-targeter why string. */
  adaptiveWhy?: string | null;
  /** Soft gate / recovery hint body. */
  recoveryHint?: string | null;
  weekRitualCopy?: string | null;
  inFirstWeek?: boolean;
  /** Full first-week ritual from getTodayRitual — preferred over copy-only. */
  weekRitual?: TodayRitual | null;
}

/**
 * Build one explanation of today's plan. Callers must pass the same retention
 * snapshot they already computed so Today / Program / Coach stay in sync.
 */
export function explainTodayPlan(input: ExplainTodayPlanInput): TodayPlanExplanation {
  const {
    calibrated,
    playedToday,
    continuity,
    retention,
    focusDomains = [],
    planItems = [],
    adaptiveWhy = null,
    recoveryHint = null,
    weekRitualCopy = null,
    inFirstWeek = false,
    weekRitual = null
  } = input;

  const programRetention =
    input.programRetention ??
    describeProgramRetention(retention, {
      softReturnActive: continuity.ritual.active,
      playedToday
    });

  const focusDomain = programRetention.focusDomain;
  const focusNames = focusDomains.map((d) => domainLabel(d)).filter(Boolean);
  const exerciseWhy = composeExerciseWhy({
    focusNames,
    focusDomain,
    items: planItems,
    softReturn: continuity.ritual.active,
    band: retention.band,
    gapDays: retention.gapDays
  });

  if (!calibrated) {
    return {
      title: 'Настроить сложность',
      body: 'Пройдите калибровку (около 90 секунд), чтобы Fokus узнал вашу стартовую скорость. Это защитит от слишком сложных или скучных блоков.',
      whyExercises: 'Сначала короткая сверка уровня — затем персональный план.',
      nextAction: 'Пройти калибровку',
      tone: 'start',
      rhythmLine: null,
      band: null,
      rhythm: null,
      softenCta: false,
      durationSec: null,
      focusDomain: null,
      recoveryPath: false,
      aria: 'Нужна калибровка перед персональным планом.',
      source: 'calibration',
      programRetention
    };
  }

  if (playedToday) {
    const nudge = retention.primaryNudge;
    const restLike =
      nudge &&
      (nudge.kind === 'rest' ||
        nudge.kind === 'praise_return' ||
        nudge.kind === 'praise_consistency');
    const title = restLike ? nudge!.title : 'На сегодня достаточно';
    const body = restLike
      ? nudge!.body
      : 'Мозгу нужно время на консолидацию памяти. Завтра Fokus соберёт новую сессию без гонки за объёмом.';
    return {
      title,
      body,
      whyExercises: exerciseWhy || 'План дня выполнен — отдых тоже часть тренировки.',
      nextAction: 'До завтра',
      tone: restLike && nudge!.kind !== 'rest' ? 'habit' : 'habit',
      rhythmLine: programRetention.rhythmLine,
      band: retention.band,
      rhythm: retention.rhythm,
      softenCta: false,
      durationSec: null,
      focusDomain,
      recoveryPath: false,
      aria: `План выполнен. ${body}`,
      source: 'done',
      programRetention
    };
  }

  if (continuity.ritual.active) {
    const title = retention.primaryNudge?.title || 'Мягкое возвращение';
    const body =
      retention.primaryNudge?.body ||
      'Пауза позади. Короткий знакомый блок без наверстывания — чтобы снова войти в ритм.';
    return {
      title,
      body,
      whyExercises: exerciseWhy,
      nextAction: 'Мягкий старт',
      tone: 'recovery',
      rhythmLine: programRetention.rhythmLine,
      band: retention.band,
      rhythm: retention.rhythm,
      softenCta: true,
      durationSec: programRetention.durationSec,
      focusDomain,
      recoveryPath: true,
      aria: `${title}. ${body}`,
      source: 'soft_return',
      programRetention
    };
  }

  const severe =
    retention.band === 'at_risk' ||
    retention.band === 'critical' ||
    retention.gapDays >= 2 ||
    !!focusDomain;

  if (severe && retention.confidence >= 24 && programRetention.coachOverride) {
    const title = retention.primaryNudge?.title || 'План дня';
    return {
      title,
      body: programRetention.coachOverride,
      whyExercises: exerciseWhy,
      nextAction: programRetention.softenCta ? 'Короткий блок' : 'Начать тренировку',
      tone: focusDomain ? 'focus' : 'recovery',
      rhythmLine: programRetention.rhythmLine,
      band: retention.band,
      rhythm: retention.rhythm,
      softenCta: programRetention.softenCta,
      durationSec: programRetention.durationSec,
      focusDomain,
      recoveryPath: true,
      aria: programRetention.aria,
      source: 'retention',
      programRetention
    };
  }

  if (inFirstWeek) {
    const fw =
      (weekRitual && describeFirstWeekContinuity(weekRitual)) ||
      null;
    if (fw || weekRitualCopy) {
      const title = fw?.title || 'Первая неделя';
      const body = fw?.body || weekRitualCopy || '';
      const why = fw?.whyExercises || exerciseWhy;
      const nextAction = fw?.nextAction || 'Идём по плану';
      const soften = fw?.softenCta ?? false;
      const tone = fw?.tone || 'start';
      const durationSec = fw?.durationSec ?? null;
      const fwFocus = fw?.focusDomains?.[0] || focusDomain;
      return {
        title,
        body,
        whyExercises: why,
        nextAction,
        tone,
        rhythmLine: programRetention.rhythmLine,
        band: retention.band,
        rhythm: retention.rhythm,
        softenCta: soften,
        durationSec,
        focusDomain: fwFocus,
        recoveryPath: soften,
        aria: `${title}. ${body}`,
        source: 'first_week',
        programRetention
      };
    }
  }

  if (recoveryHint) {
    return {
      title: 'Сегодня легче',
      body: recoveryHint,
      whyExercises: exerciseWhy,
      nextAction: 'Лёгкий блок',
      tone: 'recovery',
      rhythmLine: programRetention.rhythmLine,
      band: retention.band,
      rhythm: retention.rhythm,
      softenCta: true,
      durationSec: programRetention.durationSec,
      focusDomain,
      recoveryPath: true,
      aria: recoveryHint,
      source: 'adaptive',
      programRetention
    };
  }

  if (adaptiveWhy) {
    return {
      title: retention.primaryNudge?.title || 'Тренировка дня',
      body: adaptiveWhy,
      whyExercises: exerciseWhy || adaptiveWhy,
      nextAction: 'Начать тренировку',
      tone: focusDomain ? 'focus' : 'science',
      rhythmLine: programRetention.rhythmLine,
      band: retention.band,
      rhythm: retention.rhythm,
      softenCta: programRetention.softenCta,
      durationSec: programRetention.durationSec,
      focusDomain,
      recoveryPath: !!focusDomain,
      aria: adaptiveWhy,
      source: 'adaptive',
      programRetention
    };
  }

  const defaultBody =
    focusNames.length > 0
      ? `План построен по вашей истории. Акцент на: ${focusNames.join(' и ')}.`
      : programRetention.body;

  return {
    title: retention.primaryNudge?.title || 'Честный подход',
    body: defaultBody,
    whyExercises: exerciseWhy || defaultBody,
    nextAction: programRetention.softenCta ? 'Короткий блок' : 'Начать тренировку',
    tone: focusDomain ? 'focus' : 'science',
    rhythmLine: programRetention.rhythmLine,
    band: retention.band,
    rhythm: retention.rhythm,
    softenCta: programRetention.softenCta,
    durationSec: programRetention.durationSec,
    focusDomain,
    recoveryPath: !!focusDomain || retention.gapDays >= 2,
    aria: `${defaultBody} Ритм ${retention.rhythm} · ${bandLabel(retention.band)}.`,
    source: 'default',
    programRetention
  };
}

function composeExerciseWhy(params: {
  focusNames: string[];
  focusDomain: string | null;
  items: TodayPlanItem[];
  softReturn: boolean;
  band: ChurnBand;
  gapDays: number;
}): string {
  if (params.softReturn) {
    return 'Короткий знакомый набор — мягкий вход без наверстывания пропусков.';
  }
  if (params.focusDomain) {
    const name = domainLabel(params.focusDomain);
    return `В начале блока — «${name}»: зона давно без нагрузки, план возвращает баланс.`;
  }
  if (params.gapDays >= 2 || params.band === 'at_risk' || params.band === 'critical') {
    return 'Слоты подобраны под возвращение: короче и спокойнее обычного ритма.';
  }
  if (params.items.length > 0 && params.focusNames.length > 0) {
    return `Сегодня в плане: ${params.focusNames.join(' + ')} — по вашей истории и отстающим зонам.`;
  }
  if (params.focusNames.length > 0) {
    return `Акцент дня: ${params.focusNames.join(' и ')}.`;
  }
  return 'Сбалансированный ритуал: слабая область, свежесть и привычный объём.';
}

/**
 * Retention → ritual ordering.
 * When gap / at_risk / neglect, prioritize recovery path in slot order.
 * No-op when soft-return already owns the plan or there is nothing to reorder.
 */
export function applyRetentionRitualOrder(
  plan: { focusDomains: string[]; items: TodayPlanItem[] },
  opts: {
    focusDomain: string | null;
    band: ChurnBand;
    gapDays: number;
    softReturnActive: boolean;
    catalog?: CatalogDomainHint[];
  }
): { focusDomains: string[]; items: TodayPlanItem[]; applied: boolean } {
  if (opts.softReturnActive || !plan.items.length) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false };
  }

  const needsRecovery =
    !!opts.focusDomain ||
    opts.band === 'at_risk' ||
    opts.band === 'critical' ||
    opts.gapDays >= 2;

  if (!needsRecovery) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false };
  }

  const domainOf = (exerciseId: string, itemDomain?: string): string | null => {
    if (itemDomain) return itemDomain;
    const hit = opts.catalog?.find((c) => c.id === exerciseId);
    return hit?.domain ?? null;
  };

  const focus = opts.focusDomain;
  let items = [...plan.items];
  let applied = false;

  if (focus) {
    const priority: TodayPlanItem[] = [];
    const rest: TodayPlanItem[] = [];
    for (const item of items) {
      const dom = domainOf(item.exerciseId, item.domain);
      if (dom === focus) {
        priority.push({
          ...item,
          reason:
            item.reason && /баланс|давн|отста|акцент|памят|вниман|скорост|гибк|логик/i.test(item.reason)
              ? item.reason
              : `Возврат баланса — «${domainLabel(focus)}»`
        });
      } else {
        rest.push(item);
      }
    }
    if (priority.length > 0 && (items[0] ? domainOf(items[0].exerciseId, items[0].domain) !== focus : true)) {
      items = [...priority, ...rest];
      applied = true;
    } else if (priority.length > 0) {
      items = [...priority, ...rest];
      applied = priority[0].reason !== plan.items[0]?.reason;
    }

    const focusDomains = [
      focus,
      ...plan.focusDomains.filter((d) => d !== focus)
    ];

    if (opts.gapDays >= 2 || opts.band === 'at_risk' || opts.band === 'critical') {
      // Keep order but annotate first non-focus slot as short recovery when useful
      if (!applied && items.length > 0) {
        items = items.map((item, i) =>
          i === 0
            ? {
                ...item,
                reason: item.reason || 'Короткий блок возвращения в ритм'
              }
            : item
        );
        applied = true;
      }
    }

    return { focusDomains, items, applied: applied || focusDomains[0] === focus };
  }

  // Gap / at_risk without a specific neglected domain: keep items, mark recovery path on first
  if (items.length > 0) {
    const first = items[0];
    const annotated = {
      ...first,
      reason:
        first.reason && /возвращ|коротк|мягк|ритм/i.test(first.reason)
          ? first.reason
          : 'Короткий блок возвращения в ритм'
    };
    if (annotated.reason !== first.reason) {
      items = [annotated, ...items.slice(1)];
      return { focusDomains: plan.focusDomains, items, applied: true };
    }
  }

  return { focusDomains: plan.focusDomains, items, applied: false };
}

/** Convenience: assess + describe + explain from raw store slices. */
export function buildTodayPlanExplanation(params: {
  calibrated: boolean;
  playedToday: boolean;
  streak: number;
  skippedYesterday?: boolean;
  continuity: ContinuitySnapshot;
  daySummaries: DaySummary[];
  sessions: Session[];
  domains: DomainIndex[];
  sessionLengthSec?: number;
  shieldCharges?: number;
  focusDomains?: string[];
  planItems?: TodayPlanItem[];
  adaptiveWhy?: string | null;
  recoveryHint?: string | null;
  weekRitualCopy?: string | null;
  inFirstWeek?: boolean;
  weekRitual?: TodayRitual | null;
  now?: Date;
}): {
  retention: RetentionSnapshot;
  explanation: TodayPlanExplanation;
} {
  const retention = assessRetention({
    daySummaries: params.daySummaries,
    sessions: params.sessions,
    domains: params.domains,
    playedToday: params.playedToday,
    streak: params.streak,
    skippedYesterday: params.skippedYesterday,
    sessionLengthSec: params.sessionLengthSec,
    shieldCharges: params.shieldCharges,
    now: params.now
  });
  const programRetention = describeProgramRetention(retention, {
    profileLengthSec: params.sessionLengthSec,
    softReturnActive: params.continuity.ritual.active,
    playedToday: params.playedToday
  });
  const explanation = explainTodayPlan({
    calibrated: params.calibrated,
    playedToday: params.playedToday,
    continuity: params.continuity,
    retention,
    programRetention,
    focusDomains: params.focusDomains,
    planItems: params.planItems,
    adaptiveWhy: params.adaptiveWhy,
    recoveryHint: params.recoveryHint,
    weekRitualCopy: params.weekRitualCopy,
    inFirstWeek: params.inFirstWeek,
    weekRitual: params.weekRitual
  });
  return { retention, explanation };
}
