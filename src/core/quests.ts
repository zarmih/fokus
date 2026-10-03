import { storage } from './storage';
import { extractPlayedDays, computeDayStreak, calendarDayKey, resolveFokusTimeZone } from './streak';
import { getManifest } from '../exercises/catalog';
import { domainLabel } from './labels';

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
  { id: 'e1', type: 'blocks', difficulty: 'easy', target: 2, title: 'Мягкий старт', description: 'Пройдите 2 блока в комфортном темпе (по желанию)', xpReward: 30 },
  { id: 'e2', type: 'accuracy', difficulty: 'easy', target: 80, title: 'Внимание к деталям', description: 'Постарайтесь достичь 80% точности, не торопясь', xpReward: 30 },
  { id: 'e3', type: 'score', difficulty: 'easy', target: 300, title: 'Первые шаги', description: 'Соберите 300 очков без давления на результат', xpReward: 30 },
  { id: 'e4', type: 'domain', difficulty: 'easy', target: 1, domainId: 'memory', title: 'Память', description: 'Пройдите 1 игру на память, если есть настроение', xpReward: 40 },
  { id: 'e5', type: 'domain', difficulty: 'easy', target: 1, domainId: 'attention', title: 'Внимание', description: 'Уделите немного времени 1 игре на фокус', xpReward: 40 },
  // Medium
  { id: 'm1', type: 'blocks', difficulty: 'medium', target: 3, title: 'Погружение', description: 'Пройдите 3 блока, только если чувствуете силы', xpReward: 60 },
  { id: 'm2', type: 'accuracy', difficulty: 'medium', target: 90, title: 'Точность', description: 'Сделайте акцент на безошибочность (90% в одном блоке)', xpReward: 60 },
  { id: 'm3', type: 'score', difficulty: 'medium', target: 500, title: 'Уверенный темп', description: 'Пройдите упражнения на 500 очков в своём ритме', xpReward: 60 },
  { id: 'm4', type: 'diversity', difficulty: 'medium', target: 2, title: 'Разносторонний фокус', description: 'Попробуйте 2 разных формата упражнений (для кругозора)', xpReward: 70 },
  { id: 'm5', type: 'perfect', difficulty: 'medium', target: 1, title: 'Медитативность', description: 'Попробуйте пройти 1 блок без ошибок, полностью погрузившись в процесс', xpReward: 80 },
  { id: 'm6', type: 'domain', difficulty: 'medium', target: 2, domainId: 'math', title: 'Счёт', description: 'Уделите время двум математическим играм', xpReward: 70 },
  { id: 'm7', type: 'blocks', difficulty: 'medium', target: 2, title: 'Свежий взгляд', description: 'Сыграйте 2 блока. Кстати, в каталоге иногда появляются новые упражнения на внимание и скорость — загляните, если хочется разнообразия.', xpReward: 65 },
  // Hard
  { id: 'h1', type: 'blocks', difficulty: 'hard', target: 4, title: 'Объёмная сессия', description: 'Пройдите 4 блока (отличный вызов по желанию)', xpReward: 150 },
  { id: 'h2', type: 'score', difficulty: 'hard', target: 600, title: 'Отличный результат', description: 'Наберите 600 очков, наслаждаясь процессом', xpReward: 150 },
  { id: 'h3', type: 'perfect', difficulty: 'hard', target: 2, title: 'Глубокий фокус', description: 'Постарайтесь пройти 2 блока без ошибок', xpReward: 200 },
  { id: 'h4', type: 'accuracy', difficulty: 'hard', target: 95, title: 'Филигранность', description: 'Достигните 95% точности в одном блоке, не торопясь', xpReward: 120 }
];


/** Stable 32-bit seed from YYYY-MM-DD (no Math.random in selection). */
export function daySeed(dateStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cloneQuest(q: Omit<Quest, 'progress' | 'completed' | 'claimed'>): Quest {
  return { ...q, progress: 0, completed: false, claimed: false };
}

function pickDomainQuest(domainId: string, difficulty: QuestDifficulty, seed: number): Quest | null {
  const pool = QUEST_POOL.filter(
    (q) => q.type === 'domain' && q.domainId === domainId && (q.difficulty || 'medium') === difficulty
  );
  if (pool.length === 0) {
    const anyDom = QUEST_POOL.filter((q) => q.type === 'domain' && q.domainId === domainId);
    if (anyDom.length === 0) return null;
    return cloneQuest(seededShuffle(anyDom, seed)[0]);
  }
  return cloneQuest(seededShuffle(pool, seed)[0]);
}

function pickByDifficulty(difficulty: QuestDifficulty, seed: number, excludeIds: Set<string>): Quest {
  const pool = QUEST_POOL.filter((q) => (q.difficulty || 'medium') === difficulty && !excludeIds.has(q.id));
  const picked = seededShuffle(pool.length ? pool : QUEST_POOL.filter((q) => !excludeIds.has(q.id)), seed)[0];
  return cloneQuest(picked);
}

export interface SelectQuestSetInput {
  dateStr: string;
  streakStatus?: string;
  /** Today's plan focus domains (from ritual / adaptive). */
  focusDomains?: string[];
  /** First-week ritual primary focus, if in week. */
  firstWeekFocus?: string | null;
  inFirstWeek?: boolean;
  firstWeekDay?: number | null;
}

/**
 * Pure daily quest set. Soft-return / first-week / plan focus bias retention loops
 * without empty stub cards. Deterministic for a given dateStr.
 */
export function selectQuestSet(input: SelectQuestSetInput): Quest[] {
  const seed = daySeed(input.dateStr);
  const used = new Set<string>();
  let easy = pickByDifficulty('easy', seed, used);
  used.add(easy.id);
  let medium = pickByDifficulty('medium', seed + 17, used);
  used.add(medium.id);
  let hard = pickByDifficulty('hard', seed + 41, used);
  used.add(hard.id);

  const focus = input.firstWeekFocus || (input.focusDomains && input.focusDomains[0]) || null;

  if (input.inFirstWeek && focus) {
    const fw = pickDomainQuest(focus, 'easy', seed + 3);
    if (fw) {
      let fTitle = 'Ритуал дня';
      let fDesc = `Короткий шаг первой недели: одна игра на «${domainLabel(focus)}». Без наверстывания.`;
      
      if (input.firstWeekDay) {
        if (input.firstWeekDay === 1) {
          fTitle = 'День 1: Знакомство';
          fDesc = `Пройдите первую игру на «${domainLabel(focus)}». Без спешки, привыкаем к формату.`;
        } else if (input.firstWeekDay === 4) {
          fTitle = 'День 4: Отдых';
          fDesc = `Лёгкий день. Сыграйте одну игру на «${domainLabel(focus)}» и со спокойной совестью отдыхайте.`;
        } else if (input.firstWeekDay === 7) {
          fTitle = 'День 7: Полный ритуал';
          fDesc = `Завершаем неделю. Сыграйте «${domainLabel(focus)}» в своём ритме.`;
        } else {
          fTitle = `День ${input.firstWeekDay}: В ритме`;
          fDesc = `Продолжаем неделю: одна игра на «${domainLabel(focus)}». Не нужно ничего наверстывать, если пропустили.`;
        }
      }

      easy = {
        ...fw,
        id: 'first_week_quest',
        title: fTitle,
        description: fDesc,
        xpReward: Math.max(fw.xpReward, 60)
      };
    }
  } else if (focus && easy.type !== 'domain') {
    const biased = pickDomainQuest(focus, 'easy', seed + 5);
    if (biased) easy = biased;
  }

  const selected = [easy, medium, hard];
  const status = input.streakStatus || 'active';

  if (status === 'soft_return') {
    selected[0] = {
      id: 'recovery_quest',
      title: 'Мягкий возврат',
      description: 'Пройдите 1 короткий блок, чтобы восстановить ритм. Никаких штрафов за пропуск.',
      type: 'blocks',
      difficulty: 'easy',
      target: 1,
      progress: 0,
      completed: false,
      claimed: false,
      xpReward: 100
    };
  } else if (status === 'fresh_start') {
    selected[0] = {
      id: 'fresh_start_quest',
      title: 'Новый старт',
      description: 'Завершите 1 любой блок. Начинаем без спешки.',
      type: 'blocks',
      difficulty: 'easy',
      target: 1,
      progress: 0,
      completed: false,
      claimed: false,
      xpReward: 150
    };
  } else if (status === 'active') {
    // Streak milestone every 3 days — derived from seed bit, not random.
    if ((seed % 3) === 0 && !input.inFirstWeek) {
      selected[1] = {
        id: 'streak_bonus',
        title: 'Устойчивый ритм',
        description: 'Пройдите 2 блока. Вы уже в ритме — главное качество, а не количество.',
        type: 'blocks',
        difficulty: 'medium',
        target: 2,
        progress: 0,
        completed: false,
        claimed: false,
        xpReward: 100
      };
    } else if ((seed % 10) >= 8 && !input.inFirstWeek) {
      selected[2] = {
        id: 'mindful_rest',
        title: 'Слушай себя',
        description: 'Сделайте паузу, если устали. Либо пройдите 1 блок ради удовольствия.',
        type: 'blocks',
        difficulty: 'easy',
        target: 1,
        progress: 0,
        completed: false,
        claimed: false,
        xpReward: 50
      };
    }
  }

  return selected;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export function getDailyQuests(opts?: {
  focusDomains?: string[];
  firstWeekFocus?: string | null;
  inFirstWeek?: boolean;
  firstWeekDay?: number | null;
}): Quest[] {
  const p = storage.getProfile();
  if (!p.quests || p.questsDate !== getTodayStr()) {
    const tz = resolveFokusTimeZone().timeZone;
    const todayKey = calendarDayKey(new Date(), tz);
    const played = extractPlayedDays({ daySummaries: storage.getDaySummaries(), sessions: storage.getSessions() }, tz);
    const ds = computeDayStreak(played, todayKey);

    const selected = selectQuestSet({
      dateStr: getTodayStr(),
      streakStatus: ds.status,
      focusDomains: opts?.focusDomains,
      firstWeekFocus: opts?.firstWeekFocus,
      inFirstWeek: opts?.inFirstWeek,
      firstWeekDay: opts?.firstWeekDay
    });

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
      q.claimed = true;
      p.xp = (p.xp || 0) + (q.xpReward || 50);
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
          q.claimed = true;
          p.xp = (p.xp || 0) + (q.xpReward || 50);
          changed = true;
        }
      } else {
        q.progress += value;
        if (q.progress >= q.target) {
          q.progress = q.target;
          q.completed = true;
          q.claimed = true;
          p.xp = (p.xp || 0) + (q.xpReward || 50);
        }
        changed = true;
      }
    } else if (q.type === 'perfect' && type === 'accuracy' && value === 100) {
       q.progress += 1;
       if (q.progress >= q.target) {
           q.progress = q.target;
           q.completed = true;
           q.claimed = true;
           p.xp = (p.xp || 0) + (q.xpReward || 50);
       }
       changed = true;
    } else if (q.type === 'domain' && type === 'blocks' && exerciseId) {
       const m = getManifest(exerciseId);
       if (m && m.domain === q.domainId) {
         q.progress += 1;
         if (q.progress >= q.target) {
             q.progress = q.target;
             q.completed = true;
             q.claimed = true;
             p.xp = (p.xp || 0) + (q.xpReward || 50);
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
