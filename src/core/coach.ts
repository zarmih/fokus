import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { domainLabel } from './labels';
import { computeFokusIndex } from './fokus-index';
import { assessRetention, sparkFromRetention } from './retention';
import { sparkFromReprobe, type MasteryDecaySnapshot } from './mastery-decay';

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
  /** G21: optional mastery re-probe snapshot. Ignored when empty. */
  reprobe?: MasteryDecaySnapshot | null;
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
    reprobe
  } = params;

  if (!calibrated) {
    return {
      title: 'Сначала настройка',
      body: '90 секунд калибровки — и Fokus подстроит сложность под вас, а не наоборот.',
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
      body: 'Когнитивные навыки растут от регулярности, не от марафонов. Завтра Fokus соберёт новую сессию.',
      tone: 'habit'
    };
  }

  if (skippedYesterday && streak > 0) {
    return {
      title: 'Серия на месте',
      body: 'Один пропуск Fokus уже простил. Пять минут сегодня закрепят привычку сильнее, чем час раз в неделю.',
      tone: 'recovery'
    };
  }

  if (streak === 0 && daySummaries.length > 0) {
    return {
      title: 'Вернуться легче, чем начать',
      body: 'Короткий блок внимания вернёт ритм. Не нужно навёрстывать пропущенные дни.',
      tone: 'recovery'
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
        body: `По прошлым сессиям вы сильнее ${chrono.label}. Сегодня хорошее время для сложного блока.`,
        tone: 'time'
      };
    }
  }

  const fromReprobe = sparkFromReprobe(reprobe);
  if (fromReprobe) return fromReprobe;

  const fi = computeFokusIndex(domains);
  const weakest = [...fi.byDomain].filter((d) => d.ready).sort((a, b) => a.value - b.value)[0];
  const focus = (focusDomains && focusDomains[0]) || (primaryGoal && primaryGoal !== 'balance' ? primaryGoal : weakest?.id);

  if (focus) {
    return {
      title: 'Фокус дня',
      body: `Сегодня упор на «${domainLabel(focus)}». Сложность подстроится по точности — ошибаться нормально.`,
      tone: 'focus'
    };
  }

  if (streak >= 7) {
    return {
      title: `${streak} дней подряд`,
      body: 'Регулярность важнее интенсивности: короткая сессия каждый день сильнее редких длинных.',
      tone: 'habit'
    };
  }

  return {
    title: 'Короткий ритуал',
    body: 'Тренируем конкретные задачи. Перенос в жизнь скромный — зато привычка внимания остаётся.',
    tone: 'science'
  };
}

export { getWeeklyDomainTips } from './coach-intel';
