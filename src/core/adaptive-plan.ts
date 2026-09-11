import { registry } from '../exercises/registry';
import { buildAdaptivePlan } from './session-builder';
import { storage } from './storage';
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
  return buildAdaptivePlan({
    durationSec: opts?.durationSec ?? profile.sessionLengthSec,
    catalog: registry as any,
    domains: storage.getDomains(),
    skills: storage.getSkills(),
    states: storage.getExerciseStates(),
    primaryGoal: profile.primaryGoal,
    abilityModel: storage.getAbilityModel(),
    lastCalibrationAt: profile.lastCalibrationAt || null,
    snoozedUntil: profile.recalibrationSnoozedUntil || null,
    excludeIds: opts?.excludeIds,
    nowMs: opts?.nowMs
  });
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
