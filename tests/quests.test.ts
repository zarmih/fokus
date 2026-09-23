import { expect, test, beforeEach, describe } from 'vitest';
import { getDailyQuests, updateQuestProgress } from '../src/core/quests';
import { storage } from '../src/core/storage';

describe('Quests', () => {
  beforeEach(() => {
    storage.reset();
  });

  test('generates daily quests', () => {
    const quests = getDailyQuests();
    expect(quests.length).toBe(3);
    expect(quests[0].progress).toBe(0);
    expect(quests[0].completed).toBe(false);
  });

  test('updates quest progress incrementally', () => {
    const quests = getDailyQuests();
    const q = quests[0];
    updateQuestProgress(q.type, q.target - 1);
    
    const updated = storage.getProfile().quests!;
    const uq = updated.find(x => x.id === q.id)!;
    
    if (q.type === 'accuracy') {
      expect(uq.progress).toBe(0); // accuracy doesn't accumulate
    } else if (q.type === 'blocks' || q.type === 'score') {
      expect(uq.progress).toBe(q.target - 1);
      expect(uq.completed).toBe(false);
      
      updateQuestProgress(q.type, 2);
      const completed = storage.getProfile().quests!.find(x => x.id === q.id)!;
      expect(completed.completed).toBe(true);
      expect(completed.progress).toBe(q.target);
    }
  });
});
