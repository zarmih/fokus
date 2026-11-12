/**
 * Analytics methodology v2 (docs/core-program/analytics-methodology.md).
 *
 * Three different questions, three different numbers — never mixed in the UI:
 *  - exercise result: what happened in this block (SessionItem);
 *  - personal trend: did *this* exercise change under comparable conditions (`exerciseTrend`);
 *  - data sufficiency: are there enough recent observations to judge anything (`assessDataSufficiency`).
 * No confidence percentages. No claims about transfer outside the app.
 */
import type { Session, SessionItem } from '../types';

export const ANALYTICS_METHODOLOGY_VERSION = 2;
/** Date methodology 2 shipped; earlier persisted values are method 1. */
export const METHODOLOGY_2_SINCE = '2026-11-12';

export type MetricId = 'exerciseResult' | 'personalTrend' | 'dataSufficiency' | 'fokusIndex';

export const METRIC_COPY: Record<MetricId, { title: string; measures: string; cannotConclude: string }> = {
  exerciseResult: {
    title: 'Результат упражнения',
    measures: 'Точность и время ответа в этом блоке на этой сложности.',
    cannotConclude: 'Один блок — одна выборка: его нельзя сравнивать с другими упражнениями, уровнями или людьми.'
  },
  personalTrend: {
    title: 'Личная динамика',
    measures: 'Изменились ли ваши последние результаты в этом же упражнении при похожей сложности по сравнению с прежними.',
    cannotConclude: 'Это не рост «памяти» или «внимания» вообще и не изменения вне приложения: возможны привыкание к задаче, сон, время суток.'
  },
  dataSufficiency: {
    title: 'Полнота данных',
    measures: 'Сколько свежих наблюдений есть: блоки за 28 дней, охваченные области, давность последней тренировки.',
    cannotConclude: 'Это про количество данных, а не про точность или правильность какого-либо показателя.'
  },
  fokusIndex: {
    title: 'Fokus Index',
    measures: 'Сводное число по областям, в которых вы тренировались, на основе ваших упражнений.',
    cannotConclude: 'Изменение индекса может отражать смену упражнений и уровней; это не психометрический тест и не прогноз за пределами приложения.'
  }
};

export type SufficiencyLevel = 'none' | 'low' | 'partial' | 'enough';

export interface DataSufficiency {
  level: SufficiencyLevel;
  label: string;
  blocks28d: number;
  domainsCovered: number;
  daysSinceLast: number | null;
  /** Short facts line: «12 блоков за 28 дней · 3 из 5 областей · последний 1 дн. назад». */
  facts: string;
}

export const SUFFICIENCY_LABEL: Record<SufficiencyLevel, string> = {
  none: 'Данных пока нет',
  low: 'Мало данных: выводы рано',
  partial: 'Данных частично: только предварительные выводы',
  enough: 'Данных достаточно для сравнения с собой'
};

const DAY_MS = 86_400_000;
const DOMAINS = 5;

export function sufficiencyAtLeast(level: SufficiencyLevel, min: SufficiencyLevel): boolean {
  const order: SufficiencyLevel[] = ['none', 'low', 'partial', 'enough'];
  return order.indexOf(level) >= order.indexOf(min);
}

function isCountableItem(it: SessionItem): boolean {
  return (it.rounds == null || it.rounds >= 1) && Number.isFinite(it.accuracy);
}

export function assessDataSufficiency(params: {
  sessions: Session[];
  domainOf: (exerciseId: string) => string | undefined;
  nowMs?: number;
}): DataSufficiency {
  const now = params.nowMs ?? Date.now();
  const since = now - 28 * DAY_MS;
  let blocks = 0;
  let lastMs: number | null = null;
  const perDomain = new Map<string, number>();
  for (const s of params.sessions) {
    const t = Date.parse(s.startedAt);
    if (!Number.isFinite(t) || t > now) continue;
    for (const it of s.items || []) {
      if (!isCountableItem(it)) continue;
      if (lastMs == null || t > lastMs) lastMs = t;
      if (t < since) continue;
      blocks++;
      const d = params.domainOf(it.exerciseId);
      if (d) perDomain.set(d, (perDomain.get(d) || 0) + 1);
    }
  }
  const domainsCovered = [...perDomain.values()].filter((n) => n >= 3).length;
  const daysSinceLast = lastMs == null ? null : Math.floor((now - lastMs) / DAY_MS);

  let level: SufficiencyLevel;
  if (blocks === 0) level = 'none';
  else if (domainsCovered >= DOMAINS && blocks >= 25 && daysSinceLast != null && daysSinceLast <= 7) level = 'enough';
  else if (domainsCovered >= 3 && blocks >= 10 && daysSinceLast != null && daysSinceLast <= 14) level = 'partial';
  else level = 'low';

  const last = daysSinceLast == null ? '' : daysSinceLast === 0 ? ' · последний сегодня' : ` · последний ${daysSinceLast} дн. назад`;
  return {
    level,
    label: SUFFICIENCY_LABEL[level],
    blocks28d: blocks,
    domainsCovered,
    daysSinceLast,
    facts: `${blocks} ${plural(blocks, 'блок', 'блока', 'блоков')} за 28 дней · ${domainsCovered} из ${DOMAINS} областей${last}`
  };
}

export type TrendVerdict = 'better' | 'worse' | 'stable' | 'insufficient';

export interface ExerciseTrend {
  exerciseId: string;
  /** Mode of the compared blocks (the mode of the latest block). */
  mode: 'standard' | 'accessible';
  verdict: TrendVerdict;
  observations: number;
  /** How many more comparable blocks are needed (insufficient only). */
  needMore: number;
  accuracyBefore?: number;
  accuracyNow?: number;
  rtBeforeMs?: number;
  rtNowMs?: number;
  label: string;
}

export const TREND_LABEL: Record<TrendVerdict, string> = {
  better: 'Лучше прежнего',
  worse: 'Ниже прежнего',
  stable: 'В пределах обычного разброса',
  insufficient: 'Пока мало сопоставимых блоков'
};

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function mad(xs: number[]): number {
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
}

const MIN_OBS = 6;
const WINDOW = 5;
const MIN_WINDOW = 3;
const RT_THRESHOLD = 0.1;
const ACC_FLOOR = 0.05;
const ACC_TOLERANCE = 0.03;

/** Personal trend for one exercise under comparable conditions (§2 of the methodology). */
export function exerciseTrend(params: { sessions: Session[]; exerciseId: string; nowMs?: number }): ExerciseTrend {
  const now = params.nowMs ?? Date.now();
  const since = now - 56 * DAY_MS;
  const obs: { t: number; it: SessionItem }[] = [];
  for (const s of params.sessions) {
    if (s.mode === 'calibration' || s.mode === 'recalibration') continue;
    const t = Date.parse(s.startedAt);
    if (!Number.isFinite(t) || t < since || t > now) continue;
    for (const it of s.items || []) {
      if (it.exerciseId !== params.exerciseId) continue;
      if (it.rounds != null && it.rounds < 3) continue;
      if (!Number.isFinite(it.accuracy)) continue;
      obs.push({ t, it });
    }
  }
  obs.sort((a, b) => a.t - b.t);
  const last = obs[obs.length - 1];
  const mode = last?.it.mode ?? 'standard';
  const level = last ? Number(last.it.difficultyBefore ?? last.it.level) : 0;
  const comparable = obs.filter(
    (o) => (o.it.mode ?? 'standard') === mode && Math.abs(Number(o.it.difficultyBefore ?? o.it.level) - level) <= 1
  );

  const base = { exerciseId: params.exerciseId, mode: mode as 'standard' | 'accessible', observations: comparable.length };
  if (comparable.length < MIN_OBS) {
    return { ...base, verdict: 'insufficient', needMore: MIN_OBS - comparable.length, label: TREND_LABEL.insufficient };
  }
  const recent = comparable.slice(-WINDOW);
  const prev = comparable.slice(0, comparable.length - recent.length).slice(-WINDOW);
  if (prev.length < MIN_WINDOW || recent.length < MIN_WINDOW) {
    return { ...base, verdict: 'insufficient', needMore: MIN_WINDOW - Math.min(prev.length, recent.length), label: TREND_LABEL.insufficient };
  }
  const accNow = median(recent.map((o) => o.it.accuracy));
  const accBefore = median(prev.map((o) => o.it.accuracy));
  const thr = Math.max(ACC_FLOOR, mad(comparable.map((o) => o.it.accuracy)));
  const rtNow = median(recent.map((o) => o.it.avgRtMs));
  const rtBefore = median(prev.map((o) => o.it.avgRtMs));
  const rtChange = rtBefore > 0 && Number.isFinite(rtNow) ? (rtNow - rtBefore) / rtBefore : 0;
  const dAcc = accNow - accBefore;

  let verdict: TrendVerdict = 'stable';
  if ((dAcc > thr && rtChange <= RT_THRESHOLD) || (rtChange < -RT_THRESHOLD && dAcc >= -ACC_TOLERANCE)) verdict = 'better';
  else if ((dAcc < -thr && rtChange >= -RT_THRESHOLD) || (rtChange > RT_THRESHOLD && dAcc <= ACC_TOLERANCE)) verdict = 'worse';

  return {
    ...base,
    verdict,
    needMore: 0,
    accuracyBefore: accBefore,
    accuracyNow: accNow,
    rtBeforeMs: rtBefore,
    rtNowMs: rtNow,
    label: TREND_LABEL[verdict]
  };
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
