import { expect, test } from 'vitest';
import { calculateNormalizedPerformance, updateExerciseState, updateSkillIndex, updateDomainIndex } from '../src/core/adaptive';
import { buildTrainingPlan } from '../src/core/session-builder';
import type { DomainIndex, ExerciseState, Profile, SkillIndex } from '../src/core/types';
import { registry } from '../src/exercises/registry';

// FOKUS MASTERY & INTELLIGENCE SIMULATION

test('30-Day Multi-Day Simulation: Steady Improvement', () => {
  const profile: Profile = {
    name: 'Sim User',
    xp: 0,
    sessionLengthSec: 300,
    theme: 'dark',
    locale: 'ru',
    schemaVersion: 1,
    primaryGoal: 'memory',
    calibrated: true,
    soundOn: true,
    createdAt: new Date().toISOString()
  };
  
  const states: ExerciseState[] = [];
  const skills: SkillIndex[] = [];
  const domains: DomainIndex[] = [];
  
  // Day 0: Setup Baseline (e.g. 600 baseline performance)
  registry.forEach(ex => {
    states.push({
      exerciseId: ex.manifest.id,
      level: 1,
      difficulty: 1.5,
      performance: 500,
      lastPlayedAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
      lastAccuracy: 0.5
    });
  });

  const logs = [];

  // Run 30 days
  let currentDate = new Date('2026-09-01T10:00:00Z');
  for (let day = 1; day <= 30; day++) {
    currentDate.setDate(currentDate.getDate() + 1);
    
    const plan = buildTrainingPlan({
      durationSec: 300,
      catalog: registry as any,
      domains,
      skills,
      states,
      primaryGoal: profile.primaryGoal
    });
    
    // User plays the plan with steady improvement
    plan.items.forEach(item => {
      const stateIdx = states.findIndex(s => s.exerciseId === item.exerciseId);
      const state = states[stateIdx];
      const ex = registry.find(r => r.manifest.id === item.exerciseId)!;
      
      // Steady improvement: 85-95% accuracy, good speed
      const simAccuracy = 0.85 + (Math.random() * 0.1);
      const simRt = 1400; // decent speed
      
      const perf = calculateNormalizedPerformance(simAccuracy, simRt, 1500, state.difficulty, ex.manifest.metricModel);
      
      const newState = updateExerciseState(state, simAccuracy, simRt, 1500, perf);
      Object.assign(state, newState);
      
      ex.manifest.skills.forEach(sk => {
        const sIdx = skills.findIndex(s => s.skill === sk);
        const newSk = updateSkillIndex(sIdx >= 0 ? skills[sIdx] : undefined, sk, perf, item.exerciseId);
        if (sIdx >= 0) skills[sIdx] = newSk;
        else skills.push(newSk);
      });
      
      const dIdx = domains.findIndex(d => d.domain === ex.manifest.domain);
      const newD = updateDomainIndex(dIdx >= 0 ? domains[dIdx] : undefined, ex.manifest.domain, perf);
      if (dIdx >= 0) domains[dIdx] = newD;
      else domains.push(newD);
    });
    
    if (day === 1 || day === 7 || day === 30) {
      logs.push(`\n=== DAY ${day} ===`);
      logs.push(`Memory Domain: ${domains.find(d => d.domain === 'memory')?.value.toFixed(0) || 0}`);
      logs.push(`Grid Memory Diff: ${states.find(s => s.exerciseId === 'grid-memory')?.difficulty.toFixed(2)}`);
      logs.push(`Pattern Next Diff: ${states.find(s => s.exerciseId === 'pattern-next')?.difficulty.toFixed(2)}`);
    }
  }
  
  // Make sure difficulty doesn't go to infinity or jump unrealistically
  const gridMemory = states.find(s => s.exerciseId === 'grid-memory')!;
  expect(gridMemory.difficulty).toBeGreaterThan(1.5);
  expect(gridMemory.difficulty).toBeLessThan(30.0);
  
  console.log(logs.join('\n'));
});
