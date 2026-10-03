import type { DomainIndex, DaySummary, ExerciseState } from './types';
import { DOMAIN_ORDER } from './labels';
import { catalog } from '../exercises/catalog';

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
  confidence: number;
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

export function computeFokusIndex(domains: DomainIndex[], exStates: ExerciseState[] = []): FokusIndex {
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
  
  if (coverage === 0) {
    return {
      value: 0, confidence: 0, coverage: 0, byDomain, trend: 0, depth,
      phase: 'empty', balance: 'unknown',
      explain: {
        state: 'Недостаточно данных',
        action: 'Сбор статистики начнётся после первой сессии. Ваш Fokus Index формируется исключительно на основе реальных фактов: точности и времени реакций, а не абстрактных ожиданий.',
        balanceStr: ''
      }
    };
  }

  const mean = ready.reduce((sum, d) => sum + d.value, 0) / ready.length;
  const value = Math.round(mean);
  const coverageRatio = coverage / DOMAIN_ORDER.length;
  const explorationFactor = Math.min(1, explored / 10);
  const confidence = Math.round((coverageRatio * 0.6 + explorationFactor * 0.4) * 100);
  const trend = ready.reduce((sum, d) => sum + d.trend, 0) / ready.length;

  let phase: FokusPhase = 'empty';
  let stateStr = '';
  let actionStr = '';
  let balance: DomainBalance = 'unknown';
  let balanceStr = '';

  if (coverage < 3) {
    phase = 'calibrating';
    stateStr = `Открыто ${coverage} из 5 областей.`;
    actionStr = `Требуется ещё ${3 - coverage} ${3 - coverage === 1 ? 'область' : (3 - coverage === 2 ? 'области' : 'областей')} для оценки. Fokus накапливает статистику, чтобы показатель отражал вашу фактическую форму, а не случайную догадку.`;
  } else {
    phase = 'established';
    stateStr = `Уверенность ${confidence}%.`;
    actionStr = 'Индекс — честный снимок вашей формы на сегодня. Мы показываем только те тренды, которые подтверждены данными сессий.';
    
    const vals = ready.map(d => d.value);
    const maxDiff = Math.max(...vals) - Math.min(...vals);
    if (maxDiff <= 150) {
      balance = 'balanced';
      balanceStr = 'Сбалансированный профиль (развитие областей идёт гармонично).';
    } else if (maxDiff > 350) {
      balance = 'asymmetric';
      balanceStr = 'Асимметричный профиль (присутствует выраженный фокус или дисбаланс, рекомендуется уделить внимание слабым зонам).';
    } else {
      balance = 'specialized';
      balanceStr = 'Специализированный профиль (есть явные сильные стороны и зоны для подтягивания).';
    }
  }

  return {
    value, confidence, coverage, byDomain, trend, depth,
    phase, balance,
    explain: { state: stateStr, action: actionStr, balanceStr }
  };
}

export function previousFokusIndex(summaries: DaySummary[], excludeTodayIso?: string, daysAgo: number = 1): number | null {
  const today = excludeTodayIso?.slice(0, 10);
  let targetDate = today;
  if (today && daysAgo > 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo + 1);
    targetDate = d.toISOString().slice(0, 10);
  }

  const withIndex = summaries
    .filter((s) => typeof s.fokusIndex === 'number' && s.fokusIndex > 0)
    .filter((s) => !today || s.date < (targetDate || today));
  if (withIndex.length === 0) return null;
  return withIndex[withIndex.length - 1].fokusIndex as number;
}

export function indexDelta(current: number, previous: number | null, daysAgo: number = 1): { delta: number; label: string } {
  if (previous === null || previous === 0) {
    return { delta: 0, label: 'сбор данных — история формируется' };
  }
  const delta = current - previous;
  const labelSuffix = daysAgo === 7 ? 'к прошлой неделе' : 'ко вчерашнему дню';
  if (Math.abs(delta) <= 8) return { delta, label: `естественный фон (${labelSuffix})` };
  const sign = delta > 0 ? '+' : '';
  return { delta, label: `${sign}${delta} ${labelSuffix}` };
}
