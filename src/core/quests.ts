import { storage } from './storage';
import { extractPlayedDays, computeDayStreak, calendarDayKey, resolveFokusTimeZone } from './streak';

export type QuestType = 'blocks' | 'accuracy' | 'score' | 'diversity' | 'perfect';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
}

const QUEST_POOL: Omit<Quest, 'progress' | 'completed'>[] = [
  { id: 'q1', type: 'blocks', target: 5, title: 'Марафонец', description: 'Завершите 5 блоков за день', xpReward: 50 },
  { id: 'q2', type: 'accuracy', target: 90, title: 'Снайпер', description: 'Достигните точности 90% в любом блоке', xpReward: 50 },
  { id: 'q3', type: 'score', target: 500, title: 'Рекордсмен', description: 'Наберите суммарно 500 очков за день', xpReward: 75 },
  { id: 'q4', type: 'blocks', target: 3, title: 'Разминка', description: 'Завершите 3 блока', xpReward: 30 },
  { id: 'q5', type: 'accuracy', target: 80, title: 'Точность', description: 'Наберите 80% точности в любом блоке', xpReward: 30 },
  { id: 'q6', type: 'diversity', target: 3, title: 'Разносторонний', description: 'Сыграйте в 3 разные игры', xpReward: 100 },
  { id: 'q7', type: 'perfect', target: 1, title: 'Безупречность', description: 'Завершите блок со 100% точностью', xpReward: 100 },
  { id: 'q8', type: 'score', target: 1000, title: 'Чемпион', description: 'Наберите суммарно 1000 очков за день', xpReward: 150 },
  { id: 'q9', type: 'blocks', target: 10, title: 'Неутомимый', description: 'Завершите 10 блоков за день', xpReward: 200 }
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export function getDailyQuests(): Quest[] {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) {
    // Generate new quests
    const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map(q => ({
      ...q,
      progress: 0,
      completed: false
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
        target: 1,
        progress: 0,
        completed: false,
        xpReward: 100
      };
    } else if (ds.status === 'fresh_start') {
      selected[0] = {
        id: 'fresh_start_quest',
        title: 'Новый старт',
        description: 'Завершите 1 любой блок без спешки. Мы снизили сложность.',
        type: 'blocks',
        target: 1,
        progress: 0,
        completed: false,
        xpReward: 150
      };
    } else if (ds.status === 'active' && ds.current > 0 && ds.current % 3 === 0) {
      selected[0] = {
        id: 'streak_bonus',
        title: 'Сила привычки',
        description: `Завершите 3 блока, чтобы укрепить свою серию (${ds.current} дн.)`,
        type: 'blocks',
        target: 3,
        progress: 0,
        completed: false,
        xpReward: 150
      };
    }

    p.quests = selected;
    p.questsDate = getTodayStr();
    storage.setProfile(p);
  }

  // Auto-sync progress based on today's sessions
  syncQuestsProgress();

  return storage.getProfile().quests as Quest[];
}

function syncQuestsProgress() {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) return;

  const today = getTodayStr();
  const todaySessions = storage.getSessions().filter(s => s.startedAt.startsWith(today));
  
  let changed = false;
  let xpGain = 0;
  
  let totalBlocks = 0;
  let maxAccuracy = 0;
  let totalScore = 0;
  const uniqueGames = new Set<string>();
  let perfectBlocks = 0;

  todaySessions.forEach(s => {
    totalBlocks += s.items.length;
    s.items.forEach(i => {
      uniqueGames.add(i.exerciseId);
      const acc = Math.round(i.accuracy * 100);
      if (acc > maxAccuracy) maxAccuracy = acc;
      if (acc === 100) perfectBlocks++;
      totalScore += i.score;
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
    }

    if (newProgress > q.progress) {
      q.progress = newProgress;
      changed = true;
    }

    if (q.progress >= q.target && !q.completed) {
      q.progress = q.target;
      q.completed = true;
      changed = true;
      xpGain += q.xpReward || 50;
    }
  });

  if (changed) {
    if (xpGain > 0) p.xp = (p.xp || 0) + xpGain;
    storage.setProfile(p);
  }
}

export function updateQuestProgress(type: string, value: number) {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) return;

  let changed = false;
  let xpGain = 0;
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
    }
    
    if (q.completed && changed) {
      xpGain += (q.xpReward || 50);
    }
  });

  if (changed) {
    if (xpGain > 0) p.xp = (p.xp || 0) + xpGain;
    storage.setProfile(p);
  }
  
  // also run a full sync just in case
  syncQuestsProgress();
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
      target: 15, // Made slightly harder for better progression
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

