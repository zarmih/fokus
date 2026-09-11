import type { DaySummary, DomainIndex } from './types';
import { computeFokusIndex } from './fokus-index';
import { DOMAIN_ORDER, domainLabel } from './labels';

export const HISTORY_WINDOWS = [14, 30] as const;
export type HistoryWindow = (typeof HISTORY_WINDOWS)[number];
export const MILESTONE_DAYS = [7, 14, 30] as const;
export type MilestoneDays = (typeof MILESTONE_DAYS)[number];

export interface IndexDay {
  date: string;
  played: boolean;
  skipped: boolean;
  streak: number;
  fokusIndex: number | null;
  byDomain: Record<string, number | null>;
  personalBest: boolean;
}

export interface SparkPoint {
  date: string;
  value: number | null;
  t: number;
  y: number | null;
  personalBest: boolean;
}

export interface SparklineModel {
  window: HistoryWindow;
  points: SparkPoint[];
  min: number | null;
  max: number | null;
  first: number | null;
  last: number | null;
  delta: number | null;
  deltaLabel: string;
  personalBestIndex: number | null;
}

export interface DomainBreakdown {
  id: string;
  current: number;
  ready: boolean;
  windowDelta: number | null;
  first: number | null;
  last: number | null;
  spark: number[];
}

export interface Adherence {
  window: HistoryWindow;
  playedDays: number;
  missedDays: number;
  forgivenSkips: number;
  currentStreak: number;
  longestStreak: number;
  adherencePct: number;
  comeback: boolean;
  gapDays: number;
}

export interface Milestone {
  days: MilestoneDays;
  reached: boolean;
  reachedAt: string | null;
  current: number;
}

export interface PersonalBest {
  value: number;
  date: string;
  isLatest: boolean;
}

export interface CoachTip {
  kind: 'domain' | 'adherence' | 'comeback' | 'streak' | 'milestone' | 'best' | 'science';
  title: string;
  body: string;
  domainId?: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
}

export interface CoachIntel {
  asOf: string;
  window: HistoryWindow;
  ready: boolean;
  days: IndexDay[];
  sparkline: SparklineModel;
  domains: DomainBreakdown[];
  adherence: Adherence;
  milestones: Milestone[];
  personalBest: PersonalBest | null;
  tips: CoachTip[];
  weakDomainId: string | null;
}

interface DayBucket {
  date: string;
  totalScore: number;
  domainDeltas: Record<string, number>;
  domainValues?: Record<string, number>;
  streak: number;
  skipped: boolean;
  fokusIndex: number | null;
  played: boolean;
}

export function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function enumerateDays(endKey: string, window: number): string[] {
  const end = toDateKey(endKey);
  const days: string[] = [];
  for (let i = window - 1; i >= 0; i--) days.push(addDays(end, -i));
  return days;
}

function dateOrdinal(iso: string): number {
  const key = toDateKey(iso);
  const [y, m, d] = key.split('-').map(Number);
  return y * 400 + m * 32 + d;
}

export function collapseSummaries(summaries: DaySummary[]): DayBucket[] {
  const byDate = new Map<string, DayBucket>();
  const ordered = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of ordered) {
    const date = toDateKey(s.date);
    const prev = byDate.get(date);
    const deltas = { ...(prev?.domainDeltas || {}) };
    for (const [k, v] of Object.entries(s.domainDeltas || {})) {
      deltas[k] = (deltas[k] || 0) + v;
    }
    const fokus =
      typeof s.fokusIndex === 'number' && s.fokusIndex > 0
        ? s.fokusIndex
        : prev?.fokusIndex ?? null;
    const snapshot = s.domainValues && Object.keys(s.domainValues).length > 0
      ? { ...s.domainValues }
      : prev?.domainValues;
    byDate.set(date, {
      date,
      totalScore: (prev?.totalScore || 0) + (s.totalScore || 0),
      domainDeltas: deltas,
      domainValues: snapshot,
      streak: s.streak,
      skipped: !!(prev?.skipped || s.skipped),
      fokusIndex: fokus,
      // A day summary is written after a session — skipped means a forgiven gap, not an empty day.
      played: true
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function cloneValues(src: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(src)) out[k] = src[k];
  return out;
}

function indexFromValues(values: Record<string, number>): number | null {
  const domains: DomainIndex[] = Object.entries(values)
    .filter(([, v]) => v > 0)
    .map(([domain, value]) => ({ domain, value, updatedAt: '' }));
  if (domains.length === 0) return null;
  const fi = computeFokusIndex(domains);
  return fi.value > 0 ? fi.value : null;
}

export function reconstructDomainSnapshots(
  buckets: DayBucket[],
  currentDomains: DomainIndex[]
): DayBucket[] {
  const running: Record<string, number> = {};
  for (const d of currentDomains) {
    if (d.value > 0) running[d.domain] = d.value;
  }

  const played = [...buckets].filter((b) => b.played).reverse();
  for (const b of played) {
    if (b.domainValues && Object.keys(b.domainValues).length > 0) {
      for (const k of Object.keys(running)) delete running[k];
      for (const [k, v] of Object.entries(b.domainValues)) {
        if (v > 0) running[k] = v;
      }
    } else if (Object.keys(running).length > 0) {
      b.domainValues = cloneValues(running);
    }
    for (const [k, dlt] of Object.entries(b.domainDeltas || {})) {
      if (running[k] != null) running[k] = running[k] - dlt;
    }
  }
  return buckets;
}

function windowDeltaLabel(delta: number | null, window: HistoryWindow): string {
  if (delta === null) return 'мало данных';
  if (Math.abs(delta) <= 8) return `на уровне ${window} дней`;
  if (delta > 0) return `+${delta} за ${window} дней`;
  return `${delta} за ${window} дней`;
}

export function buildSparkline(days: IndexDay[], window: HistoryWindow): SparklineModel {
  const numbered = days
    .map((d, i) => ({ i, v: d.fokusIndex }))
    .filter((x): x is { i: number; v: number } => x.v != null && x.v > 0);
  const min = numbered.length ? Math.min(...numbered.map((x) => x.v)) : null;
  const max = numbered.length ? Math.max(...numbered.map((x) => x.v)) : null;
  const first = numbered.length ? numbered[0].v : null;
  const last = numbered.length ? numbered[numbered.length - 1].v : null;
  const delta = first != null && last != null ? last - first : null;
  const n = Math.max(1, days.length - 1);

  let pbIndex: number | null = null;
  if (max != null) {
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].fokusIndex === max && days[i].personalBest) {
        pbIndex = i;
        break;
      }
    }
  }

  const points: SparkPoint[] = days.map((d, i) => {
    let y: number | null = null;
    if (d.fokusIndex != null && min != null && max != null) {
      y = max === min ? 0.5 : 1 - (d.fokusIndex - min) / (max - min);
    }
    return {
      date: d.date,
      value: d.fokusIndex,
      t: n === 0 ? 0 : i / n,
      y,
      personalBest: d.personalBest
    };
  });

  return {
    window,
    points,
    min,
    max,
    first,
    last,
    delta,
    deltaLabel: windowDeltaLabel(delta, window),
    personalBestIndex: pbIndex
  };
}

function longestStreakIn(days: IndexDay[]): number {
  return days.reduce((m, d) => (d.played ? Math.max(m, d.streak) : m), 0);
}

function currentStreakIn(days: IndexDay[], asOf: string): number {
  const today = toDateKey(asOf);
  const yesterday = addDays(today, -1);
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].played) continue;
    if (days[i].date === today || days[i].date === yesterday) return days[i].streak;
    return 0;
  }
  return 0;
}

export function detectComeback(
  days: IndexDay[],
  asOf: string
): { comeback: boolean; gapDays: number } {
  const today = toDateKey(asOf);
  const yesterday = addDays(today, -1);
  let last = -1;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].played) {
      last = i;
      break;
    }
  }
  if (last < 0) return { comeback: false, gapDays: days.length };

  const lastDate = days[last].date;
  if (lastDate !== today && lastDate !== yesterday) {
    return { comeback: false, gapDays: days.length - 1 - last };
  }

  let i = last;
  let hole = 0;
  while (i >= 0) {
    if (days[i].played) {
      hole = 0;
      i--;
      continue;
    }
    if (i > 0 && days[i - 1].played && hole === 0) {
      hole = 1;
      i--;
      continue;
    }
    break;
  }

  let gap = 0;
  let j = i;
  while (j >= 0 && !days[j].played) {
    gap++;
    j--;
  }
  const hadHistory = j >= 0 && days[j].played;
  return { comeback: hadHistory && gap >= 3, gapDays: gap };
}

export function computeAdherence(days: IndexDay[], window: HistoryWindow, asOf: string): Adherence {
  const playedDays = days.filter((d) => d.played).length;
  const missedDays = days.filter((d) => !d.played).length;
  const forgivenSkips = days.filter((d) => d.skipped).length;
  const { comeback, gapDays } = detectComeback(days, asOf);
  return {
    window,
    playedDays,
    missedDays,
    forgivenSkips,
    currentStreak: currentStreakIn(days, asOf),
    longestStreak: longestStreakIn(days),
    adherencePct: days.length === 0 ? 0 : Math.round((playedDays / days.length) * 100),
    comeback,
    gapDays
  };
}

export function computeMilestones(days: IndexDay[], currentStreak: number): Milestone[] {
  return MILESTONE_DAYS.map((n) => {
    const hit = days.find((d) => d.played && d.streak >= n);
    return {
      days: n,
      reached: currentStreak >= n || !!hit,
      reachedAt: hit ? hit.date : null,
      current: currentStreak
    };
  });
}

export function findPersonalBest(days: IndexDay[]): PersonalBest | null {
  let best: PersonalBest | null = null;
  let lastPlayed: IndexDay | null = null;
  for (const d of days) {
    if (d.played) lastPlayed = d;
    if (d.fokusIndex == null) continue;
    if (!best || d.fokusIndex >= best.value) {
      best = { value: d.fokusIndex, date: d.date, isLatest: false };
    }
  }
  if (!best) return null;
  best.isLatest = !!lastPlayed && lastPlayed.date === best.date;
  return best;
}

const DOMAIN_TIPS: Record<string, string[]> = {
  attention: [
    'Уберите телефон из поля зрения на один рабочий блок — даже молчащий экран делит внимание.',
    'Замечайте момент, когда мысль уходит при чтении, и мягко возвращайте её к строке.'
  ],
  memory: [
    'Держите короткий список в уме, пока не дойдёте до места — без подглядывания в телефон.',
    'Перед сном восстановите день в обратном порядке: это дешёвая тренировка припоминания.'
  ],
  speed: [
    'Перед сложной задачей — две минуты ходьбы. Обработка чуть быстрее, когда тело уже в тонусе.',
    'На рутинном действии поставьте мягкий таймер и уложитесь чуть раньше обычного — без гонки.'
  ],
  flexibility: [
    'Смените порядок утренних дел на один день. Мозгу полезно ломать привычный маршрут.',
    'Когда правило меняется — пауза на вдох, потом действие. Переключение стоит секунды внимания.'
  ],
  logic: [
    'Прежде чем открыть ответ, дайте себе полминуты вывести его сами.',
    'Объясните сложную рабочую мысль человеку не из вашей сферы — одним абзацем.'
  ]
};

export function getWeeklyDomainTips(domainId: string): string[] {
  return DOMAIN_TIPS[domainId] || [
    'Регулярность важнее интенсивности. Короткие тренировки работают лучше долгих марафонов.',
    'Качественный сон — лучшее, что можно сделать для закрепления навыка. Это не диагноз, а корреляция.'
  ];
}

function pickTip(pool: string[], asOf: string): string {
  if (pool.length === 0) return '';
  return pool[Math.abs(dateOrdinal(asOf)) % pool.length];
}

export function weakDomainsOf(domains: DomainBreakdown[]): DomainBreakdown[] {
  const ready = domains.filter((d) => d.ready);
  if (ready.length === 0) return [];
  return [...ready].sort((a, b) => a.current - b.current);
}

function buildTips(
  intel: Omit<CoachIntel, 'tips'>,
  asOf: string
): CoachTip[] {
  const tips: CoachTip[] = [];
  const { adherence, milestones, personalBest, weakDomainId, sparkline } = intel;
  const weak = intel.domains.find((d) => d.id === weakDomainId);

  if (adherence.comeback) {
    const gap = Math.max(3, adherence.gapDays);
    tips.push({
      kind: 'comeback',
      title: 'С возвращением',
      body: `Пауза в ${gap} ${gap === 1 ? 'день' : gap < 5 ? 'дня' : 'дней'} не обнуляет навык. Короткий блок вернёт ритм — навёрстывать пропущенные дни не нужно.`,
      tone: 'recovery'
    });
  }

  const justHit = milestones.find((m) => m.reached && adherence.currentStreak === m.days);
  if (justHit) {
    tips.push({
      kind: 'milestone',
      title: `${justHit.days} дней подряд`,
      body: 'Регулярность важнее интенсивности: короткая сессия каждый день сильнее редких длинных.',
      tone: 'habit'
    });
  } else if (adherence.currentStreak >= 7 && !adherence.comeback) {
    tips.push({
      kind: 'streak',
      title: `${adherence.currentStreak} дней подряд`,
      body: 'Серия на месте. Fokus уже умеет прощать один пропуск — не разменивайте ритм на марафон.',
      tone: 'habit'
    });
  }

  if (personalBest && personalBest.isLatest) {
    tips.push({
      kind: 'best',
      title: 'Личный рекорд Fokus Index',
      body: `${personalBest.value} — лучшая оценка за ${sparkline.window} дней. Форма плавает день ото дня: рекорд это отметка, не цель.`,
      tone: 'science'
    });
  }

  if (weak) {
    const spread = intel.domains.filter((d) => d.ready).reduce((m, d) => Math.max(m, d.current), 0) - weak.current;
    const concrete = pickTip(getWeeklyDomainTips(weak.id), asOf);
    const lead =
      spread >= 40
        ? `«${domainLabel(weak.id)}» пока слабее остальных.`
        : `Самый тихий домен сейчас — «${domainLabel(weak.id)}».`;
    tips.push({
      kind: 'domain',
      title: `Зона роста · ${domainLabel(weak.id)}`,
      body: `${lead} ${concrete}`,
      domainId: weak.id,
      tone: 'focus'
    });
  }

  if (adherence.adherencePct < 50 && adherence.playedDays > 0 && !adherence.comeback) {
    tips.push({
      kind: 'adherence',
      title: 'Ритм важнее серии',
      body: `${adherence.playedDays} из ${adherence.window} дней. Пять минут сегодня закрепят привычку сильнее, чем час раз в неделю.`,
      tone: 'recovery'
    });
  } else if (adherence.playedDays >= 5 && adherence.window === 14) {
    tips.push({
      kind: 'adherence',
      title: 'Привычка держится',
      body: `${adherence.playedDays} тренировок за ${adherence.window} дней. Когнитивные навыки растут от регулярности, не от марафонов.`,
      tone: 'habit'
    });
  } else if (adherence.playedDays >= 10 && adherence.window === 30) {
    tips.push({
      kind: 'adherence',
      title: 'Привычка держится',
      body: `${adherence.playedDays} тренировок за 30 дней. Перенос в жизнь скромный — зато привычка внимания остаётся.`,
      tone: 'habit'
    });
  }

  if (adherence.forgivenSkips > 0 && adherence.currentStreak > 0 && tips.every((t) => t.kind !== 'comeback')) {
    tips.push({
      kind: 'adherence',
      title: 'Пропуск уже учтён',
      body: 'Один пропущенный день Fokus прощает, серия остаётся. Сегодняшний короткий блок важнее вчерашнего долга.',
      tone: 'recovery'
    });
  }

  if (tips.length === 0 && intel.ready) {
    tips.push({
      kind: 'science',
      title: 'Короткий ритуал',
      body: 'Тренируем конкретные задачи. Перенос в жизнь скромный — зато привычка внимания остаётся.',
      tone: 'science'
    });
  }

  const domain = tips.filter((t) => t.kind === 'domain');
  const rest = tips.filter((t) => t.kind !== 'domain');
  return [...rest.slice(0, 2), ...domain.slice(0, 1)].slice(0, 3);
}

export function buildCoachIntel(input: {
  summaries: DaySummary[];
  domains: DomainIndex[];
  window?: HistoryWindow;
  asOf?: string;
}): CoachIntel {
  const window: HistoryWindow = input.window === 30 ? 30 : 14;
  const asOf = input.asOf || new Date().toISOString();
  const asOfKey = toDateKey(asOf);
  const calendar = enumerateDays(asOfKey, window);
  const buckets = reconstructDomainSnapshots(collapseSummaries(input.summaries), input.domains);
  const byDate = new Map(buckets.map((b) => [b.date, b]));

  let lastKnown: Record<string, number> = {};
  const days: IndexDay[] = calendar.map((date) => {
    const b = byDate.get(date);
    if (b?.domainValues && Object.keys(b.domainValues).length > 0) {
      lastKnown = b.domainValues;
    }
    const byDomain: Record<string, number | null> = {};
    for (const id of DOMAIN_ORDER) {
      const snap = b?.domainValues?.[id] ?? lastKnown[id];
      byDomain[id] = typeof snap === 'number' && snap > 0 ? snap : null;
    }
    let fokus = b?.fokusIndex ?? null;
    if (fokus == null && b?.played && b.domainValues) {
      fokus = indexFromValues(b.domainValues);
    }
    return {
      date,
      played: !!b?.played,
      skipped: !!b?.skipped,
      streak: b?.streak || 0,
      fokusIndex: b?.played ? fokus : null,
      byDomain,
      personalBest: false
    };
  });

  const pb = findPersonalBest(days);
  if (pb) {
    for (const d of days) {
      if (d.date === pb.date && d.fokusIndex === pb.value) d.personalBest = true;
    }
  }

  const sparkline = buildSparkline(days, window);

  const domains: DomainBreakdown[] = DOMAIN_ORDER.map((id) => {
    const live = input.domains.find((d) => d.domain === id);
    const series = days
      .map((d) => d.byDomain[id])
      .filter((v): v is number => v != null && v > 0);
    const first = series.length ? series[0] : null;
    const last = series.length ? series[series.length - 1] : null;
    const current = live && live.value > 0 ? live.value : last || 0;
    return {
      id,
      current,
      ready: current > 0,
      windowDelta: first != null && last != null ? Math.round(last - first) : null,
      first,
      last,
      spark: series
    };
  });

  const ranked = weakDomainsOf(domains);
  const weakest = ranked[0] || null;
  const weakDomainId = weakest ? weakest.id : null;

  const adherence = computeAdherence(days, window, asOf);
  const milestones = computeMilestones(days, adherence.currentStreak);
  const ready = adherence.playedDays > 0;

  const intel: Omit<CoachIntel, 'tips'> = {
    asOf: asOfKey,
    window,
    ready,
    days,
    sparkline,
    domains,
    adherence,
    milestones,
    personalBest: pb,
    weakDomainId: ready ? weakDomainId : null
  };

  return { ...intel, tips: ready ? buildTips(intel, asOf) : [] };
}
