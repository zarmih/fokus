import type { AppState, Profile, DomainIndex, SkillIndex, ExerciseState, Session, DaySummary, HistoryItem, StorageMeta } from './types';
import type { AbilityModel } from './engine/types';
import { safeError } from './log';
import {
  applyImport,
  CURRENT_SCHEMA_VERSION,
  migrateState,
  newDeviceId,
  parseBackup,
  previewImport,
  serializeBackup,
  type ImportMode,
  type ImportPreview,
  type MergeReport
} from './offline-sync';
import {
  APP_STATE_KEY,
  inventoryLocalData,
  listFokusKeys,
  redactState,
  resetProgressState,
  stripPii,
  wipeFokusKeys,
  type InventoryReport,
  type PiiKind
} from './privacy';

export { CURRENT_SCHEMA_VERSION } from './offline-sync';
export {
  CURRENT_BACKUP_FORMAT,
  BACKUP_KIND,
  parseBackup,
  previewImport,
  serializeBackup,
  migrateState,
  mergeStates,
  applyImport,
  fnv1a,
  type ImportMode,
  type ImportPreview,
  type MergeReport
} from './offline-sync';

export const STORAGE_KEY = APP_STATE_KEY;
export const BACKUP_KEY = 'fokus.v1.bak';
export const SNAPSHOT_KEY = 'fokus.v1.snap';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys?(): string[];
}

export interface StorageHealth {
  empty: boolean;
  schemaVersion: number;
  deviceId: string | null;
  rev: number;
  updatedAt: string | null;
  hasBackup: boolean;
  hasSnapshot: boolean;
  bytes: number;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  mode?: ImportMode;
  report?: MergeReport;
  preview?: ImportPreview;
  warnings?: string[];
}

const defaultProfile: Profile = {
  name: 'User',
  createdAt: new Date().toISOString(),
  sessionLengthSec: 900,
  soundOn: true,
  soundVolume: 1,
  hapticsOn: true,
  onboarded: false,
  theme: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  locale: 'ru',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  xp: 0
};

const defaultState: AppState = {
  profile: defaultProfile,
  domains: [],
  skills: [],
  exerciseStates: [],
  sessions: [],
  daySummaries: [],
  history: []
};

export class Storage {
  constructor(
    private backend: StorageBackend,
    private clock: () => string = () => new Date().toISOString()
  ) {
    this.migrate();
  }

  private looksJson(raw: string | null): boolean {
    if (!raw) return false;
    try {
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  private loadRaw(): string | null {
    const live = this.backend.getItem(STORAGE_KEY);
    if (this.looksJson(live)) return live;
    const bak = this.backend.getItem(BACKUP_KEY);
    if (this.looksJson(bak)) {
      try {
        this.backend.setItem(STORAGE_KEY, bak as string);
      } catch {
        /* restore is best-effort */
      }
      return bak;
    }
    return this.looksJson(live) ? live : null;
  }

  /** Atomic-enough write: keep last-known-good in bak, never leave a corrupt live blob. */
  private writeRaw(json: string): boolean {
    const current = this.backend.getItem(STORAGE_KEY);
    const prevBak = this.backend.getItem(BACKUP_KEY);
    if (this.looksJson(current) && current !== json) {
      try {
        this.backend.setItem(BACKUP_KEY, current as string);
      } catch {
        /* quota: skip rotating bak */
      }
    }
    try {
      this.backend.setItem(STORAGE_KEY, json);
      return true;
    } catch (e) {
      if (prevBak != null) {
        try {
          this.backend.setItem(BACKUP_KEY, prevBak);
        } catch {
          /* ignore */
        }
      }
      console.error('Storage write failed', e);
      return false;
    }
  }

  private snapshotLive() {
    const live = this.backend.getItem(STORAGE_KEY);
    if (this.looksJson(live)) {
      try {
        this.backend.setItem(SNAPSHOT_KEY, live as string);
      } catch {
        /* snapshot is best-effort */
      }
    }
  }

  private migrate() {
    const raw = this.loadRaw();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const before = parsed?.profile?.schemaVersion ?? parsed?.meta?.schemaVersion ?? 0;
      const migrated = migrateState(parsed, { now: this.clock() });
      const after = migrated.meta?.schemaVersion ?? migrated.profile.schemaVersion;
      if (before < after || !parsed.meta) {
        this.writeRaw(JSON.stringify(migrated));
      }
    } catch (e) {
      safeError('Storage migration failed', e);
    }
  }

  private getState(): AppState {
    const raw = this.loadRaw();
    if (!raw) return JSON.parse(JSON.stringify(defaultState));
    try {
      return migrateState(JSON.parse(raw), { now: this.clock() });
    } catch (e) {
      console.error('Storage read failed', e);
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  private saveState(state: AppState): boolean {
    const current = this.getState();
    const deviceId = state.meta?.deviceId || current.meta?.deviceId;
    const stamped: AppState = {
      ...state,
      profile: { ...state.profile, schemaVersion: CURRENT_SCHEMA_VERSION },
      meta: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        deviceId: current.meta?.deviceId || deviceId || newDeviceId(),
        rev: Math.max(current.meta?.rev ?? 0, state.meta?.rev ?? 0) + 1,
        updatedAt: this.clock()
      }
    };
    return this.writeRaw(JSON.stringify(stamped));
  }

  getProfile(): Profile { return { ...defaultProfile, ...(this.getState().profile || {}) }; }
  setProfile(p: Profile) { const s = this.getState(); s.profile = p; this.saveState(s); }

  getDomains(): DomainIndex[] { return this.getState().domains || []; }
  setDomains(d: DomainIndex[]) { const s = this.getState(); s.domains = d; this.saveState(s); }

  getSkills(): SkillIndex[] { return this.getState().skills || []; }
  setSkills(sk: SkillIndex[]) { const s = this.getState(); s.skills = sk; this.saveState(s); }

  getExerciseStates(): ExerciseState[] { return this.getState().exerciseStates || []; }
  setExerciseStates(st: ExerciseState[]) { const s = this.getState(); s.exerciseStates = st; this.saveState(s); }

  getAbilityModel(): AbilityModel | null {
    return this.getState().abilityModel || null;
  }
  setAbilityModel(model: AbilityModel) {
    const s = this.getState();
    s.abilityModel = model;
    this.saveState(s);
  }

  getSessions(): Session[] { return this.getState().sessions; }
  addSession(session: Session) { const s = this.getState(); s.sessions.push(session); this.saveState(s); }

  getHistory(): HistoryItem[] { return this.getState().history || []; }
  addHistory(item: HistoryItem) {
    const s = this.getState();
    if (!s.history) s.history = [];
    s.history.push(item);
    this.saveState(s);
  }

  getDaySummaries(limit = 60): DaySummary[] {
    return this.getState().daySummaries.slice(-limit);
  }
  addDaySummary(ds: DaySummary) {
    const s = this.getState();
    s.daySummaries.push(ds);
    this.saveState(s);
  }

  getMeta(): StorageMeta | undefined {
    return this.getState().meta;
  }

  getHealth(): StorageHealth {
    const raw = this.loadRaw();
    if (!raw) {
      return {
        empty: true,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        deviceId: null,
        rev: 0,
        updatedAt: null,
        hasBackup: this.looksJson(this.backend.getItem(BACKUP_KEY)),
        hasSnapshot: this.looksJson(this.backend.getItem(SNAPSHOT_KEY)),
        bytes: 0
      };
    }
    const state = this.getState();
    return {
      empty: false,
      schemaVersion: state.meta?.schemaVersion ?? state.profile.schemaVersion ?? CURRENT_SCHEMA_VERSION,
      deviceId: state.meta?.deviceId ?? null,
      rev: state.meta?.rev ?? 0,
      updatedAt: state.meta?.updatedAt ?? null,
      hasBackup: this.looksJson(this.backend.getItem(BACKUP_KEY)),
      hasSnapshot: this.looksJson(this.backend.getItem(SNAPSHOT_KEY)),
      bytes: raw.length
    };
  }

  exportJson(options?: { redact?: boolean }): string {
    const state = options?.redact ? redactState(this.getState()) : this.getState();
    return serializeBackup(state, this.clock());
  }

  listFokusKeys(): string[] {
    return listFokusKeys(this.backend);
  }

  inventory(): InventoryReport {
    return inventoryLocalData(this.backend);
  }

  clearPii(kinds: PiiKind[]) {
    this.saveState(stripPii(this.getState(), kinds));
  }

  resetProgress() {
    this.saveState(resetProgressState(this.getState(), { schemaVersion: CURRENT_SCHEMA_VERSION }));
  }

  inspectImport(json: string): { ok: true; preview: ImportPreview } | { ok: false; error: string } {
    const parsed = parseBackup(json);
    if (!parsed.ok) return parsed;
    try {
      const incoming = migrateState(parsed.raw, { now: this.clock() });
      return { ok: true, preview: previewImport(this.getState(), incoming, parsed) };
    } catch {
      return { ok: false, error: 'not_fokus' };
    }
  }

  importBackup(json: string, mode: ImportMode = 'merge'): ImportResult {
    const local = this.getState();
    const result = applyImport(local, json, mode, { now: this.clock() });
    if (!result.ok) return { ok: false, error: result.error };
    this.snapshotLive();
    const written = this.saveState(result.state);
    if (!written) return { ok: false, error: 'write_failed' };
    return {
      ok: true,
      mode,
      report: result.report,
      preview: result.preview,
      warnings: result.warnings
    };
  }

  importJson(json: string, opts?: { mode?: ImportMode }): boolean {
    return this.importBackup(json, opts?.mode ?? 'merge').ok;
  }

  hasSnapshot(): boolean {
    return this.looksJson(this.backend.getItem(SNAPSHOT_KEY));
  }

  restoreSnapshot(): boolean {
    const snap = this.backend.getItem(SNAPSHOT_KEY);
    if (!this.looksJson(snap)) return false;
    const live = this.backend.getItem(STORAGE_KEY);
    if (this.looksJson(live)) {
      try {
        this.backend.setItem(BACKUP_KEY, live as string);
      } catch {
        /* ignore */
      }
    }
    try {
      const migrated = migrateState(JSON.parse(snap as string), { now: this.clock() });
      return this.writeRaw(JSON.stringify(migrated));
    } catch {
      return false;
    }
  }

  reset() {
    wipeFokusKeys(this.backend);
  }
}

const fallbackStorage: StorageBackend = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

function liveBackend(): StorageBackend {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    /* Node experimental localStorage or blocked access */
  }
  return fallbackStorage;
}

export const storage = new Storage({
  getItem: (key) => liveBackend().getItem(key),
  setItem: (key, value) => liveBackend().setItem(key, value),
  removeItem: (key) => liveBackend().removeItem(key),
  keys: () => {
    const b = liveBackend();
    if (typeof b.keys === 'function') return b.keys();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const out: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) out.push(k);
        }
        return out;
      }
    } catch { /* ignore */ }
    return [];
  }
});
