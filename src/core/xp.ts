// Constants for XP calculation
// Each level requires progressively more XP.
// Lvl 1: 0 XP
// Lvl 2: 1000 XP
// Lvl 3: 2500 XP
// Lvl 4: 4500 XP
// Formula: requiredXP = 500 * (level - 1) * (level)

export function getLevelFromXP(xp: number): number {
  if (xp < 0) return 1;
  // Solving 500 * L^2 - 500 * L - xp = 0
  // L = (500 + sqrt(250000 + 2000 * xp)) / 1000
  const l = (500 + Math.sqrt(250000 + 2000 * xp)) / 1000;
  return Math.floor(l);
}

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return 500 * (level - 1) * level;
}

export function getLevelProgress(xp: number): { currentLevel: number; currentXP: number; nextLevelXP: number; progressPct: number } {
  const currentLevel = getLevelFromXP(xp);
  const baseXP = getXPForLevel(currentLevel);
  const nextXP = getXPForLevel(currentLevel + 1);
  const currentXPInLevel = xp - baseXP;
  const xpNeededForNext = nextXP - baseXP;
  const progressPct = xpNeededForNext > 0 ? (currentXPInLevel / xpNeededForNext) * 100 : 0;
  
  return {
    currentLevel,
    currentXP: xp,
    nextLevelXP: nextXP,
    progressPct: Math.min(100, Math.max(0, progressPct))
  };
}
