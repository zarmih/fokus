import type { DomainIndex, SkillIndex, ExerciseState, DaySummary, Session } from './types';
import { domainLabel } from './labels';
import { computeFokusIndex } from './fokus-index';
import { t } from './i18n';

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

  const labels = {
    morning: t('chrono.morning'),
    afternoon: t('chrono.afternoon'),
    evening: t('chrono.evening')
  };
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
    focusDomains
  } = params;

  if (!calibrated) {
    return {
      title: t('coach.calibrate.title'),
      body: t('coach.calibrate.body'),
      tone: 'start'
    };
  }

  if (playedToday) {
    return {
      title: t('coach.done.title'),
      body: t('coach.done.body'),
      tone: 'habit'
    };
  }

  if (skippedYesterday && streak > 0) {
    return {
      title: t('coach.streak_ok.title'),
      body: t('coach.streak_ok.body'),
      tone: 'recovery'
    };
  }

  if (streak === 0 && daySummaries.length > 0) {
    return {
      title: t('coach.return.title'),
      body: t('coach.return.body'),
      tone: 'recovery'
    };
  }

  const chrono = analyzeChronotype(sessions);
  const hour = new Date().getHours();
  if (chrono.bucket && chrono.sample >= 3) {
    const nowBucket = hourBucket(new Date().toISOString());
    if (nowBucket === chrono.bucket) {
      return {
        title: t('coach.window.title'),
        body: t('coach.window.body', { when: chrono.label }),
        tone: 'time'
      };
    }
  }

  const fi = computeFokusIndex(domains);
  const weakest = [...fi.byDomain].filter((d) => d.ready).sort((a, b) => a.value - b.value)[0];
  const focus = (focusDomains && focusDomains[0]) || (primaryGoal && primaryGoal !== 'balance' ? primaryGoal : weakest?.id);

  if (focus) {
    return {
      title: t('coach.focus.title'),
      body: t('coach.focus.body', { domain: domainLabel(focus) }),
      tone: 'focus'
    };
  }

  if (streak >= 7) {
    return {
      title: t('coach.streak_n.title', { n: streak }),
      body: t('coach.streak_n.body'),
      tone: 'habit'
    };
  }

  return {
    title: t('coach.ritual.title'),
    body: t('coach.ritual.body'),
    tone: 'science'
  };
}
