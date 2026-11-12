import { registry } from '../exercises/registry';
import { buildAdaptivePlan } from './session-builder';
import { storage } from './storage';
import { loadContinuitySnapshot, ritualDurationSec, applyGentleReturnBias } from './continuity';
import { rotatingTipDomain } from './transfer';
import {
  applyObservation,
  catalogFromManifests,
  markCalibrated,
  pickPlayDifficulty,
  resolveModel,
  snoozeUntil
} from './engine';
import type { AdaptivePlan } from './engine';
import type { Observation } from './engine/types';
import type { DifficultyPick } from './engine';
import { phaseForWeek } from './program-phases';
import { inCoreProgram, nonCoreExclusions, programDayNumber } from './core-catalog';

export function planForNow(opts?: {
  durationSec?: number;
  excludeIds?: string[];
  nowMs?: number;
}): AdaptivePlan {
  const profile = storage.getProfile();
  
  const snapshot = loadContinuitySnapshot(storage, opts?.nowMs ? new Date(opts.nowMs) : undefined);
  const baseDuration = opts?.durationSec ?? profile.sessionLengthSec ?? 900;
  const durationSec = ritualDurationSec(baseDuration, snapshot.ritual);

  const { weekIndex, dayInWeek, isSparse } = getProgramPosition(snapshot, profile as any);

  const toExclude = new Set(opts?.excludeIds || []);
  const fatiguedToRest = snapshot.workload.fatigued.filter(d => d !== profile.primaryGoal);
  
  if (fatiguedToRest.length > 0) {
    const allDomains = new Set(registry.map(c => c.manifest.domain));
    if (allDomains.size - fatiguedToRest.length >= 3) {
      registry.forEach(c => {
        if (fatiguedToRest.includes(c.manifest.domain)) {
          toExclude.add(c.manifest.id);
        }
      });
    }
  }

  // 14-day program: draw from the core catalog (docs/core-program/core-catalog.md), the rest stays
  // in the catalog. Falls back to the full catalog if resting domains leave the core too thin.
  const pos = getProgramPosition(snapshot, profile as any);
  const programDay = programDayNumber(pos.playedCount, pos.playedToday);
  if (inCoreProgram(programDay)) {
    const refs = registry.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }));
    for (const id of nonCoreExclusions(refs, toExclude)) toExclude.add(id);
  }

  const plan = buildAdaptivePlan({
    durationSec,
    catalog: registry as any,
    domains: storage.getDomains(),
    skills: storage.getSkills(),
    states: storage.getExerciseStates(),
    primaryGoal: profile.primaryGoal,
    abilityModel: storage.getAbilityModel(),
    lastCalibrationAt: profile.lastCalibrationAt || null,
    snoozedUntil: profile.recalibrationSnoozedUntil || null,
    excludeIds: Array.from(toExclude),
    nowMs: opts?.nowMs,
    // Same day + same inputs → same plan, so Today, Program and a re-render never disagree.
    rng: dayRng(`${snapshot.today}|${(opts?.excludeIds || []).join(',')}`),
    programWeek: weekIndex,
    programDay: dayInWeek,
    programPhase: phaseForWeek(weekIndex).id,
    fatigueOrChurn: snapshot.workload.fatigued.length > 0,
    focusOfTheWeek: rotatingTipDomain(new Date(opts?.nowMs ?? Date.now())),
    isSparse
  });

  const biased = applyGentleReturnBias(
    { focusDomains: plan.focusDomains || [], items: plan.items },
    snapshot.ritual,
    registry.map(c => ({ id: c.manifest.id, domain: c.manifest.domain }))
  );

  return {
    ...plan,
    focusDomains: biased.focusDomains || [],
    items: biased.items as any
  };
}

export function currentCatalog() {
  return catalogFromManifests(registry as any);
}

export function currentModel(nowMs = Date.now()) {
  const profile = storage.getProfile();
  return resolveModel(
    {
      abilityModel: storage.getAbilityModel(),
      domains: storage.getDomains(),
      skills: storage.getSkills(),
      states: storage.getExerciseStates(),
      lastCalibrationAt: profile.lastCalibrationAt || null
    },
    currentCatalog(),
    nowMs
  );
}

export function difficultyFor(exerciseId: string, storedDifficulty: number): DifficultyPick {
  return pickPlayDifficulty({
    model: currentModel(),
    catalog: currentCatalog(),
    exerciseId,
    storedDifficulty
  });
}

export function recordEngineObservation(obs: Observation, nowMs = Date.now()) {
  const next = applyObservation(currentModel(nowMs), obs, nowMs);
  storage.setAbilityModel(next);
  return next;
}

export function markEngineCalibrated(nowMs = Date.now()) {
  const next = markCalibrated(currentModel(nowMs), nowMs);
  storage.setAbilityModel(next);
  const p = storage.getProfile();
  p.lastCalibrationAt = new Date(nowMs).toISOString();
  p.needsRecalibration = false;
  p.recalibrationSnoozedUntil = null;
  p.calibrated = true;
  storage.setProfile(p);
  return next;
}

export function snoozeRecalibration(nowMs = Date.now()) {
  const p = storage.getProfile();
  p.recalibrationSnoozedUntil = snoozeUntil(nowMs);
  storage.setProfile(p);
}

export function getProgramPosition(snapshot: any, profile: { programWeek?: number }) {
  const programWeek = profile.programWeek;
  const playedCount = snapshot.playedDays?.length || 0;
  const playedToday = snapshot.streak?.playedToday || false;
  
  const weekIndexBase = playedToday ? Math.max(0, playedCount - 1) : playedCount;
  const weekIndex = programWeek || Math.floor(weekIndexBase / 7) + 1;
  const dayInWeek = playedToday ? ((Math.max(0, playedCount - 1)) % 7) + 1 : (playedCount % 7) + 1;
  const isSparse = playedCount < 3;
  
  return { weekIndex, dayInWeek, playedCount, isSparse, playedToday };
}

/** Deterministic PRNG (mulberry32) seeded from a string, e.g. the calendar day. */
export function dayRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
