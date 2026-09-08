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

const QUEST_POOL = [
  { id: 'q1', type: 'blocks', target: 5, title: 'Марафонец', description: 'Завершите 5 блоков за день' },
  { id: 'q2', type: 'accuracy', target: 90, title: 'Снайпер', description: 'Достигните точности 90% в любом блоке' },
  { id: 'q3', type: 'score', target: 500, title: 'Рекордсмен', description: 'Наберите суммарно 500 очков опыта за день' }
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export function getDailyQuests(): Quest[] {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) {
    // Generate new quests
    const selected = QUEST_POOL.sort(() => 0.5 - Math.random()).slice(0, 2).map(q => ({
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
  p.quests.forEach((q: Quest) => {
    if (q.type === type && !q.completed) {
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
    }
  });

  if (changed) {
    storage.setProfile(p);
  }
}
