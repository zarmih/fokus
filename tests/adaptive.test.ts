import { expect, test } from 'vitest';
import { updateExerciseState, calculateNormalizedPerformance, updateDomainIndex, updateSkillIndex } from '../src/core/adaptive';

test('adaptive difficulty increase', () => {
  const state = { exerciseId: 'test', level: 3, difficulty: 3.0, performance: 500, lastPlayedAt: '', lastAccuracy: 0.8 };
  const next = updateExerciseState(state, 0.96, 1000, 1500, 600);
  expect(next.difficulty).toBeGreaterThan(3.0);
});
test('adaptive difficulty drop on fail', () => {
  const state = { exerciseId: 'test', level: 3, difficulty: 3.0, performance: 500, lastPlayedAt: '', lastAccuracy: 0.8 };
  const next = updateExerciseState(state, 0.5, 1000, 1500, 200);
  expect(next.difficulty).toBeLessThan(3.0);
});
test('optional spacing context holds a peak hard-success', () => {
  const state = { exerciseId: 'stroop', level: 8, difficulty: 8.0, performance: 900, lastPlayedAt: '', lastAccuracy: 0.92 };
  const plain = updateExerciseState(state, 0.96, 800, 1500, 900);
  expect(plain.difficulty).toBeGreaterThan(8.0);
  const spaced = updateExerciseState(state, 0.96, 800, 1500, 900, { recentItems: [] });
  expect(spaced.difficulty).toBeLessThan(plain.difficulty);
  expect(spaced.difficulty).toBeLessThan(8.0);
});
test('performance calculation', () => {
  const perfGood = calculateNormalizedPerformance(1.0, 1000, 1500, 5);
  const perfBad = calculateNormalizedPerformance(0.5, 2000, 1500, 5);
  expect(perfGood).toBeGreaterThan(perfBad);
});
test('update domain index', () => {
  const next = updateDomainIndex(undefined, 'memory', 500);
  expect(next.domain).toBe('memory');
  expect(next.value).toBe(500);
});
test('update skill index', () => {
  const next = updateSkillIndex(undefined, 'visual_memory', 500, 'grid-memory');
  expect(next.skill).toBe('visual_memory');
  expect(next.value).toBe(500);
  expect(next.attempts).toBe(1);
});
test('skill confidence bounded and asymptotic', () => {
  let skill = updateSkillIndex(undefined, 'visual_memory', 500, 'grid-memory');
  expect(skill.confidence).toBeGreaterThan(0);
  
  // Repeated plays of the same exercise
  for (let i = 0; i < 20; i++) {
    skill = updateSkillIndex(skill, 'visual_memory', 550, 'grid-memory');
  }
  const confidenceOneSource = skill.confidence;
  expect(confidenceOneSource).toBeLessThanOrEqual(70); // 1 source limit is 70%
  
  // Play a different exercise for the same skill
  skill = updateSkillIndex(skill, 'visual_memory', 600, 'pattern-next');
  expect(skill.sources!.length).toBe(2);
  const confidenceTwoSources = skill.confidence;
  expect(confidenceTwoSources).toBeGreaterThan(confidenceOneSource);
  expect(confidenceTwoSources).toBeLessThanOrEqual(90); // 2 sources limit is 90%
  
  // Add a third source
  skill = updateSkillIndex(skill, 'visual_memory', 600, 'third-ex');
  expect(skill.sources!.length).toBe(3);
  expect(skill.confidence).toBeGreaterThan(confidenceTwoSources);
  expect(skill.confidence).toBeLessThanOrEqual(100);
});
