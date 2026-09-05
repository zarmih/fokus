import type { ExerciseState, SkillIndex, DomainIndex } from './types';

// PERFORMANCE MODEL

/**
 * Calculates a normalized performance score (0 - 1000) for a single block of an exercise.
 * Considers accuracy, reaction time, and the difficulty level the block was played at.
 */
export function calculateNormalizedPerformance(accuracy: number, avgRtMs: number, targetMs: number, difficulty: number): number {
  if (accuracy === 0) return 0;
  
  // Speed factor: 1.0 means exactly target time. Max 1.2 for faster, Min 0.7 for slower.
  const speedFactor = avgRtMs > 0 ? Math.max(0.7, Math.min(1.2, targetMs / avgRtMs)) : 1.0;
  
  // Accuracy is the most important factor
  let baseScore = accuracy * 100 * speedFactor;
  
  // Difficulty multiplier: higher difficulty yields higher potential performance
  // Difficulty goes from 1.0 to 20.0 (or more)
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.15;
  
  let rawPerformance = baseScore * difficultyMultiplier * 5; // scaled to be roughly 0-1000+
  
  // Penalize heavily for very low accuracy (failure state)
  if (accuracy < 0.65) {
    rawPerformance *= 0.5;
  }
  
  return Math.max(0, Math.min(1500, rawPerformance));
}

// ADAPTIVE DIFFICULTY

/**
 * Calculates the next difficulty level based on current difficulty and block performance.
 * @param currentDifficulty current float difficulty (e.g. 3.2)
 * @param accuracy 0-1
 * @param avgRtMs reaction time
 * @param targetMs target reaction time
 */
export function calculateNextDifficulty(currentDifficulty: number, accuracy: number, avgRtMs: number, targetMs: number): number {
  let delta = 0;
  
  if (accuracy >= 0.95 && avgRtMs <= targetMs) {
    delta = 0.8; // Excellent, jump up
  } else if (accuracy >= 0.85 && avgRtMs <= targetMs * 1.2) {
    delta = 0.4; // Good, step up
  } else if (accuracy >= 0.75) {
    delta = 0.1; // Stable, tiny increase
  } else if (accuracy >= 0.65) {
    delta = -0.3; // Struggling, step down
  } else {
    delta = -0.8; // Failed, drop down significantly
  }
  
  return Math.max(1.0, Math.min(30.0, currentDifficulty + delta));
}

// PROFILE UPDATES

export function updateSkillIndex(current: SkillIndex | undefined, skillId: string, performance: number): SkillIndex {
  if (!current) {
    return {
      skill: skillId,
      value: performance,
      trend: 0,
      confidence: 1,
      attempts: 1,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Alpha depends on confidence (attempts). More attempts = slower changes
  const alpha = Math.max(0.1, 0.4 - (current.attempts * 0.01));
  const newValue = current.value + alpha * (performance - current.value);
  
  return {
    ...current,
    value: newValue,
    trend: newValue - current.value,
    confidence: Math.min(100, current.confidence + 5),
    attempts: current.attempts + 1,
    lastUpdated: new Date().toISOString()
  };
}

export function updateDomainIndex(current: DomainIndex | undefined, domainId: string, performance: number): DomainIndex {
  if (!current) {
    return {
      domain: domainId,
      value: performance,
      trend: 0,
      updatedAt: new Date().toISOString()
    };
  }
  
  const alpha = 0.15; // Domains update slower than individual skills
  const newValue = current.value + alpha * (performance - current.value);
  
  return {
    ...current,
    value: newValue,
    trend: newValue - current.value,
    updatedAt: new Date().toISOString()
  };
}
