import { storage } from './storage';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'blocks' | 'accuracy' | 'score';
  target: number;
  progress: number;
  completed: boolean;
}

export const QUEST_XP = 50;

const QUEST_POOL = [
  { id: 'q1', type: 'blocks', target: 5, title: 'Марафонец', description: 'Завершите 5 блоков за день' },
  { id: 'q2', type: 'accuracy', target: 90, title: 'Снайпер', description: 'Достигните точности 90% в любом блоке' },
  { id: 'q3', type: 'score', target: 500, title: 'Рекордсмен', description: 'Наберите суммарно 500 очков за день' },
  { id: 'q4', type: 'blocks', target: 3, title: 'Разминка', description: 'Завершите 3 блока без пропусков' },
  { id: 'q5', type: 'accuracy', target: 80, title: 'Точность', description: 'Наберите 80% точности в любом блоке' }
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export function getDailyQuests(): Quest[] {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) {
    // Generate new quests
    const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2).map(q => ({
      ...q,
      progress: 0,
      completed: false
    })) as Quest[];
    p.quests = selected;
    p.questsDate = getTodayStr();
    storage.setProfile(p);
  }
  return p.quests as Quest[];
}

export function updateQuestProgress(type: 'blocks' | 'accuracy' | 'score', value: number) {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) return;

  let changed = false;
  let xpGain = 0;
  p.quests.forEach((q: Quest) => {
    if (q.type === type && !q.completed) {
      const wasComplete = q.completed;
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
      if (q.completed && !wasComplete) {
        xpGain += QUEST_XP;
      }
    }
  });

  if (changed) {
    if (xpGain > 0) p.xp = (p.xp || 0) + xpGain;
    storage.setProfile(p);
  }
}
