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
    programWeek: weekIndex,
    programDay: dayInWeek,
    focusOfTheWeek: rotatingTipDomain(new Date(opts?.nowMs ?? Date.now())),
    isSparse
  });

  const biased = applyGentleReturnBias(
    { focusDomains: plan.focusDomains || [], items: plan.items },
    snapshot.ritual,
    registry.map(c => ({ id: c.manifest.id, domain: c.manifest.domain }))
  );

  const model = currentModel(opts?.nowMs);
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
