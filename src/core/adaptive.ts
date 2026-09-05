import type { DomainIndex } from './types';

export function calculateNextLevel(currentLevel: number, accuracy: number, avgRtMs: number, targetMs: number, minLevel: number = 1, maxLevel: number = 20): number {
  let change = 0;
  if (accuracy >= 0.85 && avgRtMs <= targetMs) {
    change = 1;
  } else if (accuracy < 0.65) {
    change = -1;
  }
  return Math.min(maxLevel, Math.max(minLevel, currentLevel + change));
}

export function updateDomainIndex(currentIndex: number, accuracy: number, level: number, alpha: number = 0.3): number {
  const levelFactor = level * 10;
  let performance = accuracy * 100 + levelFactor;
  if (accuracy < 0.65) {
    performance *= 0.5; // penalize on fail
  }
  return currentIndex + alpha * (performance - currentIndex);
}
