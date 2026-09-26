import { storage } from './storage';
import { extractPlayedDays, computeDayStreak, calendarDayKey, resolveFokusTimeZone } from './streak';
import { getManifest } from '../exercises/catalog';

export type QuestType = 'blocks' | 'accuracy' | 'score' | 'diversity' | 'perfect' | 'domain';
export type QuestDifficulty = 'easy' | 'medium' | 'hard';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  progress: number;
  completed: boolean;
  claimed?: boolean;
  xpReward: number;
  difficulty?: QuestDifficulty;
  domainId?: string;
}

const QUEST_POOL: Omit<Quest, 'progress' | 'completed' | 'claimed'>[] = [
  // Easy
  { id: 'e1', type: 'blocks', difficulty: 'easy', target: 3, title: 'Разминка', description: 'Завершите 3 блока', xpReward: 30 },
  { id: 'e2', type: 'accuracy', difficulty: 'easy', target: 80, title: 'Точность', description: 'Наберите 80% точности в любом блоке', xpReward: 30 },
  { id: 'e3', type: 'score', difficulty: 'easy', target: 300, title: 'Первые шаги', description: 'Наберите суммарно 300 очков за день', xpReward: 30 },
  { id: 'e4', type: 'domain', difficulty: 'easy', target: 2, domainId: 'memory', title: 'Тренировка памяти', description: 'Пройдите 2 игры на память', xpReward: 40 },
  { id: 'e5', type: 'domain', difficulty: 'easy', target: 2, domainId: 'attention', title: 'Фокус внимания', description: 'Пройдите 2 игры на внимание', xpReward: 40 },
  // Medium
  { id: 'm1', type: 'blocks', difficulty: 'medium', target: 5, title: 'Марафонец', description: 'Завершите 5 блоков за день', xpReward: 60 },
  { id: 'm2', type: 'accuracy', difficulty: 'medium', target: 90, title: 'Снайпер', description: 'Достигните точности 90% в любом блоке', xpReward: 60 },
  { id: 'm3', type: 'score', difficulty: 'medium', target: 800, title: 'Рекордсмен', description: 'Наберите суммарно 800 очков за день', xpReward: 60 },
  { id: 'm4', type: 'diversity', difficulty: 'medium', target: 3, title: 'Разносторонний', description: 'Сыграйте в 3 разные игры', xpReward: 70 },
  { id: 'm5', type: 'perfect', difficulty: 'medium', target: 1, title: 'Безупречность', description: 'Завершите блок со 100% точностью', xpReward: 80 },
  { id: 'm6', type: 'domain', difficulty: 'medium', target: 3, domainId: 'math', title: 'Быстрый счет', description: 'Пройдите 3 математические игры', xpReward: 70 },
  // Hard
  { id: 'h1', type: 'blocks', difficulty: 'hard', target: 10, title: 'Неутомимый', description: 'Завершите 10 блоков за день', xpReward: 150 },
  { id: 'h2', type: 'score', difficulty: 'hard', target: 1500, title: 'Чемпион', description: 'Наберите суммарно 1500 очков за день', xpReward: 150 },
  { id: 'h3', type: 'perfect', difficulty: 'hard', target: 3, title: 'Идеал', description: 'Завершите 3 блока со 100% точностью', xpReward: 200 },
  { id: 'h4', type: 'accuracy', difficulty: 'hard', target: 98, title: 'Хирург', description: 'Достигните точности 98% в любом блоке', xpReward: 120 }
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export function getDailyQuests(): Quest[] {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) {
    const easy = QUEST_POOL.filter(q => q.difficulty === 'easy').sort(() => 0.5 - Math.random())[0];
    const medium = QUEST_POOL.filter(q => q.difficulty === 'medium').sort(() => 0.5 - Math.random())[0];
    const hard = QUEST_POOL.filter(q => q.difficulty === 'hard').sort(() => 0.5 - Math.random())[0];

    const selected = [easy, medium, hard].map(q => ({
      ...q,
      progress: 0,
      completed: false,
      claimed: false
    })) as Quest[];
    
    const tz = resolveFokusTimeZone().timeZone;
    const todayKey = calendarDayKey(new Date(), tz);
    const played = extractPlayedDays({ daySummaries: storage.getDaySummaries(), sessions: storage.getSessions() }, tz);
    const ds = computeDayStreak(played, todayKey);
    
    if (ds.status === 'soft_return') {
      selected[0] = {
        id: 'recovery_quest',
        title: 'Мягкий возврат',
        description: 'Пройдите 1 короткий блок, чтобы восстановить ритм после паузы',
        type: 'blocks',
        difficulty: 'easy',
        target: 1,
        progress: 0,
        completed: false,
        claimed: false,
        xpReward: 100
      };
    } else if (ds.status === 'fresh_start') {
      selected[0] = {
        id: 'fresh_start_quest',
        title: 'Новый старт',
        description: 'Завершите 1 любой блок без спешки',
        type: 'blocks',
        difficulty: 'easy',
        target: 1,
        progress: 0,
        completed: false,
        claimed: false,
        xpReward: 150
      };
    } else if (ds.status === 'active' && ds.current > 0 && ds.current % 3 === 0) {
      selected[1] = {
        id: 'streak_bonus',
        title: 'Сила привычки',
        description: `Завершите 3 блока, чтобы укрепить свою серию (${ds.current} дн.)`,
        type: 'blocks',
        difficulty: 'medium',
        target: 3,
        progress: 0,
        completed: false,
        claimed: false,
        xpReward: 150
      };
    }

    p.quests = selected;
    p.questsDate = getTodayStr();
    storage.setProfile(p);
  }

  const quests = storage.getProfile().quests as Quest[];
  let changed = false;
  quests.forEach(q => {
    if (q.claimed === undefined) {
      q.claimed = q.completed;
      changed = true;
    }
    if (!q.difficulty) {
      q.difficulty = 'medium';
      changed = true;
    }
  });

  if (changed) {
    p.quests = quests;
    storage.setProfile(p);
  }

  syncQuestsProgress();

  return storage.getProfile().quests as Quest[];
}

function syncQuestsProgress() {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) return;

  const today = getTodayStr();
  const todaySessions = storage.getSessions().filter(s => s.startedAt.startsWith(today));
  
  let changed = false;
  
  let totalBlocks = 0;
  let maxAccuracy = 0;
  let totalScore = 0;
  const uniqueGames = new Set<string>();
  let perfectBlocks = 0;
  const domainBlocks: Record<string, number> = {};

  todaySessions.forEach(s => {
    totalBlocks += s.items.length;
    s.items.forEach(i => {
      uniqueGames.add(i.exerciseId);
      const acc = Math.round(i.accuracy * 100);
      if (acc > maxAccuracy) maxAccuracy = acc;
      if (acc === 100) perfectBlocks++;
      totalScore += i.score;

      const m = getManifest(i.exerciseId);
      if (m && m.domain) {
        domainBlocks[m.domain] = (domainBlocks[m.domain] || 0) + 1;
      }
    });
  });

  p.quests.forEach((q: Quest) => {
    if (q.completed) return;

    let newProgress = q.progress;
    
    switch (q.type) {
      case 'blocks': newProgress = Math.max(newProgress, totalBlocks); break;
      case 'accuracy': newProgress = Math.max(newProgress, maxAccuracy); break;
      case 'score': newProgress = Math.max(newProgress, totalScore); break;
      case 'diversity': newProgress = Math.max(newProgress, uniqueGames.size); break;
      case 'perfect': newProgress = Math.max(newProgress, perfectBlocks); break;
      case 'domain': 
        if (q.domainId) newProgress = Math.max(newProgress, domainBlocks[q.domainId] || 0); 
        break;
    }

    if (newProgress > q.progress) {
      q.progress = newProgress;
      changed = true;
    }

    if (q.progress >= q.target && !q.completed) {
      q.progress = q.target;
      q.completed = true;
      changed = true;
    }
  });

  if (changed) {
    storage.setProfile(p);
  }
}

export function updateQuestProgress(type: string, value: number, exerciseId?: string) {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) return;

  let changed = false;
  p.quests.forEach((q: Quest) => {
    if (q.completed) return;

    if (q.type === type) {
      if (type === 'accuracy') {
        if (value >= q.target) {
          q.progress = q.target;
          q.completed = true;
          changed = true;
        }
      } else {
        q.progress += value;
        if (q.progress >= q.target) {
          q.progress = q.target;
          q.completed = true;
        }
        changed = true;
      }
    } else if (q.type === 'perfect' && type === 'accuracy' && value === 100) {
       q.progress += 1;
       if (q.progress >= q.target) {
           q.progress = q.target;
           q.completed = true;
       }
       changed = true;
    } else if (q.type === 'domain' && type === 'blocks' && exerciseId) {
       const m = getManifest(exerciseId);
       if (m && m.domain === q.domainId) {
         q.progress += 1;
         if (q.progress >= q.target) {
             q.progress = q.target;
             q.completed = true;
         }
         changed = true;
       }
    }
  });

  if (changed) {
    storage.setProfile(p);
  }
  
  syncQuestsProgress();
}

export function claimQuest(id: string): boolean {
  const p = storage.getProfile();
  if (!p.quests) return false;
  
  const q = p.quests.find((x: Quest) => x.id === id);
  if (q && q.completed && !q.claimed) {
    q.claimed = true;
    p.xp = (p.xp || 0) + (q.xpReward || 50);
    storage.setProfile(p);
    return true;
  }
  return false;
}

export function getWeeklyGoal() {
  const p = storage.getProfile();
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  const weekStartStr = d.toISOString().split('T')[0];
  
  if (!p.weeklyGoal || p.weeklyGoal.startIso !== weekStartStr) {
    const domains = storage.getDomains();
    const sorted = [...domains].sort((a, b) => a.value - b.value);
    const weakDomain = sorted.length > 0 ? sorted[0].domain : 'attention';
    p.weeklyGoal = {
      domain: weakDomain,
      startIso: weekStartStr,
      target: 15,
      progress: 0
    };
    storage.setProfile(p);
  }
  return p.weeklyGoal;
}

export function updateWeeklyGoalProgress(domain: string, blocks: number) {
  const p = storage.getProfile();
  const goal = p.weeklyGoal;
  if (!goal) return;

  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  const weekStartStr = d.toISOString().split('T')[0];
  
  if (goal.startIso === weekStartStr && goal.domain === domain) {
    if (goal.progress < goal.target) {
      goal.progress += blocks;
      if (goal.progress > goal.target) goal.progress = goal.target;
      p.weeklyGoal = goal;
      storage.setProfile(p);
    }
  }
}
