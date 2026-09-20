import type { ExerciseState, SkillIndex, DomainIndex } from './types';
import { applySpacedDifficulty, type SpacingHistoryItem } from './spaced-difficulty';

export interface SpacingUpdateContext {
  recentItems?: Array<{
    exerciseId?: string;
    accuracy: number;
    difficulty?: number;
    difficultyAfter?: number;
    difficultyBefore?: number;
    level?: number;
  }>;
}

// PERFORMANCE MODEL

/**
 * Calculates a normalized performance score (0 - 1000) for a single block of an exercise.
 * Considers accuracy, reaction time, and the difficulty level the block was played at.
 */
export function calculateNormalizedPerformance(
  accuracy: number, 
  avgRtMs: number, 
  targetMs: number, 
  difficulty: number,
  model: 'speed-accuracy' | 'memory-span' | 'timing-precision' | 'logic-correctness' | 'sequence-accuracy' | 'capacity' = 'speed-accuracy'
): number {
  if (accuracy === 0) return 0;
  
  let rawPerformance = 0;
  const diffMultiplier = 1 + (difficulty - 1) * 0.15;
  
  if (model === 'speed-accuracy' || model === 'sequence-accuracy') {
    // Both speed and accuracy matter
    const speedFactor = avgRtMs > 0 ? Math.max(0.7, Math.min(1.2, targetMs / avgRtMs)) : 1.0;
    rawPerformance = accuracy * 100 * speedFactor * diffMultiplier * 5;
  } else if (model === 'memory-span' || model === 'capacity') {
    // Memory: speed is much less relevant. Accuracy and difficulty (which implies span length) matter most.
    rawPerformance = accuracy * 100 * diffMultiplier * 5.5; // Slightly higher base weight since speed doesn't boost it
  } else if (model === 'timing-precision') {
    // Timing: average Reaction Time (error) should be as close to 0 as possible. accuracy represents hit rate.
    // Here targetMs might represent the perfect timing window.
    const precisionFactor = avgRtMs > 0 ? Math.max(0.5, Math.min(1.5, targetMs / (avgRtMs + 1))) : 1.5;
    rawPerformance = accuracy * 100 * precisionFactor * diffMultiplier * 4;
  } else if (model === 'logic-correctness') {
    // Logic: correct decision is more important than pure speed, but speed is a tie-breaker.
    const speedFactor = avgRtMs > 0 ? Math.max(0.8, Math.min(1.1, targetMs / avgRtMs)) : 1.0;
    rawPerformance = accuracy * 100 * speedFactor * diffMultiplier * 5;
  }

  // Penalize heavily for very low accuracy (failure state)
  if (accuracy < 0.65) {
    rawPerformance *= 0.5;
  }
  
  // Smooth out outliers
  if (!Number.isFinite(rawPerformance) || Number.isNaN(rawPerformance)) rawPerformance = 0;

  return Math.max(0, Math.min(1500, rawPerformance));
}

// ADAPTIVE DIFFICULTY

export function updateExerciseState(
  state: ExerciseState, 
  accuracy: number, 
  avgRtMs: number, 
  targetMs: number,
  perf: number,
  spacing?: SpacingUpdateContext
): ExerciseState {
  // 1. Difficulty Controlled Progression
  let delta = 0;
  
  if (accuracy >= 0.95 && avgRtMs <= targetMs) {
    // Overshoot protection: max +0.5, but slows down at higher difficulty
    const maxJump = Math.max(0.1, 0.6 - (state.difficulty * 0.02));
    delta = maxJump; 
  } else if (accuracy >= 0.85 && avgRtMs <= targetMs * 1.2) {
    const maxJump = Math.max(0.1, 0.3 - (state.difficulty * 0.01));
    delta = maxJump;
  } else if (accuracy >= 0.75) {
    delta = 0.05; // Stable, tiny increase
  } else if (accuracy >= 0.65) {
    // Undershoot protection: don't drop drastically if stability is high
    const stabilityFactor = state.stability || 0;
    delta = stabilityFactor > 0.8 ? -0.1 : -0.3;
  } else {
    const stabilityFactor = state.stability || 0;
    delta = stabilityFactor > 0.8 ? -0.3 : -0.8;
  }
  
  let newDiff = Math.max(1.0, Math.min(30.0, state.difficulty + delta));

  // Optional spaced-difficulty cap (G10). No-op when caller omits context so
  // existing staircase tests and unmerged program PRs keep current behaviour.
  if (spacing) {
    const history: SpacingHistoryItem[] = (spacing.recentItems || [])
      .filter((item) => !item.exerciseId || item.exerciseId === state.exerciseId)
      .map((item) => ({
        accuracy: item.accuracy,
        difficulty:
          item.difficultyAfter ?? item.difficulty ?? item.difficultyBefore ?? item.level ?? 1
      }));
    newDiff = applySpacedDifficulty({
      currentDifficulty: state.difficulty,
      proposedDifficulty: newDiff,
      accuracy,
      history
    }).target;
  }
  
  // 2. Stability Calculation
  const oldPerf = state.performance;
  const perfRatio = oldPerf > 0 ? Math.min(perf, oldPerf) / Math.max(perf, oldPerf) : 0;
  // If ratio is near 1.0, stability grows towards 1.0. If low, drops.
  const newStability = ((state.stability || 0.5) * 0.7) + (perfRatio * 0.3);
  
  // 3. Plateau Detection
  let plateau = state.consecutivePlateau || 0;
  if (Math.abs(delta) < 0.1 && newStability > 0.8) {
    plateau += 1;
  } else {
    plateau = 0;
  }

  // 4. Mastery Calculation
  // Mastery = (performance / max_perf) * 0.4 + (difficulty / max_diff) * 0.4 + stability * 0.2
  // Capped at 100
  const maxExpectedPerf = 1200; 
  const maxExpectedDiff = 25.0;
  const perfComponent = Math.min(1.0, perf / maxExpectedPerf);
  const diffComponent = Math.min(1.0, newDiff / maxExpectedDiff);
  
  const rawMastery = (perfComponent * 0.4 + diffComponent * 0.4 + newStability * 0.2) * 100;
  
  // Confidence dampens mastery initially
  const attempts = (state.attempts || 0) + 1;
  const confidence = Math.min(1.0, attempts / 15);
  const mastery = Math.round(rawMastery * confidence);
  
  return {
    ...state,
    difficulty: newDiff,
    level: Math.floor(newDiff),
    performance: perf,
    lastPlayedAt: new Date().toISOString(),
    lastAccuracy: accuracy,
    attempts,
    stability: newStability,
    consecutivePlateau: plateau,
    mastery
  };
}

// PROFILE UPDATES

export function updateSkillIndex(current: SkillIndex | undefined, skillId: string, performance: number, exerciseId: string): SkillIndex {
  if (!current) {
    return {
      skill: skillId,
      value: performance,
      trend: 0,
      confidence: 5,
      attempts: 1,
      lastUpdated: new Date().toISOString(),
      sources: [exerciseId]
    };
  }
  
  const alpha = Math.max(0.1, 0.4 - (current.attempts * 0.01));
  const newValue = current.value + alpha * (performance - current.value);
  const smoothedTrend = current.trend * 0.7 + (newValue - current.value) * 0.3;
  
  const sources = current.sources ? [...new Set([...current.sources, exerciseId])] : [exerciseId];
  const attempts = current.attempts + 1;
  
  // Base confidence from evidence amount (asymptotic curve)
  const evidenceConfidence = 100 * (1 - Math.exp(-attempts / 12)); 
  
  // Diversity determines the ceiling
  const diversityMultiplier = sources.length === 1 ? 0.70 : (sources.length === 2 ? 0.90 : 1.0);
  
  // Stability dampens confidence if there are large swings
  const stabilityFactor = 1.0 - Math.min(0.15, Math.abs(smoothedTrend) / 500);
  
  const newConfidence = Math.min(100, Math.round(evidenceConfidence * diversityMultiplier * stabilityFactor));
  
  return {
    ...current,
    value: newValue,
    trend: smoothedTrend,
    confidence: newConfidence,
    attempts,
    lastUpdated: new Date().toISOString(),
    sources
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
  const smoothedTrend = (current.trend || 0) * 0.7 + (newValue - current.value) * 0.3;
  
  return {
    ...current,
    value: newValue,
    trend: smoothedTrend,
    updatedAt: new Date().toISOString()
  };
}

export function initializeExerciseStateFromCalibration(exerciseId: string, level: number, perf: number): ExerciseState {
  return {
    exerciseId,
    level,
    difficulty: level,
    performance: perf,
    lastPlayedAt: new Date().toISOString(),
    lastAccuracy: 0,
    attempts: 1,
    stability: 0.5,
    consecutivePlateau: 0,
    mastery: Math.round(Math.min(1.0, perf / 1200) * 0.4 * 100 * 0.1) // 0.1 confidence dampening for calibration
  };
}

export function initializeSkillFromCalibration(skillId: string, perf: number, exerciseId: string): SkillIndex {
  return {
    skill: skillId,
    value: perf,
    trend: 0,
    confidence: 15, // moderate/low confidence for one-time baseline calibration
    attempts: 1,
    lastUpdated: new Date().toISOString(),
    sources: [exerciseId]
  };
}
