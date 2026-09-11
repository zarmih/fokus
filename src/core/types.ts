import type { AbilityModel } from './engine/types';

export interface Profile {
  name: string;
  createdAt: string;
  sessionLengthSec: number;
  calibrated?: boolean;
  onboarded?: boolean;
  theme?: 'dark' | 'light';
  soundOn: boolean;
  language?: string;
  achievements?: string[];
  locale: 'ru';
  schemaVersion: number;
  xp?: number;
  primaryGoal?: string; // e.g. 'memory', 'attention', 'speed', 'flexibility', 'logic' or 'balance'
  quests?: any[];
  questsDate?: string;
  lastLifestyle?: { sleep: string | null; stress: string | null; date: string };
  reminderHour?: number | null;
  skipLifestylePrompt?: boolean;
  displayName?: string;
  /** ISO time of last (re)calibration. Used by the v2 engine stale trigger. */
  lastCalibrationAt?: string;
  needsRecalibration?: boolean;
  recalibrationSnoozedUntil?: string | null;
  engineVersion?: number;
}

export interface SkillIndex {
  skill: string;
  value: number;
  trend: number;
  confidence: number;
  attempts: number;
  lastUpdated: string;
  sources?: string[];
}

export interface DomainIndex {
  domain: string;
  value: number;
  trend?: number;
  updatedAt: string;
}

export interface ExerciseState {
  exerciseId: string;
  level: number;
  difficulty: number;
  performance: number;
  lastPlayedAt: string;
  lastAccuracy: number;
  attempts?: number;
  mastery?: number; // 0 to 100
  stability?: number; // recent performance stability
  consecutivePlateau?: number; // for plateau detection
}
export interface SessionItem {
  exerciseId: string;
  level: number;
  accuracy: number;
  avgRtMs: number;
  score: number;
  // Mastery Progression UI v1
  performance?: number;
  masteryBefore?: number;
  masteryAfter?: number;
  difficultyBefore?: number;
  difficultyAfter?: number;
  confidenceAfter?: number;
  progressionState?: string;
  pSuccess?: number;
  slot?: string;
}
export interface Session {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number;
  items: SessionItem[];
}
export interface HistoryItem {
  date: string;
  minutes: number;
  score: number;
  accuracy: number;
  domainDeltas: Record<string, number>;
}
export interface DaySummary {
  date: string;
  totalScore: number;
  domainDeltas: Record<string, number>;
  streak: number;
  skipped: boolean;
  lifestyle?: { sleep: string | null; stress: string | null };
  fokusIndex?: number;
  /** End-of-day domain snapshot. Optional for legacy summaries. */
  domainValues?: Record<string, number>;
}
export interface StorageMeta {
  schemaVersion: number;
  deviceId: string;
  rev: number;
  updatedAt: string;
}

export interface AppState {
  profile: Profile;
  domains: DomainIndex[];
  skills: SkillIndex[];
  exerciseStates: ExerciseState[];
  sessions: Session[];
  daySummaries: DaySummary[];
  history: HistoryItem[];
  meta?: StorageMeta;
  /** Adaptive Engine v2 latent-ability snapshot. Optional for pre-v4 saves. */
  abilityModel?: AbilityModel;
}
