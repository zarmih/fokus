export interface Profile {
  name: string;
  createdAt: string;
  sessionLengthSec: number;
  calibrated?: boolean;
  soundOn: boolean;
  locale: 'ru';
  schemaVersion: number;
}
export interface DomainIndex {
  domain: string;
  value: number;
  updatedAt: string;
}
export interface ExerciseState {
  exerciseId: string;
  level: number;
  lastPlayedAt: string;
  lastAccuracy: number;
}
export interface SessionItem {
  exerciseId: string;
  level: number;
  accuracy: number;
  avgRtMs: number;
  score: number;
}
export interface Session {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number;
  items: SessionItem[];
}
export interface DaySummary {
  date: string;
  totalScore: number;
  domainDeltas: Record<string, number>;
  streak: number;
  skipped: boolean;
}
export interface AppState {
  profile: Profile;
  domains: DomainIndex[];
  exerciseStates: ExerciseState[];
  sessions: Session[];
  daySummaries: DaySummary[];
}
