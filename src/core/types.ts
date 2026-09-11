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
  onboardingCompletedAt?: string;
  probeSnapshot?: ProbeSnapshot;
  firstWeekPlan?: FirstWeekPlan;
  transferTipCursor?: number;
  /** Present if a Phase 2 program PR is merged; G7 does not own this field. */
  programPhase?: number;
  programStartDate?: string;
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
}
export interface AppState {
  profile: Profile;
  domains: DomainIndex[];
  skills: SkillIndex[];
  exerciseStates: ExerciseState[];
  sessions: Session[];
  daySummaries: DaySummary[];
  history: HistoryItem[];
}
