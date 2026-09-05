import { expect, test } from 'vitest';
import { calculateNormalizedPerformance, updateExerciseState, updateSkillIndex, updateDomainIndex } from '../src/core/adaptive';
import { buildTrainingPlan } from '../src/core/session-builder';
import type { DomainIndex, ExerciseState, SkillIndex } from '../src/core/types';
import { registry } from '../src/exercises/registry';

// FOKUS MASTERY & INTELLIGENCE SIMULATION

class SimulatedUser {
  states: ExerciseState[] = [];
  skills: SkillIndex[] = [];
  domains: DomainIndex[] = [];
  currentDate = new Date('2026-09-01T10:00:00Z');

  constructor(public profileModel: Record<string, number>) {
    registry.forEach(ex => {
      this.states.push({
        exerciseId: ex.manifest.id,
        level: 1,
        difficulty: 1.0,
        performance: 500,
        lastPlayedAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
        lastAccuracy: 0.5,
        mastery: 0,
        stability: 0.5,
        consecutivePlateau: 0,
        attempts: 1
      });
      
      if (!this.domains.find(d => d.domain === ex.manifest.domain)) {
        this.domains.push({ domain: ex.manifest.domain, value: 500, trend: 0, updatedAt: new Date().toISOString() });
      }
      
      ex.manifest.skills.forEach(sk => {
        if (!this.skills.find(s => s.skill === sk)) {
          this.skills.push({ skill: sk, value: 500, trend: 0, confidence: 15, attempts: 1, lastUpdated: new Date().toISOString(), sources: [] });
        }
      });
    });
  }

  simulateDay() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    
    // Artificially age lastPlayedAt to reflect passing time
    this.states.forEach(s => {
      // Just subtract some time to ensure repetition penalty doesn't block daily sessions
      s.lastPlayedAt = new Date(this.currentDate.getTime() - 24*60*60*1000).toISOString();
    });

    const plan = buildTrainingPlan({
      durationSec: 300,
      catalog: registry as any,
      domains: this.domains,
      skills: this.skills,
      states: this.states,
      primaryGoal: 'balance' // balanced so we can see purely algorithmic divergence
    });
    
    plan.items.forEach(item => {
      const stateIdx = this.states.findIndex(s => s.exerciseId === item.exerciseId);
      const state = this.states[stateIdx];
      const ex = registry.find(r => r.manifest.id === item.exerciseId)!;
      
      // Determine simulated performance based on latent profile model
      const ability = this.profileModel[ex.manifest.domain] || 0.5;
      
      // A strong ability yields high accuracy (0.85-0.95), weak ability yields low accuracy (0.4-0.6)
      // but scales down if difficulty increases far beyond ability
      let effectiveAbility = ability - (state.difficulty - 1.0) * 0.05;
      effectiveAbility = Math.max(0.1, Math.min(0.98, effectiveAbility));

      const simAccuracy = effectiveAbility;
      const simRt = 1500;
      
      const perf = calculateNormalizedPerformance(simAccuracy, simRt, 1500, state.difficulty, ex.manifest.metricModel);
      const newState = updateExerciseState(state, simAccuracy, simRt, 1500, perf);
      this.states[stateIdx] = newState;
      
      ex.manifest.skills.forEach(sk => {
        const sIdx = this.skills.findIndex(s => s.skill === sk);
        this.skills[sIdx] = updateSkillIndex(this.skills[sIdx], sk, perf, item.exerciseId);
      });
      
      const dIdx = this.domains.findIndex(d => d.domain === ex.manifest.domain);
      this.domains[dIdx] = updateDomainIndex(this.domains[dIdx], ex.manifest.domain, perf);
    });
    
    return plan;
  }
}


test('30-Day Multi-Day Simulation: Divergence of Plans for Different Latent Profiles', () => {
  // User A: Strong memory, weak attention
  const userA = new SimulatedUser({
    'memory': 0.95,
    'attention': 0.40,
    'logic': 0.60,
    'speed': 0.60,
    'flexibility': 0.60
  });

  // User B: Weak memory, strong attention
  const userB = new SimulatedUser({
    'memory': 0.40,
    'attention': 0.95,
    'logic': 0.60,
    'speed': 0.60,
    'flexibility': 0.60
  });

  // Run 30 days
  let planA, planB;
  for (let day = 1; day <= 30; day++) {
    planA = userA.simulateDay();
    planB = userB.simulateDay();
  }

  // After 30 days, their domains should reflect their latent abilities
  const memA = userA.domains.find(d => d.domain === 'memory')!.value;
  const memB = userB.domains.find(d => d.domain === 'memory')!.value;
  expect(memA).toBeGreaterThan(memB);

  const attA = userA.domains.find(d => d.domain === 'attention')!.value;
  const attB = userB.domains.find(d => d.domain === 'attention')!.value;
  expect(attB).toBeGreaterThan(attA);

  // Their plans should be completely different
  // User A should get attention exercises because they are weak at it
  const hasAttentionA = planA!.items.some(i => registry.find(r => r.manifest.id === i.exerciseId)?.manifest.domain === 'attention');
  expect(hasAttentionA).toBe(true);

  // User B should get memory exercises because they are weak at it
  const hasMemoryB = planB!.items.some(i => registry.find(r => r.manifest.id === i.exerciseId)?.manifest.domain === 'memory');
  expect(hasMemoryB).toBe(true);
});
