import { storage } from './storage';
import { registry } from '../exercises/registry';
import { ExerciseState, SkillIndex, DomainIndex } from './types';

export function getExerciseIntelligence(exerciseId: string) {
  const state = storage.getExerciseStates().find(s => s.exerciseId === exerciseId);
  const manifest = registry.find(r => r.manifest.id === exerciseId)?.manifest;
  
  if (!state || !manifest) {
    return { isCalibrating: true, mastery: 0, difficulty: 1, attempts: 0, skills: [] };
  }

  // Determine if calibrating
  const skills = storage.getSkills().filter(s => manifest.skills.includes(s.skill as any));
  const avgConfidence = skills.length ? skills.reduce((acc, s) => acc + s.confidence, 0) / skills.length : 0;
  
  const isCalibrating = (state.attempts || 0) < 3 || avgConfidence < 15;
  
  return {
    isCalibrating,
    mastery: Math.round(state.mastery || 0),
    difficulty: state.difficulty.toFixed(1),
    attempts: state.attempts || 0,
    plateau: (state.consecutivePlateau || 0) >= 3,
    skills: skills.map(s => ({
      name: s.skill,
      value: Math.round(s.value),
      confidence: Math.round(s.confidence),
      trend: s.trend
    }))
  };
}
