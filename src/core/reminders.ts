import { REMINDER_LAST_KEY } from './privacy';
import { storage } from './storage';
import { computeDayStreak, extractPlayedDays, resolveFokusTimeZone, calendarDayKey } from './streak';
import { getWeeklyDomainTips } from './coach-intel';

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
    const target = storage.getProfile().primaryGoal || 'attention';
    const tips = getWeeklyDomainTips(target);
    const dayOfYear = Math.floor(Date.now() / 86400000);
    body = tips[dayOfYear % tips.length];
  } else if (streak.status === 'soft_return') {
    if (streak.consistency30 >= 80) {
      body = `Вы держите отличную регулярность (${streak.consistency30}% за месяц). Один короткий блок поможет закрепить результат без лишнего напряжения.`;
    } else {
      body = 'Пропуски — это часть пути. Мягкий возврат в ритм через одну лёгкую сессию без чувства вины.';
    }
  } else if (streak.status === 'fresh_start') {
    if (streak.openMisses === 3) {
      body = 'Паузы помогают избегать выгорания. Fokus готов к короткой сессии в вашем темпе — без марафонов.';
    } else if (streak.openMisses === 7) {
      body = 'Фокус не пропадает за неделю. Спокойная разминка поможет снова включиться в ритм, когда вы будете готовы.';
    } else {
      body = 'Честный подход к тренировкам: никакого чувства вины за пропуски. Начнём с лёгкой разминки?';
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
