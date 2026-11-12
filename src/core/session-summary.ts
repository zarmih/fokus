/**
 * The short end-of-session summary: one observation and one next step (core program, step 4).
 * The observation follows methodology v2: a trend is named only from comparable blocks
 * (`exerciseTrend`); otherwise we report a fact about this session, not a conclusion.
 */
import type { Session } from './types';
import { exerciseTrend, type ExerciseTrend } from './analytics/methodology';

export interface SessionSummary {
  observation: string;
  nextStep: string;
  kind: 'better' | 'worse' | 'almost-trend' | 'best-block' | 'empty';
}

export function summarizeSession(params: {
  session: Pick<Session, 'id' | 'items'>;
  sessions: Session[];
  nameOf: (exerciseId: string) => string;
  nextDurationSec: number;
  calibration?: boolean;
  nowMs?: number;
}): SessionSummary {
  const minutes = Math.max(1, Math.round(params.nextDurationSec / 60));
  const nextStep = params.calibration
    ? `Следующий шаг: первая тренировка на экране «Сегодня», около ${minutes} мин.`
    : `Следующий шаг: завтра «Тренировка на сегодня», около ${minutes} мин.`;
  const items = (params.session.items || []).filter((i) => Number.isFinite(i.accuracy));
  if (items.length === 0) {
    return { observation: 'В этой сессии нет засчитанных блоков.', nextStep, kind: 'empty' };
  }
  if (!params.calibration) {
    const ids = [...new Set(items.map((i) => i.exerciseId))];
    const trends: ExerciseTrend[] = ids.map((id) => exerciseTrend({ sessions: params.sessions, exerciseId: id, nowMs: params.nowMs }));
    const better = trends.find((t) => t.verdict === 'better');
    if (better) {
      return { observation: `«${params.nameOf(better.exerciseId)}»: последние результаты лучше прежних при похожей сложности.`, nextStep, kind: 'better' };
    }
    const worse = trends.find((t) => t.verdict === 'worse');
    if (worse) {
      return { observation: `«${params.nameOf(worse.exerciseId)}»: последние результаты ниже обычных. Так бывает от усталости или сна — это не вывод о способностях.`, nextStep, kind: 'worse' };
    }
    const almost = trends.filter((t) => t.verdict === 'insufficient' && t.needMore > 0 && t.needMore <= 3).sort((a, b) => a.needMore - b.needMore)[0];
    if (almost) {
      const n = almost.needMore;
      return { observation: `«${params.nameOf(almost.exerciseId)}»: ещё ${n} ${n === 1 ? 'блок' : 'блока'} — и появится личная динамика по этому упражнению.`, nextStep, kind: 'almost-trend' };
    }
  }
  const best = [...items].sort((a, b) => b.accuracy - a.accuracy)[0];
  return { observation: `Точнее всего сегодня было «${params.nameOf(best.exerciseId)}»: ${Math.round(best.accuracy * 100)}% верных ответов.`, nextStep, kind: 'best-block' };
}
