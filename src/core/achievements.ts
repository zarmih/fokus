import { storage } from './storage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export const ACHIEVEMENTS_DEF: Achievement[] = [
  { id: 'first_session', name: 'Старт', description: 'Первая полноценная тренировка', icon: '🌱' },
  { id: 'streak_3', name: 'Огонь', description: 'Тренировка 3 дня подряд', icon: '🔥' },
  { id: 'streak_7', name: 'Неудержимый', description: 'Тренировка 7 дней подряд', icon: '⚡' },
  { id: 'streak_14', name: 'Ритуал', description: 'Тренировка 14 дней подряд', icon: '💎' },
  { id: 'sniper', name: 'Снайпер', description: '100% точность за тренировку', icon: '🎯' },
  { id: 'night_owl', name: 'Сова', description: 'Тренировка после полуночи', icon: '🦉' },
  { id: 'early_bird', name: 'Жаворонок', description: 'Тренировка до 8 утра', icon: '🌅' },
  { id: 'veteran', name: 'Ветеран', description: '50 пройденных блоков', icon: '🎖️' },
  { id: 'explorer', name: 'Исследователь', description: '10 разных упражнений', icon: '🧭' },
  { id: 'balanced', name: 'Баланс', description: 'Данные по всем пяти областям', icon: '⚖️' }
];

export function checkAchievements(): string[] {
  const profile = storage.getProfile();
  if (!profile.achievements) {
    profile.achievements = [];
  }

  const summaries = storage.getDaySummaries();
  const history = storage.getHistory();
  const newly: string[] = [];

  const unlock = (id: string) => {
    if (!profile.achievements!.includes(id)) {
      profile.achievements!.push(id);
      newly.push(id);
    }
  };

  if (history.length >= 1) unlock('first_session');

  if (summaries.length > 0) {
    const lastStreak = summaries[summaries.length - 1].streak;
    if (lastStreak >= 3) unlock('streak_3');
    if (lastStreak >= 7) unlock('streak_7');
    if (lastStreak >= 14) unlock('streak_14');
  }

  if (history.length > 0) {
    const lastSession = history[history.length - 1];
    if (lastSession.accuracy === 1) unlock('sniper');
  }

  const hour = new Date().getHours();
  if (hour >= 0 && hour < 4) unlock('night_owl');
  if (hour >= 5 && hour < 8) unlock('early_bird');

  const sessions = storage.getSessions();
  let totalBlocks = 0;
  const unique = new Set<string>();
  sessions.forEach(s => {
    totalBlocks += s.items.length;
    s.items.forEach(i => unique.add(i.exerciseId));
  });
  if (totalBlocks >= 50) unlock('veteran');
  if (unique.size >= 10) unlock('explorer');

  const domains = storage.getDomains().filter(d => d.value > 0);
  if (domains.length >= 5) unlock('balanced');

  if (newly.length > 0) {
    storage.setProfile(profile);
  }
  return newly;
}
