import { REMINDER_LAST_KEY } from './privacy';
import { storage } from './storage';
import { computeDayStreak, extractPlayedDays, resolveFokusTimeZone, calendarDayKey } from './streak';
import { getWeeklyDomainTips } from './coach-intel';

export { REMINDER_LAST_KEY };
import { assessRetention } from './retention';
import { gentleReturnRitual } from './continuity';

export type ReminderKind = 'daily' | 'soft_return' | 'long_pause' | 'protect' | 'quiet';

export interface ReminderCopy {
  kind: ReminderKind;
  title: string;
  body: string;
  /** Soft tag for SW / Notification — keeps one quiet channel. */
  tag: string;
}

/**
 * Pure reminder copy builder — soft-return aware, no FOMO.
 * Used by maybeNotify and unit tests.
 */
export function buildReminderCopy(params: {
  playedToday: boolean;
  openMisses: number;
  streakStatus: string;
  streakCurrent: number;
  gapDays: number;
  primaryNudgeBody?: string | null;
  primaryNudgeKind?: string | null;
  primaryGoal?: string;
  softReturnActive?: boolean;
  dayOfYear?: number;
}): ReminderCopy | null {
  if (params.playedToday) return null;
  // After a week of silence — stop pinging (respectful quiet).
  if (params.openMisses > 7) return null;
  // Soft cadence: only day 0–2 (open), exactly 3, or 7 — plus soft_return band.
  const misses = params.openMisses;
  const softActive =
    !!params.softReturnActive ||
    params.streakStatus === 'soft_return' ||
    (misses >= 1 && misses <= 3);

  if (misses > 2 && misses !== 3 && misses !== 7 && !softActive) return null;

  if (params.gapDays >= 7 || misses >= 7) {
    return {
      kind: 'long_pause',
      title: 'Fokus · без давления',
      body:
        params.primaryNudgeBody ||
        'Неделя тишины — нормально. Короткий мягкий блок вернёт ритм, когда будете готовы.',
      tag: 'fokus-soft-return'
    };
  }

  if (softActive || params.streakStatus === 'soft_return' || params.streakStatus === 'fresh_start') {
    return {
      kind: 'soft_return',
      title: 'Fokus · мягкий возврат',
      body:
        params.primaryNudgeBody ||
        'Пропуск не ломает прогресс. Один спокойный ритуал — достаточно, чтобы снова включиться.',
      tag: 'fokus-soft-return'
    };
  }

  if (
    params.primaryNudgeKind === 'protect_streak' ||
    (params.streakCurrent > 0 && params.gapDays >= 1 && params.gapDays <= 2)
  ) {
    return {
      kind: 'protect',
      title: 'Fokus · честный ритм',
      body:
        params.primaryNudgeBody ||
        'Короткая сессия сегодня защитит ритм без марафона. Можно и отдохнуть — серия честная.',
      tag: 'fokus-daily'
    };
  }

  if (params.primaryNudgeBody) {
    return {
      kind: 'daily',
      title: 'Fokus',
      body: params.primaryNudgeBody,
      tag: 'fokus-daily'
    };
  }

  const target = params.primaryGoal || 'attention';
  const tips = getWeeklyDomainTips(target);
  const dayOfYear = params.dayOfYear ?? Math.floor(Date.now() / 86400000);
  return {
    kind: 'daily',
    title: 'Fokus',
    body: tips[dayOfYear % tips.length] || 'Короткая тренировка для поддержания ритма.',
    tag: 'fokus-daily'
  };
}

/** Settings blurb — explains soft-return behaviour of local notifications. */
export function reminderSettingsBlurb(): string {
  return 'Локальные напоминания на устройстве. После паузы Fokus пишет мягко (без «не пропусти»), а после недели тишины замолкает. Работают без интернета и рекламных сервисов.';
}

/** Today PWA install copy — deeper when soft-return is active. */
export function softReturnInstallCopy(softReturnActive: boolean): { title: string; body: string; cta: string } {
  if (softReturnActive) {
    return {
      title: 'Мягкий возврат с главного экрана',
      body: 'Установите Fokus как приложение — спокойный ритуал после паузы открывается в один тап, без вкладок браузера.',
      cta: 'Установить для мягкого старта'
    };
  }
  return {
    title: 'Добавить Fokus на главный экран',
    body: 'Быстрый доступ к тренировкам, полноэкранный режим и работа без интернета.',
    cta: 'Установить приложение'
  };
}

export function preferredReminderHour(): number {
  const h = storage.getProfile().reminderHour;
  return typeof h === 'number' ? h : 9;
}

export function scheduleLocalReminder(): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const profile = storage.getProfile();
  if (profile.reminderHour === null || profile.reminderHour === undefined) return;

  const hour = profile.reminderHour;
  const now = new Date();
  const fire = new Date();
  fire.setHours(hour, 0, 0, 0);
  if (fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + 1);
  }

  const delay = fire.getTime() - now.getTime();
  window.setTimeout(() => {
    maybeNotify();
    scheduleLocalReminder();
  }, Math.min(delay, 2147483647));
}

export function maybeNotify(): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(REMINDER_LAST_KEY) === today) return;
  } catch {
    return;
  }

  const summaries = storage.getDaySummaries();
  const playedToday = summaries.some((d) => d.date.startsWith(today));
  if (playedToday) return;

  const tz = resolveFokusTimeZone().timeZone;
  const todayKey = calendarDayKey(new Date(), tz);
  const played = extractPlayedDays({ daySummaries: summaries, sessions: storage.getSessions() }, tz);
  const streak = computeDayStreak(played, todayKey);

  const hour = preferredReminderHour();
  if (new Date().getHours() < hour) return;

  const sessions = storage.getSessions();
  const domains = storage.getDomains();
  const states = storage.getExerciseStates();

  const ritual = gentleReturnRitual({
    streak,
    sessions,
    daySummaries: summaries,
    exerciseStates: states
  });

  const snap = assessRetention({
    daySummaries: summaries,
    sessions,
    domains,
    playedToday: false,
    streak: streak.current,
    skippedYesterday: streak.openMisses > 0,
    sessionLengthSec: storage.getProfile().sessionLengthSec
  });

  const copy = buildReminderCopy({
    playedToday: false,
    openMisses: streak.openMisses,
    streakStatus: streak.status,
    streakCurrent: streak.current,
    gapDays: snap.gapDays,
    primaryNudgeBody: snap.primaryNudge?.body ?? null,
    primaryNudgeKind: snap.primaryNudge?.kind ?? null,
    primaryGoal: storage.getProfile().primaryGoal,
    softReturnActive: ritual.active
  });

  if (!copy) return;

  try {
    localStorage.setItem(REMINDER_LAST_KEY, today);
  } catch {
    /* ignore quota */
  }

  const n = new Notification(copy.title, {
    body: copy.body,
    icon: `${import.meta.env.BASE_URL}icon.svg`,
    tag: copy.tag
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}
