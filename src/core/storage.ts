import type { AppState, Profile, DomainIndex, ExerciseState, Session, DaySummary } from './types';

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'fokus.v1';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultProfile: Profile = {
  createdAt: new Date().toISOString(),
  sessionLengthSec: 300,
  soundOn: true,
  locale: 'ru',
  schemaVersion: CURRENT_SCHEMA_VERSION
};

const defaultState: AppState = {
  profile: defaultProfile,
  domains: [],
  exerciseStates: [],
  sessions: [],
  daySummaries: []
};

export class Storage {
  constructor(private backend: StorageBackend) {
    this.migrate();
  }

  private migrate() {
    const raw = this.backend.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.profile && parsed.profile.schemaVersion < CURRENT_SCHEMA_VERSION) {
        // Migration logic would go here
        parsed.profile.schemaVersion = CURRENT_SCHEMA_VERSION;
        this.backend.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('Storage migration failed', e);
    }
  }

  private getState(): AppState {
    const raw = this.backend.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultState));
    try {
      return JSON.parse(raw);
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  private saveState(state: AppState) {
    this.backend.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  getProfile(): Profile { return this.getState().profile; }
  setProfile(p: Profile) { const s = this.getState(); s.profile = p; this.saveState(s); }

  getDomains(): DomainIndex[] { return this.getState().domains; }
  setDomains(d: DomainIndex[]) { const s = this.getState(); s.domains = d; this.saveState(s); }

  getExerciseStates(): ExerciseState[] { return this.getState().exerciseStates; }
  setExerciseStates(st: ExerciseState[]) { const s = this.getState(); s.exerciseStates = st; this.saveState(s); }

  getSessions(): Session[] { return this.getState().sessions; }
  addSession(session: Session) { const s = this.getState(); s.sessions.push(session); this.saveState(s); }

  getDaySummaries(limit = 28): DaySummary[] { 
    return this.getState().daySummaries.slice(-limit); 
  }
  addDaySummary(ds: DaySummary) { 
    const s = this.getState(); 
    s.daySummaries.push(ds); 
    this.saveState(s); 
  }

  exportJson(): string {
    return this.backend.getItem(STORAGE_KEY) || JSON.stringify(defaultState);
  }

  reset() {
    this.backend.removeItem(STORAGE_KEY);
  }
}

export const storage = new Storage(window.localStorage);
