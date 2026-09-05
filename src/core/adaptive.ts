export function calculateNextLevel(currentLevel: number, accuracy: number, avgRtMs: number, targetMs: number, minLevel: number = 1): number {
  let change = 0;
  if (accuracy >= 0.85 && avgRtMs <= targetMs) change = 1;
  else if (accuracy < 0.65) change = -1;
  return Math.max(minLevel, currentLevel + change);
}
