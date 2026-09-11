import type {
  CognitiveDomain,
  FirstWeekPlan,
  ProbeSnapshot,
  RitualDay,
  RitualIntensity
} from './types';
import { PROBE_DOMAINS, precisionLabel } from './calibration';

export const FIRST_WEEK_DAYS = 7;

const COMPLEMENT: Record<string, CognitiveDomain[]> = {
  memory: ['attention', 'logic', 'flexibility', 'speed'],
  attention: ['memory', 'speed', 'flexibility', 'logic'],
  speed: ['attention', 'flexibility', 'memory', 'logic'],
  flexibility: ['attention', 'logic', 'memory', 'speed'],
  logic: ['memory', 'attention', 'flexibility', 'speed'],
  balance: ['attention', 'memory', 'flexibility', 'logic', 'speed']
};

const DAY_LABELS = [
  'Знакомство',
  'Ритм',
  'Чуть шире',
  'Лёгкий день',
  'Слабая зона',
  'Сборка',
  'Полный ритуал'
];

export interface TransferTip {
  id: string;
  domain: CognitiveDomain | 'general';
  title: string;
  body: string;
}

/** Modest, original copy. Not a claim of far transfer or IQ change. */
export const TRANSFER_TIPS: TransferTip[] = [
  {
    id: 'memory-list',
    domain: 'memory',
    title: 'Память в быту',
    body: 'Список из пяти пунктов легче удержать, если повторить его вслух один раз. Это ближе к рабочей памяти, чем к «тренировке IQ».'
  },
  {
    id: 'attention-return',
    domain: 'attention',
    title: 'Вернуться, а не «не отвлекаться»',
    body: 'Если уведомление сбило фокус — вернитесь к задаче одним шагом. Упражнения учат возвращаться, а не жить без отвлечений.'
  },
  {
    id: 'speed-when',
    domain: 'speed',
    title: 'Скорость не равна качеству',
    body: 'Быстрее заметить полезно, когда решение уже понятно. В новой задаче спешка чаще мешает, чем помогает.'
  },
  {
    id: 'flex-switch',
    domain: 'flexibility',
    title: 'Смена правила',
    body: 'Переключиться с одного правила на другое — узкий навык. Это не «гибкость характера» и не обещание легче менять привычки.'
  },
  {
    id: 'logic-pattern',
    domain: 'logic',
    title: 'Закономерность рядом',
    body: 'Увидеть правило в коротком ряду помогает в похожих задачах. Не обещаем, что это сделает вас сильнее в шахматах или на работе.'
  },
  {
    id: 'general-honest',
    domain: 'general',
    title: 'Честный перенос',
    body: 'Fokus тренирует конкретные задачи. Перенос на учёбу, работу и быт скромный и неравномерный. Не медицинское изделие.'
  }
];

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function daysBetween(fromDate: string, toDate: string): number {
  const a = Date.parse(`${dateOnly(fromDate)}T00:00:00Z`);
  const b = Date.parse(`${dateOnly(toDate)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function asDomain(raw?: string): CognitiveDomain | null {
  if (!raw) return null;
  return (PROBE_DOMAINS as string[]).includes(raw) ? (raw as CognitiveDomain) : null;
}

export function rampDurations(targetSec: number): number[] {
  const target = Math.max(300, targetSec);
  if (target <= 300) return [300, 300, 300, 300, 300, 300, 300];
  if (target <= 480) return [300, 300, 360, 360, 420, 480, 480];
  return [300, 300, 420, 480, 600, Math.min(720, target), Math.min(720, target)];
}

function intensityFor(durationSec: number, targetSec: number, day: number): RitualIntensity {
  if (day === 4) return 'gentle';
  if (durationSec < targetSec - 60) return 'gentle';
  if (durationSec < targetSec) return 'steady';
  return 'full';
}

function focusForDay(
  day: number,
  primaryGoal: string,
  weakest?: CognitiveDomain | null
): CognitiveDomain[] {
  const goal = asDomain(primaryGoal) || 'attention';
  const extra = COMPLEMENT[primaryGoal] || COMPLEMENT.balance;
  if (day === 1) return [goal];
  if (day === 2) return [goal, extra[0]];
  if (day === 3) return [goal, extra[0], extra[1]];
  if (day === 4) return [goal];
  if (day === 5) return [weakest || extra[0], goal];
  if (day === 6) return [goal, extra[0], extra[2] || extra[1]];
  return ['attention', 'memory', 'flexibility', 'logic', 'speed'];
}

export function weakestProbedDomain(snapshot?: ProbeSnapshot | null): CognitiveDomain | null {
  if (!snapshot) return null;
  const probed = snapshot.domains.filter((d) => d.probed);
  if (probed.length === 0) return null;
  return [...probed].sort((a, b) => a.theta - b.theta)[0].domain;
}

export function buildFirstWeekPlan(input: {
  primaryGoal?: string;
  sessionLengthSec: number;
  startDate: string;
  snapshot?: ProbeSnapshot | null;
}): FirstWeekPlan {
  const primaryGoal = input.primaryGoal || 'balance';
  const durations = rampDurations(input.sessionLengthSec);
  const weak = weakestProbedDomain(input.snapshot);
  const days: RitualDay[] = durations.map((durationSec, i) => {
    const day = i + 1;
    return {
      day,
      durationSec,
      focusDomains: focusForDay(day, primaryGoal, weak),
      intensity: intensityFor(durationSec, Math.max(300, input.sessionLengthSec), day),
      label: DAY_LABELS[i]
    };
  });

  return {
    startDate: dateOnly(input.startDate),
    targetSessionSec: Math.max(300, input.sessionLengthSec),
    primaryGoal,
    skipPolicy: 'one-forgiven',
    days
  };
}

export type WeekSkipState = 'on-track' | 'forgiven' | 'resume' | 'complete' | 'upcoming';

export interface TodayRitual {
  inFirstWeek: boolean;
  day: number | null;
  ritualDay: RitualDay | null;
  skipState: WeekSkipState;
  missedDays: number;
  copy: string;
}

function playedDates(summaries: { date: string }[]): Set<string> {
  return new Set(summaries.map((s) => dateOnly(s.date)));
}

export function countMissedDays(
  startDate: string,
  today: string,
  summaries: { date: string }[]
): number {
  const played = playedDates(summaries);
  const start = dateOnly(startDate);
  const end = dateOnly(today);
  const span = daysBetween(start, end);
  if (span <= 0) return played.has(start) ? 0 : 0;
  let missed = 0;
  for (let i = 0; i < span; i++) {
    const t = Date.parse(`${start}T00:00:00Z`) + i * 86400000;
    const key = new Date(t).toISOString().slice(0, 10);
    if (!played.has(key)) missed += 1;
  }
  return missed;
}

export function skipCopy(state: WeekSkipState): string {
  if (state === 'forgiven') {
    return 'Один пропуск на неделе уже заложен. Сегодня просто короткий ритуал — навёрстывать вчера не нужно.';
  }
  if (state === 'resume') {
    return 'Вернитесь с сегодняшнего дня. Пропущенные дни не копим и не «отрабатываем».';
  }
  if (state === 'complete') {
    return 'Первая неделя позади. Дальше — обычный ритуал в выбранном темпе.';
  }
  if (state === 'on-track') {
    return 'Один пропуск на неделе прощается. Навёрстывать дни не нужно.';
  }
  return 'Первая неделя начнётся после калибровки.';
}

export function getTodayRitual(
  plan: FirstWeekPlan | undefined,
  todayIso: string,
  summaries: { date: string }[] = []
): TodayRitual {
  if (!plan) {
    return {
      inFirstWeek: false,
      day: null,
      ritualDay: null,
      skipState: 'upcoming',
      missedDays: 0,
      copy: skipCopy('upcoming')
    };
  }

  const today = dateOnly(todayIso);
  const offset = daysBetween(plan.startDate, today) + 1;

  if (offset < 1) {
    return {
      inFirstWeek: false,
      day: null,
      ritualDay: null,
      skipState: 'upcoming',
      missedDays: 0,
      copy: skipCopy('upcoming')
    };
  }

  if (offset > FIRST_WEEK_DAYS) {
    return {
      inFirstWeek: false,
      day: null,
      ritualDay: null,
      skipState: 'complete',
      missedDays: 0,
      copy: skipCopy('complete')
    };
  }

  const missedDays = countMissedDays(plan.startDate, today, summaries);
  const skipState: WeekSkipState =
    missedDays <= 0 ? 'on-track' : missedDays === 1 ? 'forgiven' : 'resume';
  const ritualDay = plan.days[offset - 1];

  return {
    inFirstWeek: true,
    day: offset,
    ritualDay,
    skipState,
    missedDays,
    copy: skipCopy(skipState)
  };
}

export function pickTransferTip(input: {
  primaryGoal?: string;
  snapshot?: ProbeSnapshot | null;
  cursor?: number;
}): TransferTip {
  const weak = weakestProbedDomain(input.snapshot);
  const goal = asDomain(input.primaryGoal);
  const domain = weak || goal;
  if (domain) {
    const match = TRANSFER_TIPS.find((t) => t.domain === domain);
    if (match) return match;
  }
  const general = TRANSFER_TIPS.filter((t) => t.domain === 'general');
  const cursor = Math.max(0, input.cursor ?? 0);
  return general[cursor % general.length];
}

export function abilityCaption(snapshot: ProbeSnapshot): string {
  const probed = snapshot.domains.filter((d) => d.probed).length;
  const label = precisionLabel(snapshot.overallPrecision);
  return `${probed} из 5 областей · ${label}. Это не IQ и не сравнение с другими.`;
}

export function firstWeekPreviewLines(plan: FirstWeekPlan): string[] {
  return plan.days.map((d) => {
    const minutes = Math.round(d.durationSec / 60);
    return `День ${d.day} · ${d.label} · ${minutes} мин`;
  });
}
