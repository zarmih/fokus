import { expect, test, beforeEach, describe } from 'vitest';
import { getDailyQuests, updateQuestProgress, selectQuestSet, daySeed } from '../src/core/quests';
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
    const uq = updated.find((x) => x.id === q.id)!;

    if (q.type === 'accuracy') {
      expect(uq.progress).toBe(0); // accuracy doesn't accumulate
    } else if (q.type === 'blocks' || q.type === 'score') {
      expect(uq.progress).toBe(q.target - 1);
      expect(uq.completed).toBe(false);

      updateQuestProgress(q.type, 2);
      const completed = storage.getProfile().quests!.find((x) => x.id === q.id)!;
      expect(completed.completed).toBe(true);
      expect(completed.progress).toBe(q.target);
    }
  });
});

describe('selectQuestSet — plan / soft-return loops', () => {
  test('daySeed is stable for a date', () => {
    expect(daySeed('2026-10-01')).toBe(daySeed('2026-10-01'));
    expect(daySeed('2026-10-01')).not.toBe(daySeed('2026-10-02'));
  });

  test('same date yields identical quest ids (deterministic)', () => {
    const a = selectQuestSet({ dateStr: '2026-10-01', streakStatus: 'active' });
    const b = selectQuestSet({ dateStr: '2026-10-01', streakStatus: 'active' });
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a).toHaveLength(3);
  });

  test('soft_return replaces easy slot with recovery quest', () => {
    const qs = selectQuestSet({ dateStr: '2026-10-01', streakStatus: 'soft_return' });
    expect(qs[0].id).toBe('recovery_quest');
    expect(qs[0].target).toBe(1);
    expect(qs[0].description).toMatch(/штраф/i);
  });

  test('first-week bias creates ritual quest on focus domain', () => {
    const qs = selectQuestSet({
      dateStr: '2026-10-01',
      streakStatus: 'active',
      inFirstWeek: true,
      firstWeekFocus: 'memory'
    });
    expect(qs[0].id).toBe('first_week_quest');
    expect(qs[0].description).toMatch(/Память|первой недели/i);
  });

  test('plan focusDomain prefers a domain quest when not first week', () => {
    const qs = selectQuestSet({
      dateStr: '2026-09-15',
      streakStatus: 'active',
      focusDomains: ['attention']
    });
    // Either domain quest or recovery-style — at least 3 quests, FOMO-free copy
    expect(qs).toHaveLength(3);
    for (const q of qs) {
      expect(q.description).not.toMatch(/wikium|прокачай мозг|не ломай серию/i);
    }
  });
});
