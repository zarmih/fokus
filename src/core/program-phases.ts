/**
 * Program phases (2–4 week spans) with clear goals — not only «день N».
 * Pure view-model; week/day remain secondary labels.
 */

import { domainLabel } from './labels';
import { L } from './i18n';

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
    get title() { return L('Знакомство и ритм', 'Introduction and rhythm'); },
    get goal() { return L('Привыкнуть к короткому ритуалу и собрать первые данные без гонки.', 'Get used to the short ritual and gather initial data without rushing.'); },
    get body() { return L('Две недели спокойного входа: формат сессии, комфортная длина, честная серия. Навёрстывать пропуски не нужно.', 'Two weeks of gentle onboarding: session format, comfortable length, honest streak. No need to catch up on missed days.'); },
    get nextHint() { return L('Держите привычный блок — точность плана вырастет сама', 'Keep your familiar routine — the plan precision will grow on its own'); }
  },
  {
    id: 'balance',
    index: 2,
    weekFrom: 3,
    weekTo: 4,
    get title() { return L('Баланс областей', 'Domain balance'); },
    get goal() { return L('Выровнять нагрузку по пяти областям и убрать перекосы.', 'Balance the load across five domains and eliminate imbalances.'); },
    get body() { return L('Недели 3–4: Fokus подтягивает зоны, которые редко попадали в ритуал, и держит знакомые упражнения рядом.', 'Weeks 3–4: Fokus lifts areas rarely included in the ritual, while keeping familiar exercises close.'); },
    get nextHint() { return L('Смотрите на акцент дня — это баланс, не «прокачка IQ»', 'Focus on today\'s emphasis — this is about balance, not an "IQ boost"'); }
  },
  {
    id: 'focus',
    index: 3,
    weekFrom: 5,
    weekTo: 6,
    get title() { return L('Фокус цели', 'Goal focus'); },
    get goal() { return L('Усилить выбранную цель онбординга, не забывая остальные области.', 'Strengthen your onboarding goal without neglecting other domains.'); },
    get body() { return L('Недели 5–6: больше слотов под вашу цель (память, внимание и т.д.), но ритуал остаётся коротким и честным.', 'Weeks 5–6: more slots for your goal (memory, attention, etc.), while keeping the ritual short and honest.'); },
    get nextHint() { return L('Цель недели важнее «дня N» — двигайтесь в её сторону', 'The weekly goal matters more than "Day N" — keep moving toward it'); }
  },
  {
    id: 'sustain',
    index: 4,
    weekFrom: 7,
    weekTo: 999,
    get title() { return L('Удержание формы', 'Maintaining form'); },
    get goal() { return L('Сохранять ритм и форму без марафонов и чувства вины.', 'Maintain rhythm and fitness without marathons or guilt.'); },
    get body() { return L('С 7-й недели программа циклична: мягкий возврат после пауз, короткие блоки при усталости, акцент на регулярности.', 'From week 7 onwards, the program cycles: gentle returns after breaks, shorter sessions when fatigued, focus on regularity.'); },
    get nextHint() { return L('Регулярность важнее объёма — достаточно одного спокойного ритуала', 'Regularity is more important than volume — one calm ritual is enough'); }
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
  /** Narrative description of the current phase progression. */
  phaseNarrative: string;
  /** Preview of the upcoming milestone day. */
  milestonePreview: string | null;
  /** Habit carried forward to the next phase (last 2 days). */
  carryLine: string | null;
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
    goalLine = L(
      `Усилить «${domainLabel(params.primaryGoal)}» в коротком ритуале, сохраняя баланс остальных областей.`,
      `Strengthen "${domainLabel(params.primaryGoal)}" in a short ritual, maintaining balance across other domains.`
    );
  }
  if (!params.calibrated) {
    goalLine = L(
      'Сначала калибровка — три коротких блока, чтобы Fokus понял стартовый уровень.',
      'Calibration first — three short blocks so Fokus can determine your baseline level.'
    );
  } else if (params.isSparse && phase.id === 'orient') {
    goalLine = L(
      'Собрать достаточно данных для персонального плана — без спешки и без «дня N» как единственной метрики.',
      'Gather enough data for a personalized plan — without rushing and without "Day N" as the only metric.'
    );
  }

  const weekLabel =
    phase.weekTo >= 100
      ? L(`с ${phase.weekFrom}-й недели`, `from week ${phase.weekFrom}`)
      : L(`недели ${phase.weekFrom}–${phase.weekTo}`, `weeks ${phase.weekFrom}–${phase.weekTo}`);

  let phaseNarrative = phase.body;
  if (!params.calibrated) {
    phaseNarrative = L(
      'Первая калибровка важна: пройдите три сессии, чтобы мы подобрали стартовый уровень сложности для каждого навыка.',
      'Initial calibration is important: complete three sessions so we can pick a starting difficulty for each skill.'
    );
  } else if (params.isSparse && phase.id === 'orient') {
    phaseNarrative = L(
      'Мы бережно собираем данные о ваших способностях. Решайте без спешки — система сама адаптируется к вашему ритму.',
      'We carefully collect data on your abilities. Take your time — the system adapts to your rhythm.'
    );
  } else if (phase.id === 'focus' && params.primaryGoal && params.primaryGoal !== 'balance') {
    phaseNarrative = L(
      `В этой фазе мы смещаем акцент на область «${domainLabel(params.primaryGoal)}», сохраняя комфортную длительность тренировок.`,
      `In this phase, we shift focus toward "${domainLabel(params.primaryGoal)}", keeping session duration comfortable.`
    );
  }

  let milestonePreview: string | null = null;
  const isMilestoneWeek = isPhaseMilestoneDay(weekIndex, 7);
  if (isMilestoneWeek) {
    const exId = milestoneExerciseId(weekIndex);
    const mName = exId === 'tide-gate' ? L('Прилив у ворот', 'Tide Gate') : L('Якорная пара', 'Anchor Pair');
    if (dayInWeek >= 4 && dayInWeek < 7) {
      const daysLeft = 7 - dayInWeek;
      const daysWord = daysLeft === 1 ? L('день', 'day') : L('дня', 'days');
      milestonePreview = L(
        `Через ${daysLeft} ${daysWord} рубеж фазы: ${mName}`,
        `Phase milestone in ${daysLeft} ${daysWord}: ${mName}`
      );
    } else if (dayInWeek === 7) {
      milestonePreview = L(
        `Сегодня рубеж фазы: ${mName}`,
        `Phase milestone today: ${mName}`
      );
    }
  }

  let carryLine: string | null = null;
  const isLastTwoDays = weekIndex === phase.weekTo && dayInWeek >= 6;
  if (isLastTwoDays) {
    switch (phase.id) {
      case 'orient':
        carryLine = L('В следующую фазу уходит ритм, не счётчик.', 'Rhythm carries into the next phase, not the counter.');
        break;
      case 'balance':
        carryLine = L('В следующую фазу уходит баланс, а не долг за пропуски.', 'Balance carries into the next phase, not a debt for missed days.');
        break;
      case 'focus':
        carryLine = L('Дальше с вами идёт способность к фокусу, без лишнего напряжения.', 'Focus ability stays with you going forward, without undue strain.');
        break;
      case 'sustain':
        carryLine = L('С вами остаётся регулярность, которая важнее любых марафонов.', 'Regularity stays with you, which is more important than any marathon.');
        break;
    }
  }

  return {
    phase,
    weekIndex,
    dayInWeek,
    subtitle: L(`Фаза ${phase.index} · ${phase.title}`, `Phase ${phase.index} · ${phase.title}`),
    weekDayLine: L(`Неделя ${weekIndex} · день ${dayInWeek} · ${weekLabel}`, `Week ${weekIndex} · day ${dayInWeek} · ${weekLabel}`),
    goalLine,
    phaseCoach: `${phase.title}: ${goalLine}`,
    progressInPhase,
    aria: L(
      `Фаза ${phase.index} из 4, ${phase.title}. Цель: ${goalLine}. ${weekLabel}, сейчас неделя ${weekIndex}, день ${dayInWeek}.`,
      `Phase ${phase.index} of 4, ${phase.title}. Goal: ${goalLine}. ${weekLabel}, currently week ${weekIndex}, day ${dayInWeek}.`
    ),
    phaseNarrative,
    milestonePreview,
    carryLine
  };
}

export const MILESTONE_EXERCISE_IDS = ['tide-gate', 'anchor-pair'] as const;

export function isPhaseMilestoneDay(weekIndex: number, dayInWeek: number): boolean {
  if (dayInWeek !== 7 || weekIndex < 1) return false;
  const phase = phaseForWeek(weekIndex);
  if (phase.weekTo < 100) {
    return weekIndex === phase.weekTo;
  }
  return weekIndex >= 8 && (weekIndex - 8) % 2 === 0;
}

export function milestoneExerciseId(weekIndex: number): 'tide-gate' | 'anchor-pair' {
  const phase = phaseForWeek(weekIndex);
  if (phase.id === 'orient' || phase.id === 'focus') return 'tide-gate';
  if (phase.id === 'balance') return 'anchor-pair';
  const sustainIndex = Math.max(0, Math.floor((weekIndex - 8) / 2));
  return sustainIndex % 2 === 0 ? 'tide-gate' : 'anchor-pair';
}

export function milestoneReason(weekIndex: number): string {
  const exId = milestoneExerciseId(weekIndex);
  const name = exId === 'tide-gate' ? L('Прилив у ворот', 'Tide Gate') : L('Якорная пара', 'Anchor Pair');
  return L(`Веха фазы: ${name}`, `Phase milestone: ${name}`);
}
