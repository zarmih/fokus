import type { ExerciseManifest } from '../exercises/contract';
import type { DomainIndex, SkillIndex, ExerciseState } from './types';

export interface TrainingPlanItem {
  exerciseId: string;
  reason: string;
}

export interface TrainingPlan {
  focusDomains: string[];
  items: TrainingPlanItem[];
}

export function buildTrainingPlan(params: {
  durationSec: number;
  catalog: { manifest: ExerciseManifest }[];
  domains: DomainIndex[];
  skills: SkillIndex[];
  states: ExerciseState[];
}): TrainingPlan {
  const { durationSec, catalog, domains, skills, states } = params;
  
  let targetBlocks = 3;
  if (durationSec >= 480) targetBlocks = 4;
  if (durationSec >= 720) targetBlocks = 5;

  const sortedDomains = [...domains].sort((a, b) => a.value - b.value);
  const weakestDomain = sortedDomains.length > 0 ? sortedDomains[0].domain : null;
  const strongestDomain = sortedDomains.length > 0 ? sortedDomains[sortedDomains.length - 1].domain : null;

  const focusDomains = [];
  if (weakestDomain) focusDomains.push(weakestDomain);
  if (strongestDomain && strongestDomain !== weakestDomain) focusDomains.push(strongestDomain);

  const items: TrainingPlanItem[] = [];
  const selectedDomains = new Set<string>();
  
  for (let i = 0; i < targetBlocks; i++) {
    let candidates = [...catalog];
    let reason = '';

    // First block: target the weakest domain to warm up and improve
    if (i === 0 && weakestDomain) {
      const w = candidates.filter(c => c.manifest.domain === weakestDomain);
      if (w.length > 0) {
        candidates = w;
        reason = `Weakest domain (${weakestDomain})`;
      }
    } 
    // Last block: end on a high note with the strongest domain
    else if (i === targetBlocks - 1 && strongestDomain) {
      const s = candidates.filter(c => c.manifest.domain === strongestDomain);
      if (s.length > 0) {
        candidates = s;
        reason = `Strongest domain (${strongestDomain}) to finish`;
      }
    } 
    // Middle blocks: target weak skills or balance
    else {
      // Find a weak skill that belongs to candidates
      const sortedSkills = [...skills].sort((a, b) => a.value - b.value);
      const weakSkill = sortedSkills.find(sk => 
        candidates.some(c => c.manifest.skills.includes(sk.skill as any)) &&
        !selectedDomains.has(catalog.find(c => c.manifest.skills.includes(sk.skill as any))!.manifest.domain)
      );

      if (weakSkill) {
        const w = candidates.filter(c => c.manifest.skills.includes(weakSkill.skill as any));
        if (w.length > 0) {
          candidates = w;
          reason = `Area for improvement: ${weakSkill.skill}`;
        }
      } else {
        // Fallback: avoid repeating domains
        const d = candidates.filter(c => !selectedDomains.has(c.manifest.domain));
        if (d.length > 0) {
          candidates = d;
          reason = 'Balanced training';
        } else {
          reason = 'General practice';
        }
      }
    }

    // Sort by least recently played
    candidates.sort((a, b) => {
      const aState = states.find(s => s.exerciseId === a.manifest.id);
      const bState = states.find(s => s.exerciseId === b.manifest.id);
      const aTime = aState ? new Date(aState.lastPlayedAt).getTime() : 0;
      const bTime = bState ? new Date(bState.lastPlayedAt).getTime() : 0;
      return aTime - bTime;
    });

    const chosen = candidates[0];
    items.push({ exerciseId: chosen.manifest.id, reason: reason || 'Algorithm choice' });
    selectedDomains.add(chosen.manifest.domain);
  }

  return { focusDomains, items };
}

// Keep old signature for backward compatibility with tests, but reimplement with new logic
export function buildSession(params: {
  durationSec: number, 
  catalog: any[], 
  domainIndexes: any[], 
  lastPlayedByExercise: Record<string, string>, 
  yesterdayDomains: string[]
}): any[] {
  // Wrap simple catalog into objects with manifest to reuse buildTrainingPlan logic
  const mockCatalog = params.catalog.map(c => ({ manifest: { id: c.id, domain: c.domain, skills: [] } as any }));
  const plan = buildTrainingPlan({
    durationSec: params.durationSec,
    catalog: mockCatalog,
    domains: params.domainIndexes,
    skills: [], // No skills in old tests
    states: Object.keys(params.lastPlayedByExercise).map(id => ({
      exerciseId: id,
      lastPlayedAt: params.lastPlayedByExercise[id],
      level: 1, difficulty: 1, performance: 0, lastAccuracy: 0
    }))
  });
  
  return plan.items.map(item => ({ exerciseId: item.exerciseId }));
}
