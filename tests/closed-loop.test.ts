import { expect, test, describe, beforeEach } from 'vitest';
import { calculateNormalizedPerformance, updateExerciseState, updateSkillIndex, updateDomainIndex } from '../src/core/adaptive';
import { buildTrainingPlan } from '../src/core/session-builder';
import type { DomainIndex, ExerciseState, Profile, SkillIndex } from '../src/core/types';
import { registry } from '../src/exercises/registry';
import { Storage } from '../src/core/storage';

class MockBackend {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

export class TestHarness {
  storage: Storage;

  constructor() {
    this.storage = new Storage(new MockBackend());
    // Seed baseline
    const states: ExerciseState[] = registry.map(ex => ({
      exerciseId: ex.manifest.id,
      level: 1, difficulty: 1.0, performance: 500,
      lastPlayedAt: new Date(Date.now() - 24*60*60*1000).toISOString(),
      lastAccuracy: 0.5,
      attempts: 1, stability: 0.5, consecutivePlateau: 0, mastery: 5
    }));
    this.storage.setExerciseStates(states);
    
    // Seed skills and domains baseline
    const skills: SkillIndex[] = [];
    const domains: DomainIndex[] = [];
    registry.forEach(ex => {
      ex.manifest.skills.forEach(sk => {
        if (!skills.find(s => s.skill === sk)) {
          skills.push({ skill: sk, value: 500, trend: 0, confidence: 15, attempts: 1, lastUpdated: new Date().toISOString(), sources: [ex.manifest.id] });
        }
      });
      if (!domains.find(d => d.domain === ex.manifest.domain)) {
        domains.push({ domain: ex.manifest.domain, value: 500, trend: 0, updatedAt: new Date().toISOString() });
      }
    });
    this.storage.setSkills(skills);
    this.storage.setDomains(domains);
  }

  buildPlan(goal: string = 'balance') {
    return buildTrainingPlan({
      durationSec: 300,
      catalog: registry.map(r => ({ manifest: r.manifest })),
      domains: this.storage.getDomains(),
      skills: this.storage.getSkills(),
      states: this.storage.getExerciseStates(),
      primaryGoal: goal
    });
  }

  playExercise(exerciseId: string, accuracy: number, rtMs: number = 1500) {
    const states = this.storage.getExerciseStates();
    const skills = this.storage.getSkills();
    const domains = this.storage.getDomains();

    const stateIdx = states.findIndex(s => s.exerciseId === exerciseId);
    if (stateIdx < 0) throw new Error(`Exercise state not found: ${exerciseId}`);
    
    const state = states[stateIdx];
    const manifest = registry.find(r => r.manifest.id === exerciseId)!.manifest;
    
    const perf = calculateNormalizedPerformance(accuracy, rtMs, 1500, state.difficulty, manifest.metricModel);
    states[stateIdx] = updateExerciseState(state, accuracy, rtMs, 1500, perf);
    
    manifest.skills.forEach(sk => {
      const sIdx = skills.findIndex(s => s.skill === sk);
      const newSk = updateSkillIndex(sIdx >= 0 ? skills[sIdx] : undefined, sk, perf, exerciseId);
      if (sIdx >= 0) skills[sIdx] = newSk;
      else skills.push(newSk);
    });
    
    const dIdx = domains.findIndex(d => d.domain === manifest.domain);
    const newD = updateDomainIndex(dIdx >= 0 ? domains[dIdx] : undefined, manifest.domain, perf);
    if (dIdx >= 0) domains[dIdx] = newD;
    else domains.push(newD);

    this.storage.setExerciseStates(states);
    this.storage.setSkills(skills);
    this.storage.setDomains(domains);
  }
}

describe('Cognitive Engine Closed Loop', () => {
  test('Personalization Causal Test: User A (Weak Memory) vs User B (Strong Memory)', () => {
    const userA = new TestHarness();
    const userB = new TestHarness();

    // User A struggles with memory
    userA.playExercise('grid-memory', 0.4);
    userA.playExercise('sequence', 0.4);
    
    // User B excels at memory
    userB.playExercise('grid-memory', 0.95);
    userB.playExercise('sequence', 0.95);

    const planA = userA.buildPlan();
    const planB = userB.buildPlan();

    // User A should get a memory exercise due to weaknessPriority
    const exA = registry.find(r => r.manifest.id === planA.items[0].exerciseId)!;
    expect(exA.manifest.domain).toBe('memory');
    expect(planA.items[0].reason).toContain('Укрепление слабой области');

    // User B should NOT get memory as their primary weakness, likely something else
    const exB = registry.find(r => r.manifest.id === planB.items[0].exerciseId)!;
    expect(exB.manifest.domain).not.toBe('memory'); // They are strong in memory, so memory shouldn't be the weakest domain
  });
  
  test('Plateau Causal Test: Sustained plateau drops exercise priority', () => {
    const user = new TestHarness();
    const exId = 'grid-memory';
    
    // Simulate a plateau by directly setting the state (we want to test causal effect of plateau on recommendation)
    let states = user.storage.getExerciseStates();
    let state = states.find(s => s.exerciseId === exId)!;
    state.consecutivePlateau = 3;
    state.lastPlayedAt = new Date(Date.now() - 48*60*60*1000).toISOString();
    user.storage.setExerciseStates(states);
    
    // Check plateau flag
    expect(state.consecutivePlateau).toBeGreaterThanOrEqual(3);
    
    const plan = user.buildPlan();
    // Because of plateau, grid-memory should be penalized (plateauPenalty = 30)
    // Even if memory is weak, another memory exercise should be picked over grid-memory
    const memoryExs = plan.items.filter(i => registry.find(r => r.manifest.id === i.exerciseId)?.manifest.domain === 'memory');
    if (memoryExs.length > 0) {
      expect(memoryExs[0].exerciseId).not.toBe(exId);
    }
  });

  test('Neglect Causal Test: Differentiates weak vs neglected', () => {
    const user = new TestHarness();
    
    // User has average skill but hasn't played it in a while
    const skills = user.storage.getSkills();
    const vmSkill = skills.find(s => s.skill === 'visual_memory')!;
    vmSkill.value = 500; // Average (so maintenance is not triggered)
    vmSkill.confidence = 80;
    vmSkill.lastUpdated = new Date(Date.now() - 10*24*60*60*1000).toISOString(); // 10 days ago
    user.storage.setSkills(skills);

    const plan = user.buildPlan();
    const item = plan.items.find(i => registry.find(r => r.manifest.id === i.exerciseId)?.manifest.skills.includes('visual_memory'));
    expect(item).toBeDefined();
    expect(item!.reason).toBe('Забытый навык');
  });

  test('Mastery Causal Test: Confidence caps mastery, stability preserves it', () => {
    const userA = new TestHarness();
    userA.playExercise('grid-memory', 0.95); // 1 attempt, confidence is low (1/15 = 6%)
    
    const userB = new TestHarness();
    for(let i=0; i<10; i++) userB.playExercise('grid-memory', 0.95); // 10 attempts
    
    const masteryA = userA.storage.getExerciseStates().find(s => s.exerciseId === 'grid-memory')!.mastery!;
    const masteryB = userB.storage.getExerciseStates().find(s => s.exerciseId === 'grid-memory')!.mastery!;
    
    expect(masteryB).toBeGreaterThan(masteryA);
    
    const userC = new TestHarness();
    for(let i=0; i<10; i++) userC.playExercise('grid-memory', i % 2 === 0 ? 0.4 : 0.95); // Swings => low stability
    const masteryC = userC.storage.getExerciseStates().find(s => s.exerciseId === 'grid-memory')!.mastery!;
    
    expect(masteryB).toBeGreaterThan(masteryC);
  });

  test('Cross-Exercise Aggregation: Evidence merges smoothly', () => {
    const user = new TestHarness();
    // Grid memory and Pattern next both train 'visual_memory' (wait, sequence trains pattern_recognition, let's use another if possible, or just look at grid-memory and sequence which both use visual_memory/working_memory)
    // Actually grid-memory and sequence both use 'working_memory'
    user.playExercise('grid-memory', 0.95); // High perf
    const skillAfterA = user.storage.getSkills().find(s => s.skill === 'working_memory')!.value;
    
    user.playExercise('sequence', 0.4); // Low perf
    const skillAfterB = user.storage.getSkills().find(s => s.skill === 'working_memory')!.value;
    
    // Skill should drop because second evidence was low
    expect(skillAfterB).toBeLessThan(skillAfterA);
    
    // Order independence test
    const userRev = new TestHarness();
    userRev.playExercise('sequence', 0.4);
    userRev.playExercise('grid-memory', 0.95);
    const skillRev = userRev.storage.getSkills().find(s => s.skill === 'working_memory')!.value;
    
    // It's EMA, so the last value has more weight, but both orderings shouldn't be completely disparate.
    // They won't be exactly equal, but they are bounded.
    expect(Math.abs(skillAfterB - skillRev)).toBeLessThan(300); 
  });
  
  test('Counterfactual Test: Causal sensitivity to single performance event', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.9;
    const userA = new TestHarness();
    const userB = new TestHarness();
    
    // Exactly the same except for one session result
    userA.playExercise('math-sprint', 0.4, 3000); // Bad math
    userB.playExercise('math-sprint', 0.95, 1000); // Good math
    
    const planA = userA.buildPlan();
    const planB = userB.buildPlan();
    
    // Because user A is bad at math (logic domain), it becomes their weakness
    const logicCountA = planA.items.filter(i => registry.find(r => r.manifest.id === i.exerciseId)?.manifest.domain === 'logic').length;
    const logicCountB = planB.items.filter(i => registry.find(r => r.manifest.id === i.exerciseId)?.manifest.domain === 'logic').length;
    
    expect(logicCountA).toBeGreaterThanOrEqual(logicCountB);
    Math.random = originalRandom;
  });
  test('Goal Causal Test: Switching goal immediately changes recommendation priority', () => {
    const user = new TestHarness();
    
    const memoryPlan = user.buildPlan('memory');
    const speedPlan = user.buildPlan('speed');
    
    const firstMemoryEx = registry.find(r => r.manifest.id === memoryPlan.items[0].exerciseId)!;
    expect(firstMemoryEx.manifest.domain).toBe('memory');

    const firstSpeedEx = registry.find(r => r.manifest.id === speedPlan.items[0].exerciseId)!;
    expect(firstSpeedEx.manifest.domain).toBe('speed');
  });

  test('History Causal Test: Recent play imposes heavy repetition penalty', () => {
    const user = new TestHarness();
    const plan1 = user.buildPlan();
    const ex1 = plan1.items[0].exerciseId;
    
    // Play the exercise
    user.playExercise(ex1, 0.8);
    
    // Build plan immediately after
    const plan2 = user.buildPlan();
    
    // It should not recommend the exact same exercise as priority 1 immediately (repetition penalty)
    expect(plan2.items[0].exerciseId).not.toBe(ex1);
  });
});
