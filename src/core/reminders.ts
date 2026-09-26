import { REMINDER_LAST_KEY } from './privacy';
import { storage } from './storage';
import { computeDayStreak, extractPlayedDays, resolveFokusTimeZone, calendarDayKey } from './streak';

export { REMINDER_LAST_KEY };

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
  
  if (streak.openMisses > 7) return;
  if (streak.openMisses > 2 && streak.openMisses !== 3 && streak.openMisses !== 7) return;

  const hour = preferredReminderHour();
  if (new Date().getHours() < hour) return;

  try {
    localStorage.setItem(REMINDER_LAST_KEY, today);
  } catch {
    /* ignore quota */
  }

  let body = 'Короткая тренировка для поддержания ритма.';
  if (streak.status === 'open') {
    body = `Ваш ритм: ${streak.current} ${streak.current === 1 ? 'день' : 'дней'}. Короткая сессия поможет закрепить результат.`;
  } else if (streak.status === 'soft_return') {
    if (streak.consistency30 >= 80) {
      body = `Регулярность ${streak.consistency30}%. Лёгкая разминка поддержит ваш стабильный уровень.`;
    } else {
      body = 'Плавное возвращение. Короткий блок сегодня важнее, чем марафон завтра.';
    }
  } else if (streak.status === 'fresh_start') {
    if (streak.openMisses === 3) {
      body = 'Свежий старт. Пятиминутный блок — отличный первый шаг.';
    } else if (streak.openMisses === 7) {
      body = 'Пауза — это нормально. Fokus готов к лёгкой восстановительной сессии.';
    } else {
      body = 'Общая регулярность важнее непрерывной серии. Начнём в комфортном темпе.';
    }
  }

  const n = new Notification('Fokus', {
    body,
    icon: `${import.meta.env.BASE_URL}icon.svg`,
    tag: 'fokus-daily'
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}
