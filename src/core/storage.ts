import type { AppState, Profile, DomainIndex, ExerciseState, Session, DaySummary, HistoryItem } from './types';

export const CURRENT_SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'fokus.v1';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultProfile: Profile = {
  name: 'User',
  createdAt: new Date().toISOString(),
  sessionLengthSec: 300,
  soundOn: true,
  onboarded: false,
  theme: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  locale: 'ru',
  schemaVersion: CURRENT_SCHEMA_VERSION
};

const defaultState: AppState = {
  profile: defaultProfile,
  domains: [],
  exerciseStates: [],
  sessions: [],
  daySummaries: [],
  history: []
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
        if (parsed.profile.schemaVersion === 1) {
          parsed.profile.onboarded = !!parsed.profile.calibrated;
          parsed.history = parsed.history || [];
          parsed.profile.schemaVersion = 2;
        }
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
      const parsed = JSON.parse(raw);
      if (!parsed.history) parsed.history = [];
      return parsed;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  private saveState(state: AppState) {
    this.backend.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  getProfile(): Profile { return { ...defaultProfile, ...(this.getState().profile || {}) }; }
  setProfile(p: Profile) { const s = this.getState(); s.profile = p; this.saveState(s); }

  getDomains(): DomainIndex[] { return this.getState().domains; }
  setDomains(d: DomainIndex[]) { const s = this.getState(); s.domains = d; this.saveState(s); }

  getExerciseStates(): ExerciseState[] { return this.getState().exerciseStates; }
  setExerciseStates(st: ExerciseState[]) { const s = this.getState(); s.exerciseStates = st; this.saveState(s); }

  getSessions(): Session[] { return this.getState().sessions; }
  addSession(session: Session) { const s = this.getState(); s.sessions.push(session); this.saveState(s); }

  getHistory(): HistoryItem[] { return this.getState().history || []; }
  addHistory(item: HistoryItem) {
    const s = this.getState();
    if (!s.history) s.history = [];
    s.history.push(item);
    if (s.history.length > 30) {
      s.history = s.history.slice(-30);
    }
    this.saveState(s);
  }

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
  importJson(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (parsed.profile) {
        this.backend.setItem(STORAGE_KEY, json);
        this.migrate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  reset() {
    this.backend.removeItem(STORAGE_KEY);
  }
}

const fallbackStorage: StorageBackend = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
export const storage = new Storage(typeof window !== 'undefined' && window.localStorage ? window.localStorage : fallbackStorage);
