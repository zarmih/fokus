import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { domainLabel } from './labels';
import { computeFokusIndex } from './fokus-index';
import { assessRetention, sparkFromRetention } from './retention';
import { buildCoachIntel } from './coach-intel';

export interface CoachSpark {
  title: string;
  body: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
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
    trajectory
  } = params;

  if (!calibrated) {
    return {
      title: 'Настроить сложность',
      body: 'Пройдите калибровку (около 90 секунд), чтобы Fokus узнал вашу стартовую скорость. Это защитит от слишком сложных или скучных блоков.',
      tone: 'start'
    };
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
    const rest = retentionSpark();
    if (rest && rest.tone === 'habit' && /завтра/i.test(rest.body)) {
      return rest;
    }
    return {
      title: 'План выполнен',
      body: 'Навыки растут от регулярности, а не от усталости. Завтра Fokus соберёт новую сессию с учётом сегодняшних данных.',
      tone: 'habit'
    };
  }

  if (skippedYesterday && streak > 0) {
    return {
      title: 'Серия на месте',
      body: 'Один пропуск не ломает ритм. Короткий блок сегодня закрепит привычку надёжнее, чем попытки наверстать всё.',
      tone: 'recovery'
    };
  }

  if (streak === 0 && daySummaries.length > 0) {
    return {
      title: 'Вернуться легче',
      body: 'Не пытайтесь наверстать пропущенное за один раз. Знакомый короткий блок поможет плавно вернуться в ритм.',
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
    title: 'Короткий ритуал',
    body: 'Тренируем конкретные задачи. Привычка мягко возвращать внимание переносится и в рабочие часы.',
    tone: 'science'
  };
}

export { getWeeklyDomainTips } from './coach-intel';
