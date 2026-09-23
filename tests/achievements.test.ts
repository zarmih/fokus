import { expect, test, beforeEach, describe } from 'vitest';
import { getAchievementsState, checkAchievements } from '../src/core/achievements';
import { storage } from '../src/core/storage';

describe('Achievements', () => {
  beforeEach(() => {
    storage.reset();
  });

  test('initial state has empty progress', () => {
    const state = getAchievementsState();
    expect(state.length).toBeGreaterThan(10);
    expect(state[0].progress).toBe(0);
  });

  test('unlocks achievements based on history', () => {
    storage.addHistory({ date: new Date().toISOString(), minutes: 10, score: 500, accuracy: 1, domainDeltas: {} });
    
    const unlocked = checkAchievements();
    expect(unlocked).toContain('first_session');
    
    const state = getAchievementsState();
    const first = state.find(a => a.id === 'first_session');
    expect(first?.progress).toBe(1);
    expect(first?.unlockedAt).toBeDefined();
  });
});
