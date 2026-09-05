import { expect, test, describe } from 'vitest';
import { mapAccuracyToStartLevel } from '../src/core/calibration';
import { initializeExerciseStateFromCalibration, initializeSkillFromCalibration } from '../src/core/adaptive';

test('mapAccuracyToStartLevel', () => {
  expect(mapAccuracyToStartLevel(0.9)).toBe(5);
  expect(mapAccuracyToStartLevel(0.8)).toBe(5);
  expect(mapAccuracyToStartLevel(0.6)).toBe(3.0);
  expect(mapAccuracyToStartLevel(0.5)).toBe(3.0);
  expect(mapAccuracyToStartLevel(0.4)).toBe(1.5);
  expect(mapAccuracyToStartLevel(0)).toBe(1.5);
});

describe('Calibration Initialization', () => {
  test('initializeExerciseStateFromCalibration returns canonical state with dampening', () => {
    const state = initializeExerciseStateFromCalibration('test-ex', 3, 600);
    expect(state.exerciseId).toBe('test-ex');
    expect(state.level).toBe(3);
    expect(state.difficulty).toBe(3);
    expect(state.performance).toBe(600);
    expect(state.attempts).toBe(1);
    expect(state.stability).toBe(0.5);
    expect(state.consecutivePlateau).toBe(0);
    expect(state.mastery).toBeGreaterThan(0);
    expect(state.mastery).toBeLessThan(10); // Dampened by 0.1 for calibration (0.5 * 0.4 * 100 * 0.1 = 2)
  });

  test('initializeSkillFromCalibration returns canonical skill with sources and low confidence', () => {
    const skill = initializeSkillFromCalibration('test-skill', 500, 'test-ex');
    expect(skill.skill).toBe('test-skill');
    expect(skill.value).toBe(500);
    expect(skill.trend).toBe(0);
    expect(skill.attempts).toBe(1);
    expect(skill.confidence).toBe(15); // Calibration is low confidence
    expect(skill.sources).toEqual(['test-ex']);
  });
});
