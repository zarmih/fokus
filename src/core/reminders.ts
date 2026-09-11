import { storage } from './storage';
import { shouldSuppressNotify } from './focus-mode';

const LAST_KEY = 'fokus.reminder.last';

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
  if (shouldSuppressNotify()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(LAST_KEY) === today) return;
  } catch {
    return;
  }

  const summaries = storage.getDaySummaries();
  const playedToday = summaries.some((d) => d.date.startsWith(today));
  if (playedToday) return;

  const hour = preferredReminderHour();
  if (new Date().getHours() < hour) return;

  try {
    localStorage.setItem(LAST_KEY, today);
  } catch {
    /* ignore quota */
  }

  const n = new Notification('Fokus', {
    body: 'Пять минут на внимание и память. Серия ждёт.',
    icon: `${import.meta.env.BASE_URL}icon.svg`,
    tag: 'fokus-daily'
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}
