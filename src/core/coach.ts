// AM5: Coach intelligence and retention nudges.
import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { domainLabel } from './labels';
import { computeFokusIndex } from './fokus-index';
import { assessRetention, sparkFromRetention } from './retention';
import { buildCoachIntel } from './coach-intel';
import { explainTodayPlan } from './today-plan';
import type { ContinuitySnapshot } from './continuity';
import type { TodayRitual } from './onboarding';
import type { RetentionSnapshot } from './retention';

export function getQuietCoachTip(params: {
  continuity: ContinuitySnapshot;
  retention: RetentionSnapshot;
  programPhase?: string;
  inFirstWeek?: boolean;
  playedToday: boolean;
}): string | null {
  if (params.playedToday) return null;

  const { continuity, retention, programPhase, inFirstWeek } = params;

  if (inFirstWeek) {
    if (continuity.streak.current <= 3) {
      return 'Первые дни мы калибруем базовую сложность. Ошибаться — нормально.';
    }
    return null;
  }

  if (continuity.ritual.active) {
    return 'Паузы защищают от переутомления. Накопленный опыт сохранён, сегодня просто спокойный вход.';
  }

  if (retention.gapDays >= 2 && retention.band !== 'critical') {
    return 'Пропуски — часть длинной дистанции. Навёрстывать ничего не нужно, достаточно одной сессии в вашем темпе.';
  }

  if (programPhase === 'balance' && continuity.streak.current > 3) {
    return 'В фазе баланса мы подтягиваем слабые зоны. Временное снижение точности здесь — сигнал полезной работы.';
  }

  if (programPhase === 'sustain') {
    const fatigueScore = retention.signals.find(s => s.id === 'session_fatigue')?.score || 0;
    if (fatigueScore >= 50) {
      return 'В фазе поддержки можно позволить себе более лёгкий темп, если чувствуете усталость.';
    }
    return 'В фазе поддержки важно просто удерживать плато. Регулярность работает лучше марафонов.';
  }

  if (programPhase === 'focus' && continuity.streak.current >= 4) {
    return 'Прицельная тренировка требует больше ресурса. Если фокус падает, лучше закончить сессию раньше.';
  }

  if (retention.band === 'stable' && continuity.streak.current >= 14 && continuity.streak.current % 5 === 0) {
    return 'Длинная серия даёт запас прочности. Если сегодня нет ресурса на тренировку, один день отдыха её не сломает.';
  }

  return null;
}


export interface CoachSpark {
  title: string;
  body: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
  quietTip?: string | null;
}

function hourBucket(iso: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date(iso).getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

export function analyzeChronotype(sessions: Session[]): {
  bucket: 'morning' | 'afternoon' | 'evening' | null;
  label: string;
  sample: number;
} {
  const buckets: Record<string, { score: number; n: number }> = {
    morning: { score: 0, n: 0 },
    afternoon: { score: 0, n: 0 },
    evening: { score: 0, n: 0 }
  };

  sessions.forEach((s) => {
    const b = hourBucket(s.startedAt);
    if (b === 'night') return;
    const total = s.items.reduce((sum, i) => sum + i.score, 0);
    buckets[b].score += total;
    buckets[b].n += 1;
  });

  const ranked = Object.entries(buckets)
    .filter(([, v]) => v.n >= 2)
    .map(([k, v]) => ({ bucket: k as 'morning' | 'afternoon' | 'evening', avg: v.score / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg);

  if (ranked.length < 2) return { bucket: null, label: '', sample: 0 };

  const labels = { morning: 'утром', afternoon: 'днём', evening: 'вечером' };
  return {
    bucket: ranked[0].bucket,
    label: labels[ranked[0].bucket],
    sample: ranked[0].n
  };
}

export function getDailySpark(params: {
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
  daySummaries: DaySummary[];
  sessions: Session[];
  calibrated: boolean;
  playedToday: boolean;
  streak: number;
  skippedYesterday?: boolean;
  primaryGoal?: string;
  focusDomains?: string[];
  now?: Date;
  /** Optional Phase 3 field — ignored when the program PR is not merged. */
  shieldCharges?: number;
  trajectory?: import('./ability-trajectory').AbilityTrajectory;
  topInsight?: import('./insights').CognitiveInsight;
  /** When provided, Coach tip uses the same today-plan story as Today/Program. */
  continuity?: ContinuitySnapshot;
  adaptiveWhy?: string | null;
  planItems?: Array<{ exerciseId: string; reason: string; domain?: string }>;
  weekRitual?: TodayRitual | null;
}): CoachSpark {
  const {
    domains,
    daySummaries,
    sessions,
    calibrated,
    playedToday,
    streak,
    skippedYesterday,
    primaryGoal,
    focusDomains,
    now,
    shieldCharges,
    trajectory,
    topInsight,
    continuity,
    adaptiveWhy,
    planItems,
    weekRitual
  } = params;

  if (!calibrated) {
    return {
      title: 'Настроить сложность',
      body: 'Пройдите калибровку (около 90 секунд), чтобы Fokus узнал вашу стартовую скорость. Это защитит от слишком сложных или скучных блоков.',
      tone: 'start'
    };
  }

  // Shared Today/Program/Coach story when continuity snapshot is available.
  if (continuity) {
    try {
      const snap = assessRetention({
        daySummaries,
        sessions,
        domains,
        playedToday,
        streak,
        skippedYesterday,
        shieldCharges,
        now
      });
      const exp = explainTodayPlan({
        calibrated: true,
        playedToday,
        continuity,
        retention: snap,
        focusDomains: focusDomains || [],
        planItems: planItems || [],
        adaptiveWhy: adaptiveWhy ?? null,
        inFirstWeek: !!weekRitual?.inFirstWeek,
        weekRitualCopy: weekRitual?.copy || null,
        weekRitual: weekRitual || null
      });
      return { title: exp.title, body: exp.body, tone: exp.tone, quietTip: exp.quietTip };
    } catch {
      /* fall through to legacy paths */
    }
  }

  const retentionSpark = (): CoachSpark | null => {
    try {
      const snap = assessRetention({
        daySummaries,
        sessions,
        domains,
        playedToday,
        streak,
        skippedYesterday,
        shieldCharges,
        now
      });
      return sparkFromRetention(snap);
    } catch {
      return null;
    }
  };

  if (playedToday) {
    const retention = retentionSpark();
    if (retention) {
      const t = retention.title.toLowerCase();
      // Allow specific nudges that apply after a session
      if (t.includes('достаточно') || t.includes('восстановлен') || t.includes('стабильность')) {
        return retention;
      }
    }
    return {
      title: 'На сегодня достаточно',
      body: 'Мозгу нужно время на консолидацию памяти. Завтра Fokus соберёт новую сессию без гонки за объёмом.',
      tone: 'habit'
    };
  }

  if (skippedYesterday && daySummaries.length > 0) {
    return {
      title: 'Ритм на месте',
      body: 'Пропущенный день — это просто отдых, а не провал. Ваша честная серия защищена. Короткий блок сегодня — это всё, что нужно для возвращения.',
      tone: 'recovery'
    };
  }

  if (streak === 0 && daySummaries.length > 0) {
    return {
      title: 'Мягкий вход',
      body: 'Без чувства вины за паузу. Вам не нужно компенсировать пропущенные дни, Fokus предлагает начать с короткой сессии.',
      tone: 'recovery'
    };
  }

  if (daySummaries.length === 0) {
    return {
      title: 'Первый ритуал',
      body: 'Пройдите первую сессию — Fokus начнёт собирать статистику и подстраивать нагрузку под ваш ритм.',
      tone: 'start'
    };
  }

  const fromRetention = retentionSpark();
  if (fromRetention) return fromRetention;

  if (topInsight && topInsight.priority >= 70) {
    let tone: CoachSpark['tone'] = 'science';
    if (topInsight.type === 'improvement' || topInsight.type === 'area_to_focus') tone = 'focus';
    else if (topInsight.type === 'recovery' || topInsight.type === 'plateau') tone = 'recovery';
    else if (topInsight.type === 'consistency' || topInsight.type === 'milestone') tone = 'habit';
    return {
      title: topInsight.title,
      body: topInsight.description,
      tone
    };
  }

  const chrono = analyzeChronotype(sessions);
  if (chrono.bucket && chrono.sample >= 3) {
    const nowBucket = hourBucket((now ?? new Date()).toISOString());
    if (nowBucket === chrono.bucket) {
      return {
        title: 'Ваше сильное окно',
        body: `По прошлым сессиям вы точнее ${chrono.label}. Хорошее время для сложного блока без лишнего напряжения.`,
        tone: 'time'
      };
    }
  }

  const intel = buildCoachIntel({
    summaries: daySummaries,
    domains,
    trajectory,
    asOf: now ? now.toISOString() : new Date().toISOString()
  });

  if (intel.tips.length > 0) {
    const tip = intel.tips[0];
    return {
      title: tip.title,
      body: tip.body,
      tone: tip.tone
    };
  }

  return {
    title: 'Честный подход',
    body: 'Регулярность важнее марафонов. Одна короткая тренировка сегодня принесёт больше пользы, чем час занятий раз в неделю.',
    tone: 'science'
  };
}

export { getWeeklyDomainTips } from './coach-intel';

export interface SessionCheckIn {
  id: 'rushed' | 'short' | 'familiar';
  question: string;
  yes: string;
  no: string;
}

export function sessionCheckIn(session: { id?: string; durationSec?: number; items?: { accuracy?: number; domain?: string }[] } | null): SessionCheckIn | null {
  if (!session || !session.items || session.items.length === 0) {
    return null;
  }

  const items = session.items;
  let totalAcc = 0;
  let hasAcc = false;
  const domainCounts: Record<string, number> = {};

  for (const item of items) {
    if (typeof item.accuracy === 'number') {
      totalAcc += item.accuracy;
      hasAcc = true;
    }
    if (item.domain) {
      domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
    }
  }

  if (hasAcc) {
    const meanAcc = totalAcc / items.length;
    if (meanAcc < 0.55) {
      return {
        id: 'rushed',
        question: 'Было ощущение спешки?',
        yes: 'Да',
        no: 'Нет'
      };
    }
  }

  if (typeof session.durationSec === 'number' && session.durationSec < 45) {
    return {
      id: 'short',
      question: 'Планировали короткую сессию?',
      yes: 'Да',
      no: 'Нет'
    };
  }

  const half = items.length / 2;
  for (const [domain, count] of Object.entries(domainCounts)) {
    if (count > half) {
      return {
        id: 'familiar',
        question: `${domainLabel(domain)} — знакомая нагрузка?`,
        yes: 'Да',
        no: 'Нет'
      };
    }
  }

  return null;
}
