import { expect, test } from 'vitest';
import { calculateNormalizedPerformance, updateExerciseState, updateSkillIndex, updateDomainIndex } from '../src/core/adaptive';
import { buildTrainingPlan } from '../src/core/session-builder';
import type { SkillIndex, DomainIndex, ExerciseState } from '../src/core/types';
import { registry } from '../src/exercises/registry';

// Mock registry mapping
const catalog = registry.map(ex => ({ manifest: ex.manifest }));

test('Scenario A: Fresh user gets baseline-like balanced plan', () => {
  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains: [],
    skills: [],
    states: [],
    primaryGoal: 'balance'
  });
  
  // With no data, domains are empty, so focusDomains is empty. It should pick exploration reasons.
  expect(plan.focusDomains.length).toBe(0);
  expect(plan.items.length).toBe(3); // 5 min
  expect(plan.items[0].reason).toBe('Тренировка отстающего навыка');
});

test('Scenario B: Weak Memory user', () => {
  const domains: DomainIndex[] = [
    { domain: 'memory', value: 200, trend: 0, updatedAt: '' },
    { domain: 'attention', value: 800, trend: 0, updatedAt: '' },
    { domain: 'speed', value: 700, trend: 0, updatedAt: '' }
  ];
  
  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains,
    skills: [],
    states: [],
    primaryGoal: 'balance'
  });
  
  expect(plan.focusDomains).toContain('memory');
  
  // First item should be weakest domain (memory)
  const firstEx = catalog.find(c => c.manifest.id === plan.items[0].exerciseId);
  expect(firstEx?.manifest.domain).toBe('memory');
  expect(plan.items[0].reason).toContain('Подтягиваем слабую зону');
});

test('Scenario C: User Goal Change', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.9; // disable exploration randomness for this test
  
  const domains: DomainIndex[] = [
    { domain: 'memory', value: 500, trend: 0, updatedAt: '' },
    { domain: 'attention', value: 500, trend: 0, updatedAt: '' }
  ];
  const plan1 = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains,
    skills: [],
    states: [],
    primaryGoal: 'memory'
  });
  const plan2 = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains,
    skills: [],
    states: [],
    primaryGoal: 'attention'
  });
  
  const firstEx1 = catalog.find(c => c.manifest.id === plan1.items[0].exerciseId);
  expect(firstEx1?.manifest.domain).toBe('memory');
  
  const firstEx2 = catalog.find(c => c.manifest.id === plan2.items[0].exerciseId);
  expect(firstEx2?.manifest.domain).toBe('attention');
  
  Math.random = originalRandom;
});

test('Scenario D: Normalization tests', () => {
  // Excellent
  const perfExc = calculateNormalizedPerformance(1.0, 500, 1500, 5.0);
  // Average
  const perfAvg = calculateNormalizedPerformance(0.8, 1500, 1500, 5.0);
  // Poor
  const perfPoor = calculateNormalizedPerformance(0.5, 3000, 1500, 5.0);
  
  expect(perfExc).toBeGreaterThan(perfAvg);
  expect(perfAvg).toBeGreaterThan(perfPoor);
  
  // No NaN or Infinity
  const perfFastZero = calculateNormalizedPerformance(1.0, 1, 1500, 5.0);
  expect(perfFastZero).toBeLessThanOrEqual(1500); // capped at speedFactor 1.2
  expect(Number.isFinite(perfFastZero)).toBe(true);
});

test('Scenario E: Difficulty change', () => {
  const state = { exerciseId: 'test', level: 3, difficulty: 3.0, performance: 500, lastPlayedAt: '', lastAccuracy: 0.8 };
  const next = updateExerciseState(state, 0.5, 2000, 1500, 300);
  expect(next.difficulty).toBeLessThan(3.0);
  
  const next2 = updateExerciseState(state, 0.98, 1000, 1500, 800);
  expect(next2.difficulty).toBeGreaterThan(3.0);
});

test('Scenario F: Skill Update Aggregation', () => {
  const initSkill: SkillIndex = { skill: 'visual_memory', value: 500, attempts: 1, confidence: 10, trend: 0, lastUpdated: '' };
  
  // Result 800 shouldn't jump to 800
  const nextSkill = updateSkillIndex(initSkill, 'visual_memory', 800, 'test-exercise');
  expect(nextSkill.value).toBeGreaterThan(500);
  expect(nextSkill.value).toBeLessThan(800);
  
  // Confidence is calculated deterministically based on attempts and sources
  expect(nextSkill.confidence).toBeGreaterThan(0);
});
