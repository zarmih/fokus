/**
 * Shared «объяснение плана на сегодня» — one story for Today / Program / Coach.
 * Pure view-model: no DOM, no storage. Composes retention + continuity + adaptive why.
 */
import { domainLabel } from './labels';
import { L, getLocale } from './i18n';
import {
  assessRetention,
  bandLabel,
  describeProgramRetention,
  nudgeCopyEn,
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
  nextExerciseId?: string;
  nextDomain?: string;
  rerolled?: boolean;
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
  /** Coach quiet tip to render alongside the plan explanation. */
  quietTip: string | null;
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
  programPhase?: string;
  fatigueOrChurn?: boolean;
  primaryGoal?: string;
  quietTip?: string | null;
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

  function nudgeTitle(nudge: any, domain?: string | null): string | null {
    if (!nudge) return null;
    if (getLocale() === 'en') return nudgeCopyEn(nudge, domain).title;
    return nudge.title;
  }

  function nudgeBody(nudge: any, domain?: string | null): string | null {
    if (!nudge) return null;
    if (getLocale() === 'en') return nudgeCopyEn(nudge, domain).body;
    return nudge.body;
  }

  let phaseClause = '';
  if (getLocale() === 'en') {
    if (input.programPhase === 'orient') {
      phaseClause = ' (familiar short block)';
    } else if (input.programPhase === 'balance') {
      phaseClause = ' (accent on growth areas)';
    } else if (input.programPhase === 'focus') {
      const gl = input.primaryGoal ? domainLabel(input.primaryGoal) : 'goal';
      phaseClause = ` (focus on ${gl})`;
    } else if (input.programPhase === 'sustain' && input.fatigueOrChurn) {
      phaseClause = ' (shorter due to fatigue)';
    }
  } else {
    if (input.programPhase === 'orient') {
      phaseClause = ' (знакомый короткий блок)';
    } else if (input.programPhase === 'balance') {
      phaseClause = ' (акцент на слабые области)';
    } else if (input.programPhase === 'focus') {
      const gl = input.primaryGoal ? domainLabel(input.primaryGoal) : 'цель';
      phaseClause = ` (фокус на ${gl})`;
    } else if (input.programPhase === 'sustain' && input.fatigueOrChurn) {
      phaseClause = ' (короче из-за усталости)';
    }
  }

  const baseWhy = composeExerciseWhy({
    focusNames,
    focusDomain,
    items: planItems,
    softReturn: continuity.ritual.active,
    band: retention.band,
    gapDays: retention.gapDays
  });
  const exerciseWhy = phaseClause ? `${baseWhy} ${phaseClause}` : baseWhy;

  if (!calibrated) {
    return {
      title: L('Настроить сложность', 'Set difficulty'),
      body: L(
        'Пройдите калибровку (около 90 секунд), чтобы Fokus узнал вашу стартовую скорость. Это защитит от слишком сложных или скучных блоков.',
        'Take a 90-second calibration so Fokus can learn your baseline pace. This prevents sessions from feeling too hard or too slow.'
      ),
      whyExercises: L('Сначала короткая сверка уровня — затем персональный план.', 'First a quick level check — then your personal plan.'),
      nextAction: L('Пройти калибровку', 'Start calibration'),
      tone: 'start',
      rhythmLine: null,
      band: null,
      rhythm: null,
      softenCta: false,
      durationSec: null,
      focusDomain: null,
      recoveryPath: false,
      aria: L('Нужна калибровка перед персональным планом.', 'Calibration needed before your personal plan.'),
      source: 'calibration',
      programRetention,
      quietTip: input.quietTip ?? null
    };
  }

  if (playedToday) {
    const nudge = retention.primaryNudge;
    const restLike =
      nudge &&
      (nudge.kind === 'rest' ||
        nudge.kind === 'praise_return' ||
        nudge.kind === 'praise_consistency');
    const title = restLike ? (nudgeTitle(nudge, retention.neglectedDomain) || L('На сегодня достаточно', 'Enough for today')) : L('На сегодня достаточно', 'Enough for today');
    const body = restLike
      ? (nudgeBody(nudge, retention.neglectedDomain) || L('Мозгу нужно время на консолидацию памяти. Завтра Fokus соберёт новую сессию без гонки за объёмом.', 'The brain needs time to consolidate memory. Tomorrow Fokus will assemble a new session without chasing volume.'))
      : L('Мозгу нужно время на консолидацию памяти. Завтра Fokus соберёт новую сессию без гонки за объёмом.', 'The brain needs time to consolidate memory. Tomorrow Fokus will assemble a new session without chasing volume.');
    return {
      title,
      body,
      whyExercises: exerciseWhy || L('План дня выполнен — отдых тоже часть тренировки.', 'Today’s plan is complete — rest is also part of training.'),
      nextAction: L('До завтра', 'See you tomorrow'),
      tone: restLike && nudge!.kind !== 'rest' ? 'habit' : 'habit',
      rhythmLine: programRetention.rhythmLine,
      band: retention.band,
      rhythm: retention.rhythm,
      softenCta: false,
      durationSec: null,
      focusDomain,
      recoveryPath: false,
      aria: `${L('План выполнен', 'Plan completed')}. ${body}`,
      source: 'done',
      programRetention,
      quietTip: input.quietTip ?? null
    };
  }

  if (continuity.ritual.active) {
    const title = nudgeTitle(retention.primaryNudge, retention.neglectedDomain) || L('Мягкое возвращение', 'Easy return');
    const body =
      nudgeBody(retention.primaryNudge, retention.neglectedDomain) ||
      L('Пауза позади. Короткий знакомый блок без наверстывания — чтобы снова войти в ритм.', 'The break is behind you. A short, familiar block without catching up — just to get back into rhythm.');
    return {
      title,
      body,
      whyExercises: exerciseWhy,
      nextAction: L('Мягкий старт', 'Gentle start'),
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
      programRetention,
      quietTip: input.quietTip ?? null
    };
  }

  const severe =
    retention.band === 'at_risk' ||
    retention.band === 'critical' ||
    retention.gapDays >= 2 ||
    !!focusDomain;

  if (severe && retention.confidence >= 24 && programRetention.coachOverride) {
    const title = nudgeTitle(retention.primaryNudge, retention.neglectedDomain) || L('План дня', 'Today’s plan');
    return {
      title,
      body: programRetention.coachOverride,
      whyExercises: exerciseWhy,
      nextAction: programRetention.softenCta ? L('Короткий блок', 'Short block') : L('Начать тренировку', 'Start workout'),
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
      programRetention,
      quietTip: input.quietTip ?? null
    };
  }

  if (inFirstWeek) {
    const fw =
      (weekRitual && describeFirstWeekContinuity(weekRitual, focusDomains)) ||
      null;
    if (fw || weekRitualCopy) {
      const title = fw?.title || L('Первая неделя', 'First week');
      const body = fw?.body || weekRitualCopy || '';
      const why = fw?.whyExercises || exerciseWhy;
      const nextAction = fw?.nextAction || L('Идём по плану', 'On track');
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
        programRetention,
        quietTip: input.quietTip ?? null
      };
    }
  }

  if (recoveryHint) {
    return {
      title: L('Сегодня легче', 'Lighter today'),
      body: recoveryHint,
      whyExercises: exerciseWhy,
      nextAction: L('Лёгкий блок', 'Light block'),
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
      programRetention,
      quietTip: input.quietTip ?? null
    };
  }

  if (adaptiveWhy) {
    const title = nudgeTitle(retention.primaryNudge, retention.neglectedDomain) || L('Тренировка дня', 'Workout of the day');
    return {
      title,
      body: adaptiveWhy,
      whyExercises: exerciseWhy || adaptiveWhy,
      nextAction: L('Начать тренировку', 'Start workout'),
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
      programRetention,
      quietTip: input.quietTip ?? null
    };
  }

  const defaultBody =
    focusNames.length > 0
      ? L(
          `План построен по вашей истории. Акцент на: ${focusNames.join(' и ')}.`,
          `Plan built from your history. Focus on: ${focusNames.join(' and ')}.`
        )
      : programRetention.body;

  const defaultTitle = nudgeTitle(retention.primaryNudge, retention.neglectedDomain) || L('Честный подход', 'Honest approach');

  return {
    title: defaultTitle,
    body: defaultBody,
    whyExercises: exerciseWhy || defaultBody,
    nextAction: programRetention.softenCta ? L('Короткий блок', 'Short block') : L('Начать тренировку', 'Start workout'),
    tone: focusDomain ? 'focus' : 'science',
    rhythmLine: programRetention.rhythmLine,
    band: retention.band,
    rhythm: retention.rhythm,
    softenCta: programRetention.softenCta,
    durationSec: programRetention.durationSec,
    focusDomain,
    recoveryPath: !!focusDomain || retention.gapDays >= 2,
    aria: `${defaultBody} ${L(`Ритм ${retention.rhythm} · ${bandLabel(retention.band)}.`, `Rhythm ${retention.rhythm} · ${bandLabel(retention.band)}.`)}`,
    source: 'default',
    programRetention,
    quietTip: input.quietTip ?? null
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
  if (getLocale() === 'en') {
    if (params.softReturn) {
      return 'A short familiar mix — for an easy transition back into rhythm without catching up.';
    }
    if (params.focusDomain) {
      const name = domainLabel(params.focusDomain);
      return `Starting with "${name}": restoring balance to an area without recent load.`;
    }
    if (params.gapDays >= 2 || params.band === 'at_risk' || params.band === 'critical') {
      return 'Slots tailored for your return: shorter and calmer than the usual pace.';
    }
    if (params.items.length > 0 && params.focusNames.length > 0) {
      return `Today's plan: ${params.focusNames.join(' + ')} — an adaptive mix for balanced development.`;
    }
    if (params.focusNames.length > 0) {
      return `Today's focus: ${params.focusNames.join(' and ')}.`;
    }
    return 'Balanced training block: maintaining tone and familiar volume.';
  }
  if (params.softReturn) {
    return 'Короткий знакомый набор — для лёгкого включения в ритм без наверстывания.';
  }
  if (params.focusDomain) {
    const name = domainLabel(params.focusDomain);
    return `В начале блока — «${name}»: возвращаем баланс в давно не нагружавшуюся зону.`;
  }
  if (params.gapDays >= 2 || params.band === 'at_risk' || params.band === 'critical') {
    return 'Слоты подобраны под возвращение: тренировка короче и спокойнее обычного ритма.';
  }
  if (params.items.length > 0 && params.focusNames.length > 0) {
    return `Сегодня в плане: ${params.focusNames.join(' + ')} — адаптивный микс для равномерного развития.`;
  }
  if (params.focusNames.length > 0) {
    return `Акцент дня: ${params.focusNames.join(' и ')}.`;
  }
  return 'Сбалансированный тренировочный блок: поддержание тонуса и привычный объём.';
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
                reason: item.reason && /возвращ|коротк|мягк|ритм|якорь|закреп|этап|рубеж/i.test(item.reason)
                  ? item.reason
                  : 'Плавное возвращение в ритм'
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
        first.reason && /возвращ|коротк|мягк|ритм|якорь|закреп|этап|рубеж/i.test(first.reason)
          ? first.reason
          : 'Плавное возвращение в ритм'
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
  programPhase?: string;
  fatigueOrChurn?: boolean;
  primaryGoal?: string;
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
    weekRitual: params.weekRitual,
    programPhase: params.programPhase,
    fatigueOrChurn: params.fatigueOrChurn,
    primaryGoal: params.primaryGoal
  });
  return { retention, explanation };
}


/** Prefer shared nextAction so first-week / soft-return CTAs stay in one voice. */
export function ctaLabelFromPlan(
  exp: Pick<TodayPlanExplanation, 'nextAction' | 'softenCta' | 'source'> | null | undefined,
  fallback = 'Начать тренировку'
): string {
  if (!exp) return fallback;
  if (exp.nextAction && exp.nextAction.trim()) return exp.nextAction;
  if (exp.softenCta) return 'Короткий блок';
  return fallback;
}

export interface EmptyPlanCopy {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  tone: PlanTone;
}

/** Calm empty / no-data states matching explainTodayPlan tone (no FOMO). */
export function emptyPlanCopy(kind: 'no_history' | 'no_plan' | 'offline' | 'search'): EmptyPlanCopy {
  if (kind === 'offline') {
    return {
      kicker: 'Офлайн',
      title: 'Нет подключения',
      body: 'План на устройстве сохранён. Когда сеть вернётся — продолжим без наверстывания.',
      cta: 'Проверить сеть',
      tone: 'recovery'
    };
  }
  if (kind === 'no_plan') {
    return {
      kicker: 'Отдых',
      title: 'На сегодня всё',
      body: 'Сейчас нет подходящего набора блоков. Это не штраф — можно вернуться к короткому ритуалу позже.',
      cta: 'К плану дня',
      tone: 'habit'
    };
  }
  if (kind === 'search') {
    return {
      kicker: 'Каталог',
      title: 'Ничего не найдено',
      body: 'По запросу нет упражнений. Сбросьте поиск или откройте другой раздел — знакомые блоки никуда не делись.',
      cta: 'Сбросить поиск',
      tone: 'science'
    };
  }
  return {
    kicker: 'Статистика',
    title: 'Пока нет истории',
    body: 'После первой тренировки здесь появится честная картина ритма — без приблизительных баллов.',
    cta: 'К плану дня',
    tone: 'start'
  };
}

export function rerollTodayPlanSlot(items: TodayPlanItem[], slotIndex: number): { items: TodayPlanItem[]; applied: boolean } {
  if (slotIndex < 0 || slotIndex >= items.length) return { items, applied: false };
  const item = items[slotIndex];
  if (item.rerolled || !item.nextExerciseId) return { items, applied: false };

  // Calculate pre-reroll domain max count
  const domainCounts: Record<string, number> = {};
  for (const it of items) {
    if (it.domain) domainCounts[it.domain] = (domainCounts[it.domain] || 0) + 1;
  }
  const maxDomainCount = Math.max(0, ...Object.values(domainCounts));

  // Check if swapping would raise max domain count
  if (item.nextDomain) {
    const tempCounts: Record<string, number> = {};
    for (let i = 0; i < items.length; i++) {
      if (i === slotIndex) tempCounts[item.nextDomain] = (tempCounts[item.nextDomain] || 0) + 1;
      else if (items[i].domain) tempCounts[items[i].domain!] = (tempCounts[items[i].domain!] || 0) + 1;
    }
    const tempMax = Math.max(0, ...Object.values(tempCounts));
    if (tempMax > maxDomainCount) {
      return { items, applied: false }; // Refuses swap that raises max domain count
    }
  }

  const newItems = [...items];
  newItems[slotIndex] = {
    ...item,
    exerciseId: item.nextExerciseId,
    domain: item.nextDomain || item.domain,
    reason: item.reason + ' (альтернативный вариант)',
    nextExerciseId: undefined,
    nextDomain: undefined,
    rerolled: true
  };

  return { items: newItems, applied: true };
}

export function applySlotSnooze(items: TodayPlanItem[], snoozedExerciseId: string | null): { items: TodayPlanItem[]; applied: boolean } {
  if (!snoozedExerciseId) return { items, applied: false };
  const targetIndex = items.findIndex((it) => it.exerciseId === snoozedExerciseId);
  if (targetIndex === -1) return { items, applied: false };
  if (items.length <= 1) return { items, applied: false };

  const newItems = items.filter((_, idx) => idx !== targetIndex);
  return { items: newItems, applied: true };
}
