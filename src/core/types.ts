import type { AbilityModel } from './engine/types';

export type CognitiveDomain = 'attention' | 'memory' | 'speed' | 'flexibility' | 'logic';

/** Latent ability estimate from the first-session probe. Not an IQ score. */
export interface DomainAbility {
  domain: CognitiveDomain;
  theta: number;
  precision: number;
  se: number;
  startLevel: number;
  observations: number;
  probed: boolean;
}

export interface ProbeBlockRecord {
  exerciseId: string;
  domain: string;
  accuracy: number;
  avgRtMs: number;
  thetaAfter: number;
}

export interface ProbeSnapshot {
  completedAt: string;
  durationSec: number;
  blocks: ProbeBlockRecord[];
  domains: DomainAbility[];
  overallTheta: number;
  overallPrecision: number;
  /** Marker so exports never get mistaken for an IQ test. */
  disclaimer: 'not-iq';
}

export type RitualIntensity = 'gentle' | 'steady' | 'full';

export interface RitualDay {
  day: number;
  durationSec: number;
  focusDomains: CognitiveDomain[];
  intensity: RitualIntensity;
  label: string;
}

export interface FirstWeekPlan {
  startDate: string;
  targetSessionSec: number;
  primaryGoal: string;
  skipPolicy: 'one-forgiven';
  days: RitualDay[];
}

export interface Profile {
  name: string;
  createdAt: string;
  sessionLengthSec: number;
  calibrated?: boolean;
  programPhase?: number;
  programStartDate?: string;
  onboarded?: boolean;
  theme?: 'dark' | 'light';
  soundOn: boolean;
  /** Master volume 0..1. Ignored when soundOn is false. */
  soundVolume?: number;
  /** Optional Vibration API hooks. Default true when omitted. */
  hapticsOn?: boolean;
  reducedMotion?: boolean;
  language?: string;
  achievements?: string[];
  shieldCharges?: number;
  shieldLastUsed?: string;
  locale: 'ru';
  schemaVersion: number;
  xp?: number;
  primaryGoal?: string; // e.g. 'memory', 'attention', 'speed', 'flexibility', 'logic' or 'balance'
  programDay?: number;
  programWeek?: number;
  needsRecalibration?: boolean;
  recalibrationPostponed?: boolean;
  recalibrationSnoozedUntil?: string | null;
  lastCalibrationAt?: string;
  engineVersion?: number;
  quests?: any[];
  questsDate?: string;
  lastLifestyle?: { sleep: string | null; stress: string | null; date: string };
  reminderHour?: number | null;
  skipLifestylePrompt?: boolean;
  /** Prefer accessible exercise variants that do not rely on colour (measured and compared separately). */
  accessibleMode?: boolean;
  /**
   * Day zone history (schema 6). Last period = current zone. Changing zone appends a period, so past
   * days keep the date they were played on. Missing = not chosen yet (legacy Europe/Moscow).
   */
  timeZones?: { zone: string; fromMs: number }[];
  displayName?: string;
  /** When false, Today ignores the recovery gate. Default true. */
  recoveryHints?: boolean;
  onboardingCompletedAt?: string;
  probeSnapshot?: ProbeSnapshot;
  firstWeekPlan?: FirstWeekPlan;
  transferTipCursor?: number;
  weeklyGoal?: { domain: string; startIso: string; target: number; progress: number };
  seriesGoalDays?: number;
  seriesGoalStartedAt?: string;
  activeSession?: {
    items: SessionItem[];
    planItems: { exerciseId: string }[];
    timeLeft: number;
    startedAt: string;
    domainDeltas: Record<string, number>;
  };
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
  /** Trials in the block (methodology v2; absent on older items). */
  rounds?: number;
  /** Measurement mode (methodology v2): accessible-mode blocks are compared only among themselves. */
  mode?: 'standard' | 'accessible';
}
export type SessionEndReason = 'completed' | 'fatigue' | 'timeout' | 'abandoned';

export interface Session {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number;
  items: SessionItem[];
  /** User left before finishing. Older sessions omit this; infer from finishedAt. */
  interrupted?: boolean;
  endReason?: SessionEndReason;
  plannedDurationSec?: number;
  /** Blocks aborted by pause / hidden tab and replayed; they were never scored. */
  abortedBlocks?: number;
  /** Session kind (methodology v2); calibration blocks are excluded from personal trends. */
  mode?: 'normal' | 'calibration' | 'recalibration' | 'practice';
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
  /** Analytics methodology the stored fokusIndex was computed with (1 = before 2026-11-12). */
  fokusIndexMethod?: number;
  /** End-of-day domain snapshot. Optional for legacy summaries. */
  domainValues?: Record<string, number>;
}
export interface StorageMeta {
  schemaVersion: number;
  /** Analytics methodology version of newly written values (schema ≥ 5). */
  analyticsMethodologyVersion?: number;
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
