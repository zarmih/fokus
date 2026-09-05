import { expect, test, vi, beforeEach } from 'vitest';
import { getExerciseIntelligence } from '../src/core/selectors';
import { storage } from '../src/core/storage';

vi.mock('../src/core/storage', () => ({
  storage: {
    getExerciseStates: vi.fn(),
    getSkills: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('getExerciseIntelligence returns calibration state when no state or confidence is low', () => {
  // Empty state
  (storage.getExerciseStates as any).mockReturnValue([]);
  (storage.getSkills as any).mockReturnValue([]);
  
  const int1 = getExerciseIntelligence('grid-memory');
  expect(int1.isCalibrating).toBe(true);

  // Partial state, low confidence
  (storage.getExerciseStates as any).mockReturnValue([{
    exerciseId: 'grid-memory',
    level: 1,
    difficulty: 1,
    performance: 500,
    lastPlayedAt: '',
    lastAccuracy: 0.5,
    attempts: 2
  }]);
  (storage.getSkills as any).mockReturnValue([{ skill: 'visual_memory', confidence: 5 }]);

  const int2 = getExerciseIntelligence('grid-memory');
  expect(int2.isCalibrating).toBe(true);
});

test('getExerciseIntelligence returns mastery data when calibrated', () => {
  (storage.getExerciseStates as any).mockReturnValue([{
    exerciseId: 'grid-memory',
    level: 1,
    difficulty: 2.5,
    performance: 600,
    lastPlayedAt: '',
    lastAccuracy: 0.9,
    attempts: 10,
    mastery: 75,
    consecutivePlateau: 0
  }]);
  (storage.getSkills as any).mockReturnValue([{ skill: 'visual_memory', confidence: 25, value: 600, trend: 1 }]);

  const int = getExerciseIntelligence('grid-memory');
  expect(int.isCalibrating).toBe(false);
  expect(int.mastery).toBe(75);
  expect(int.difficulty).toBe('2.5');
  expect(int.plateau).toBe(false);
  expect(int.skills[0].name).toBe('visual_memory');
});

test('getExerciseIntelligence returns progression states correctly', () => {
  const baseState = {
    exerciseId: 'grid-memory',
    level: 1,
    difficulty: 2.5,
    performance: 600,
    lastPlayedAt: '',
    lastAccuracy: 0.9,
    attempts: 10,
    mastery: 50,
    consecutivePlateau: 0,
    stability: 0.5
  };
  
  // Developing
  (storage.getExerciseStates as any).mockReturnValue([{...baseState}]);
  (storage.getSkills as any).mockReturnValue([{ skill: 'visual_memory', confidence: 25, value: 600, trend: 1 }]);
  expect(getExerciseIntelligence('grid-memory').state).toBe('DEVELOPING');

  // Plateau
  (storage.getExerciseStates as any).mockReturnValue([{...baseState, consecutivePlateau: 3}]);
  expect(getExerciseIntelligence('grid-memory').state).toBe('PLATEAU');

  // Stable
  (storage.getExerciseStates as any).mockReturnValue([{...baseState, mastery: 85, stability: 0.85}]);
  expect(getExerciseIntelligence('grid-memory').state).toBe('STABLE');

  // Challenge
  (storage.getExerciseStates as any).mockReturnValue([{...baseState, mastery: 75, difficulty: 5.5}]);
  expect(getExerciseIntelligence('grid-memory').state).toBe('CHALLENGE');
});
