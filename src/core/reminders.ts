import { REMINDER_LAST_KEY } from './privacy';
import { storage } from './storage';
import { computeDayStreak, extractPlayedDays, resolveFokusTimeZone, calendarDayKey } from './streak';
import { getWeeklyDomainTips } from './coach-intel';

export { REMINDER_LAST_KEY };
import { assessRetention } from './retention';

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

  const sessions = storage.getSessions();
  const domains = storage.getDomains();
  
  const snap = assessRetention({
    daySummaries: summaries,
    sessions,
    domains,
    playedToday: false,
    streak: streak.current,
    skippedYesterday: streak.openMisses > 0,
    sessionLengthSec: storage.getProfile().sessionLengthSec
  });

  let body = 'Короткая тренировка для поддержания ритма.';
  if (snap.primaryNudge) {
    body = snap.primaryNudge.body;
  } else if (streak.status === 'open') {
    const target = storage.getProfile().primaryGoal || 'attention';
    const tips = getWeeklyDomainTips(target);
    const dayOfYear = Math.floor(Date.now() / 86400000);
    body = tips[dayOfYear % tips.length];
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
