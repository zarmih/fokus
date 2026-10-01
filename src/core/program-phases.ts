/**
 * Program phases (2–4 week spans) with clear goals — not only «день N».
 * Pure view-model; week/day remain secondary labels.
 */

import { domainLabel } from './labels';

export type ProgramPhaseId = 'orient' | 'balance' | 'focus' | 'sustain';

export interface ProgramPhase {
  id: ProgramPhaseId;
  /** 1-based phase index for UI. */
  index: number;
  /** Inclusive week range (program weekIndex). */
  weekFrom: number;
  weekTo: number;
  /** Short title shown as primary Program heading. */
  title: string;
  /** Clear goal — what this phase is for. */
  goal: string;
  /** Supporting body under the goal. */
  body: string;
  /** Optional CTA hint for Program hero. */
  nextHint: string;
}

/** Four phases, each ~2 weeks (total ~8 weeks), then sustain forever. */
export const PROGRAM_PHASES: ProgramPhase[] = [
  {
    id: 'orient',
    index: 1,
    weekFrom: 1,
    weekTo: 2,
    title: 'Знакомство и ритм',
    goal: 'Привыкнуть к короткому ритуалу и собрать первые данные без гонки.',
    body: 'Две недели спокойного входа: формат сессии, комфортная длина, честная серия. Навёрстывать пропуски не нужно.',
    nextHint: 'Держите привычный блок — точность плана вырастет сама'
  },
  {
    id: 'balance',
    index: 2,
    weekFrom: 3,
    weekTo: 4,
    title: 'Баланс областей',
    goal: 'Выровнять нагрузку по пяти областям и убрать перекосы.',
    body: 'Недели 3–4: Fokus подтягивает зоны, которые редко попадали в ритуал, и держит знакомые упражнения рядом.',
    nextHint: 'Смотрите на акцент дня — это баланс, не «прокачка IQ»'
  },
  {
    id: 'focus',
    index: 3,
    weekFrom: 5,
    weekTo: 6,
    title: 'Фокус цели',
    goal: 'Усилить выбранную цель онбординга, не забывая остальные области.',
    body: 'Недели 5–6: больше слотов под вашу цель (память, внимание и т.д.), но ритуал остаётся коротким и честным.',
    nextHint: 'Цель недели важнее «дня N» — двигайтесь в её сторону'
  },
  {
    id: 'sustain',
    index: 4,
    weekFrom: 7,
    weekTo: 999,
    title: 'Удержание формы',
    goal: 'Сохранять ритм и форму без марафонов и чувства вины.',
    body: 'С 7-й недели программа циклична: мягкий возврат после пауз, короткие блоки при усталости, акцент на регулярности.',
    nextHint: 'Регулярность важнее объёма — достаточно одного спокойного ритуала'
  }
];

export function phaseForWeek(weekIndex: number): ProgramPhase {
  const w = Math.max(1, Math.floor(weekIndex || 1));
  for (const p of PROGRAM_PHASES) {
    if (w >= p.weekFrom && w <= p.weekTo) return p;
  }
  return PROGRAM_PHASES[PROGRAM_PHASES.length - 1];
}

export interface ProgramPhaseView {
  phase: ProgramPhase;
  weekIndex: number;
  dayInWeek: number;
  /** Primary subtitle: phase title · week range. */
  subtitle: string;
  /** Secondary: week/day without owning the story. */
  weekDayLine: string;
  /** Goal line for Program card. */
  goalLine: string;
  /** Coach-friendly rationale when adaptive copy is weak. */
  phaseCoach: string;
  /** Progress within phase weeks (0…1). */
  progressInPhase: number;
  aria: string;
}

export function describeProgramPhase(params: {
  weekIndex: number;
  dayInWeek: number;
  primaryGoal?: string;
  isSparse?: boolean;
  calibrated?: boolean;
}): ProgramPhaseView {
  const weekIndex = Math.max(1, params.weekIndex || 1);
  const dayInWeek = Math.min(7, Math.max(1, params.dayInWeek || 1));
  const phase = phaseForWeek(weekIndex);
  const span = Math.max(1, Math.min(phase.weekTo, 8) - phase.weekFrom + 1);
  const weekInPhase = Math.min(span, Math.max(1, weekIndex - phase.weekFrom + 1));
  const progressInPhase = Math.min(1, (weekInPhase - 1 + (dayInWeek - 1) / 7) / span);

  let goalLine = phase.goal;
  if (phase.id === 'focus' && params.primaryGoal && params.primaryGoal !== 'balance') {
    goalLine = `Усилить «${domainLabel(params.primaryGoal)}» в коротком ритуале, сохраняя баланс остальных областей.`;
  }
  if (!params.calibrated) {
    goalLine = 'Сначала калибровка — три коротких блока, чтобы Fokus понял стартовый уровень.';
  } else if (params.isSparse && phase.id === 'orient') {
    goalLine = 'Собрать достаточно данных для персонального плана — без спешки и без «дня N» как единственной метрики.';
  }

  const weekLabel =
    phase.weekTo >= 100
      ? `с ${phase.weekFrom}-й недели`
      : `недели ${phase.weekFrom}–${phase.weekTo}`;

  return {
    phase,
    weekIndex,
    dayInWeek,
    subtitle: `Фаза ${phase.index} · ${phase.title}`,
    weekDayLine: `Неделя ${weekIndex} · день ${dayInWeek} · ${weekLabel}`,
    goalLine,
    phaseCoach: `${phase.title}: ${goalLine}`,
    progressInPhase,
    aria: `Фаза ${phase.index} из 4, ${phase.title}. Цель: ${goalLine}. ${weekLabel}, сейчас неделя ${weekIndex}, день ${dayInWeek}.`
  };
}
