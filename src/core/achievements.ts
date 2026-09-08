import { storage } from './storage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export const ACHIEVEMENTS_DEF: Achievement[] = [
  { id: 'streak_3', name: 'Огонь', description: 'Тренировка 3 дня подряд', icon: '🔥' },
  { id: 'streak_7', name: 'Неудержимый', description: 'Тренировка 7 дней подряд', icon: '⚡' },
  { id: 'sniper', name: 'Снайпер', description: '100% точность за тренировку', icon: '🎯' },
  { id: 'night_owl', name: 'Сова', description: 'Тренировка после полуночи', icon: '🦉' },
  { id: 'veteran', name: 'Ветеран', description: '50 пройденных блоков', icon: '🎖️' }
];

export function checkAchievements() {
  const profile = storage.getProfile();
  if (!profile.achievements) {
    profile.achievements = [];
  }

  const summaries = storage.getDaySummaries();
  const history = storage.getHistory();
  let newAchievements = false;

  const unlock = (id: string) => {
    if (!profile.achievements!.includes(id)) {
      profile.achievements!.push(id);
      newAchievements = true;
    }
  };

  // Streaks
  if (summaries.length > 0) {
    const lastStreak = summaries[summaries.length - 1].streak;
    if (lastStreak >= 3) unlock('streak_3');
    if (lastStreak >= 7) unlock('streak_7');
  }

  // Sniper
  if (history.length > 0) {
    const lastSession = history[history.length - 1];
    if (lastSession.accuracy === 1) unlock('sniper');
  }

  // Night Owl
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 4) {
    unlock('night_owl');
  }

  // Veteran
  let totalBlocks = 0;
  const sessions = storage.getSessions();
  sessions.forEach(s => totalBlocks += s.items.length);
  if (totalBlocks >= 50) {
    unlock('veteran');
  }

  if (newAchievements) {
    storage.setProfile(profile);
  }
}
