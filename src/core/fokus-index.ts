import type { DomainIndex, DaySummary, ExerciseState, Session } from './types';
import { ANALYTICS_METHODOLOGY_VERSION, SUFFICIENCY_LABEL, assessDataSufficiency, sufficiencyAtLeast, type DataSufficiency } from './analytics/methodology';
import { DOMAIN_ORDER } from './labels';
import { catalog } from '../exercises/catalog';
import { addCalendarDays, calendarDayKey, resolveFokusTimeZone } from './streak';
import { L } from './i18n';

/** Civil YYYY-MM-DD in the Fokus product zone (Europe/Moscow, UTC fallback). */
function fokusDayKey(instant: Date | string): string {
  return calendarDayKey(instant, resolveFokusTimeZone().timeZone);
}

export interface DomainSlice {
  id: string;
  value: number;
  ready: boolean;
  trend: number;
}

export type FokusPhase = 'empty' | 'calibrating' | 'established';
export type DomainBalance = 'balanced' | 'specialized' | 'asymmetric' | 'unknown';

export interface FokusIndex {
  value: number;
  /**
   * Methodology v2: how much recent data there is (a category, not a probability).
   * Replaces the v1 heuristic `confidence` percentage.
   */
  dataSufficiency: DataSufficiency;
  methodologyVersion: number;
  coverage: number;
  byDomain: DomainSlice[];
  trend: number;
  depth: {
    explored: number;
    total: number;
    percent: number;
  };
  phase: FokusPhase;
  balance: DomainBalance;
  explain: {
    state: string;
    action: string;
    balanceStr: string;
  };
}

function fallbackSufficiency(coverage: number): DataSufficiency {
  const level = coverage === 0 ? 'none' : 'low';
  return { level, label: SUFFICIENCY_LABEL[level], blocks28d: 0, domainsCovered: coverage, daysSinceLast: null, facts: `${coverage} из 5 областей` };
}

export function computeFokusIndex(
  domains: DomainIndex[],
  exStates: ExerciseState[] = [],
  opts: { sessions?: Session[]; nowMs?: number } = {}
): FokusIndex {
  const byDomain: DomainSlice[] = DOMAIN_ORDER.map((id) => {
    const d = domains.find((x) => x.domain === id);
    const ready = !!(d && d.value > 0);
    return {
      id,
      value: ready ? d!.value : 0,
      ready,
      trend: d?.trend || 0
    };
  });

  const total = catalog.length;
  const playedCount = exStates.filter(s => s.attempts && s.attempts >= 3).length;
  const explored = Math.min(total, playedCount);
  const percent = total > 0 ? Math.round((explored / total) * 100) : 0;
  const depth = { explored, total, percent };

  const ready = byDomain.filter((d) => d.ready);
  const coverage = ready.length;
  
  const domainOf = new Map(catalog.map((c) => [c.manifest.id, c.manifest.domain] as const));
  const dataSufficiency = opts.sessions
    ? assessDataSufficiency({ sessions: opts.sessions, domainOf: (id) => domainOf.get(id), nowMs: opts.nowMs })
    : fallbackSufficiency(coverage);
  const methodologyVersion = ANALYTICS_METHODOLOGY_VERSION;

  if (coverage === 0) {
    return {
      value: 0, dataSufficiency, methodologyVersion, coverage: 0, byDomain, trend: 0, depth,
      phase: 'empty', balance: 'unknown',
      explain: {
        state: L('Недостаточно данных', 'Insufficient data'),
        action: L('Сбор статистики начнётся после первой сессии. Ваш Fokus Index формируется исключительно на основе реальных фактов: точности и времени реакций, а не абстрактных ожиданий.', 'Data collection begins after your first session. Your Fokus Index is formed solely on real facts: accuracy and response times, not abstract expectations.'),
        balanceStr: ''
      }
    };
  }

  const mean = ready.reduce((sum, d) => sum + d.value, 0) / ready.length;
  const value = Math.round(mean);
  const trend = ready.reduce((sum, d) => sum + d.trend, 0) / ready.length;

  let phase: FokusPhase = 'empty';
  let stateStr = '';
  let actionStr = '';
  let balance: DomainBalance = 'unknown';
  let balanceStr = '';

  if (coverage < 3) {
    phase = 'calibrating';
    stateStr = L(`Открыто ${coverage} из 5 областей.`, `${coverage} of 5 domains open.`);
    actionStr = L(`Требуется ещё ${3 - coverage} ${3 - coverage === 1 ? 'область' : (3 - coverage === 2 ? 'области' : 'областей')} для оценки. Fokus накапливает статистику, чтобы показатель отражал вашу фактическую форму, а не случайную догадку.`, `Need ${3 - coverage} more ${3 - coverage === 1 ? 'domain' : 'domains'} for estimation. Fokus gathers data so the metric reflects actual performance rather than guesswork.`);
  } else {
    phase = 'established';
    stateStr = `${dataSufficiency.label}.`;
    actionStr = L('Индекс — сводное число по вашим упражнениям. Его изменение может отражать смену упражнений и уровней; динамику смотрите по каждому упражнению отдельно.', 'The index is a composite number across your exercises. Shifts may reflect changing exercises and levels; see individual exercises for personal trends.');
  }
  // Profile shape only once there is enough data to say anything (methodology v2 §4).
  if (phase === 'established' && sufficiencyAtLeast(dataSufficiency.level, 'partial')) {
    const vals = ready.map(d => d.value);
    const maxDiff = Math.max(...vals) - Math.min(...vals);
    if (maxDiff <= 150) {
      balance = 'balanced';
      balanceStr = L('Сбалансированный профиль: результаты по областям близки.', 'Balanced profile: domain results are close.');
    } else if (maxDiff > 350) {
      balance = 'asymmetric';
      balanceStr = L('Асимметричный профиль: результаты по областям заметно различаются.', 'Asymmetric profile: domain results differ noticeably.');
    } else {
      balance = 'specialized';
      balanceStr = L('Неравномерный профиль: в одних областях результаты выше, чем в других.', 'Uneven profile: higher performance in some domains than others.');
    }
  }

  return {
    value, dataSufficiency, methodologyVersion, coverage, byDomain, trend, depth,
    phase, balance,
    explain: { state: stateStr, action: actionStr, balanceStr }
  };
}

export function previousFokusIndex(summaries: DaySummary[], excludeTodayIso?: string, daysAgo: number = 1): number | null {
  const today = excludeTodayIso ? fokusDayKey(excludeTodayIso) : undefined;
  let targetDate = today;
  if (today && daysAgo > 1) {
    targetDate = addCalendarDays(today, -daysAgo + 1);
  }

  const withIndex = summaries
    .filter((s) => typeof s.fokusIndex === 'number' && s.fokusIndex > 0)
    .filter((s) => !today || s.date < (targetDate || today));
  if (withIndex.length === 0) return null;
  return withIndex[withIndex.length - 1].fokusIndex as number;
}

export function indexDelta(current: number, previous: number | null, daysAgo: number = 1): { delta: number; label: string } {
  if (previous === null || previous === 0) {
    return { delta: 0, label: L('сбор данных — история формируется', 'collecting data — building history') };
  }
  const delta = current - previous;
  const labelSuffix = daysAgo === 7 ? L('к прошлой неделе', 'vs last week') : L('ко вчерашнему дню', 'vs yesterday');
  if (Math.abs(delta) <= 8) return { delta, label: L(`естественный фон (${labelSuffix})`, `normal variation (${labelSuffix})`) };
  const sign = delta > 0 ? '+' : '';
  // Methodology v2: the index mixes exercises and levels, so a change is not by itself "growth".
  return { delta, label: L(`${sign}${delta} ${labelSuffix} · состав упражнений мог отличаться`, `${sign}${delta} ${labelSuffix} · exercise mix may have differed`) };
}

export function personalIndexBand(summaries: { date: string; fokusIndex?: number }[], todayIso: string): { min: number; max: number; days: number; line: string } | null {
  const endStr = fokusDayKey(todayIso);
  const startStr = addCalendarDays(endStr, -6);

  const valid = summaries.filter(s => {
    const d = fokusDayKey(s.date);
    return d >= startStr && d <= endStr && typeof s.fokusIndex === 'number' && isFinite(s.fokusIndex) && s.fokusIndex > 0;
  });

  if (valid.length < 3) return null;

  const vals = valid.map(s => s.fokusIndex as number);
  const min = Math.round(Math.min(...vals));
  const max = Math.round(Math.max(...vals));

  return {
    min,
    max,
    days: valid.length,
    line: L(`Ваш диапазон за 7 дней: ${min}–${max}. Это ваша полоса, не сравнение с другими.`, `Your 7-day range: ${min}–${max}. This is your band, not a comparison to others.`)
  };
}
