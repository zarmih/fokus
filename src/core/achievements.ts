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
  { id: 'streak_30', name: 'Железная воля', description: 'Тренировка 30 дней подряд', icon: '👑' },
  { id: 'sniper', name: 'Снайпер', description: '100% точность за тренировку', icon: '🎯' },
  { id: 'night_owl', name: 'Сова', description: 'Тренировка после полуночи', icon: '🦉' },
  { id: 'early_bird', name: 'Жаворонок', description: 'Тренировка до 8 утра', icon: '🌅' },
  { id: 'veteran', name: 'Ветеран', description: '50 пройденных блоков', icon: '🎖️' },
  { id: 'master', name: 'Мастер', description: '500 пройденных блоков', icon: '🏆' },
  { id: 'explorer', name: 'Исследователь', description: '10 разных упражнений', icon: '🧭' },
  { id: 'balanced', name: 'Баланс', description: 'Данные по всем пяти областям', icon: '⚖️' },
  { id: 'perfectionist', name: 'Перфекционист', description: '10 блоков без единой ошибки', icon: '✨' }
];

export interface AchievementState extends Achievement {
  progress: number;
  maxProgress: number;
}

export function getAchievementsState(): AchievementState[] {
  const profile = storage.getProfile();
  const unlocked = profile.achievements || [];
  const summaries = storage.getDaySummaries();
  const history = storage.getHistory();
  const sessions = storage.getSessions();
  const domains = storage.getDomains().filter(d => d.value > 0);
  
  const lastStreak = summaries.length > 0 ? summaries[summaries.length - 1].streak : 0;
  
  let totalBlocks = 0;
  let perfectBlocks = 0;
  const unique = new Set<string>();
  
  sessions.forEach(s => {
    totalBlocks += s.items.length;
    s.items.forEach(i => {
      unique.add(i.exerciseId);
      if (i.accuracy === 1) perfectBlocks++;
    });
  });

  const maxProgressMap: Record<string, number> = {
    'first_session': 1, 'streak_3': 3, 'streak_7': 7, 'streak_14': 14, 'streak_30': 30,
    'sniper': 1, 'night_owl': 1, 'early_bird': 1, 'veteran': 50, 'master': 500,
    'explorer': 10, 'balanced': 5, 'perfectionist': 10
  };

  return ACHIEVEMENTS_DEF.map(def => {
    const isUnlocked = unlocked.includes(def.id);
    const maxP = maxProgressMap[def.id] || 1;
    let progress = 0;
    
    if (isUnlocked) {
      progress = maxP;
    } else {
      switch (def.id) {
        case 'first_session': progress = history.length >= 1 ? 1 : 0; break;
        case 'streak_3': progress = Math.min(lastStreak, 3); break;
        case 'streak_7': progress = Math.min(lastStreak, 7); break;
        case 'streak_14': progress = Math.min(lastStreak, 14); break;
        case 'streak_30': progress = Math.min(lastStreak, 30); break;
        case 'sniper': progress = perfectBlocks > 0 ? 1 : 0; break;
        case 'night_owl': progress = 0; break;
        case 'early_bird': progress = 0; break;
        case 'veteran': progress = Math.min(totalBlocks, 50); break;
        case 'master': progress = Math.min(totalBlocks, 500); break;
        case 'explorer': progress = Math.min(unique.size, 10); break;
        case 'balanced': progress = Math.min(domains.length, 5); break;
        case 'perfectionist': progress = Math.min(perfectBlocks, 10); break;
      }
    }

    return {
      ...def,
      progress,
      maxProgress: maxP,
      unlockedAt: isUnlocked ? new Date().toISOString() : undefined
    };
  });
}

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
    if (lastStreak >= 30) unlock('streak_30');
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
  let perfectBlocks = 0;
  const unique = new Set<string>();
  sessions.forEach(s => {
    totalBlocks += s.items.length;
    s.items.forEach(i => {
      unique.add(i.exerciseId);
      if (i.accuracy === 1) perfectBlocks++;
    });
  });
  if (totalBlocks >= 50) unlock('veteran');
  if (totalBlocks >= 500) unlock('master');
  if (unique.size >= 10) unlock('explorer');
  if (perfectBlocks >= 10) unlock('perfectionist');

  const domains = storage.getDomains().filter(d => d.value > 0);
  if (domains.length >= 5) unlock('balanced');

  if (newly.length > 0) {
    storage.setProfile(profile);
  }
  return newly;
}
