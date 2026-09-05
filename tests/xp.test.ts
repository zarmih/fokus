import { expect, test } from 'vitest';
import { getLevelFromXP, getXPForLevel, getLevelProgress } from '../src/core/xp';

test('XP calculation logic', () => {
  // Lvl 1: 0 XP
  expect(getLevelFromXP(0)).toBe(1);
  expect(getXPForLevel(1)).toBe(0);

  // Lvl 2: 500 * 1 * 2 = 1000
  expect(getXPForLevel(2)).toBe(1000);
  expect(getLevelFromXP(1000)).toBe(2);
  expect(getLevelFromXP(999)).toBe(1);

  // Lvl 3: 500 * 2 * 3 = 3000
  expect(getXPForLevel(3)).toBe(3000);
  expect(getLevelFromXP(3000)).toBe(3);
  expect(getLevelFromXP(1500)).toBe(2);

  // Progress
  const p1 = getLevelProgress(500);
  expect(p1.currentLevel).toBe(1);
  expect(p1.currentXP).toBe(500);
  expect(p1.nextLevelXP).toBe(1000);
  expect(p1.progressPct).toBe(50);

  const p2 = getLevelProgress(2000);
  expect(p2.currentLevel).toBe(2);
  expect(p2.currentXP).toBe(2000);
  expect(p2.nextLevelXP).toBe(3000);
  expect(p2.progressPct).toBe(50);
});
