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
import { applyDifficultyFloor, assessRetention, type DifficultyFloor } from './retention';

export function planForNow(opts?: {
  durationSec?: number;
  excludeIds?: string[];
  nowMs?: number;
}): AdaptivePlan {
  const profile = storage.getProfile();
  const requested = opts?.durationSec ?? profile.sessionLengthSec;
  const floor = tryCurrentFloor(requested, opts?.nowMs);
  const durationSec = floor && floor.gapDays >= 2
    ? Math.min(requested, floor.durationSec)
    : requested;
  return buildAdaptivePlan({
    durationSec,
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
  const pick = pickPlayDifficulty({
    model: currentModel(),
    catalog: currentCatalog(),
    exerciseId,
    storedDifficulty
  });
  const floor = tryCurrentFloor(storage.getProfile().sessionLengthSec);
  if (!floor || (floor.multiplier >= 1 && floor.delta <= 0)) return pick;
  return { ...pick, difficulty: applyDifficultyFloor(pick.difficulty, floor) };
}

function tryCurrentFloor(sessionLengthSec: number, nowMs?: number): DifficultyFloor | null {
  try {
    const now = nowMs ? new Date(nowMs) : new Date();
    const today = now.toISOString().slice(0, 10);
    const ds = storage.getDaySummaries();
    const sessions = storage.getSessions();
    const playedToday = ds.some((d) => d.date.startsWith(today))
      || sessions.some((s) => s.startedAt.startsWith(today));
    const last = ds[ds.length - 1];
    const snap = assessRetention({
      daySummaries: ds,
      sessions,
      domains: storage.getDomains(),
      playedToday,
      streak: last?.streak ?? 0,
      sessionLengthSec,
      now
    });
    return snap.reengagement.floor;
  } catch {
    return null;
  }
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
