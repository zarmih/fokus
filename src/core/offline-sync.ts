import type {
  AppState,
  DaySummary,
  DomainIndex,
  ExerciseState,
  HistoryItem,
  Profile,
  Session,
  SkillIndex,
  StorageMeta
} from './types';

export const CURRENT_SCHEMA_VERSION = 4;
export const CURRENT_BACKUP_FORMAT = 1;
export const BACKUP_KIND = 'fokus-backup';

export class FutureSchemaError extends Error {
  constructor(public version: number) {
    super(`future schema ${version}`);
    this.name = 'FutureSchemaError';
  }
}

export class FutureFormatError extends Error {
  constructor(public format: number) {
    super(`future backup format ${format}`);
    this.name = 'FutureFormatError';
  }
}

export type ImportMode = 'merge' | 'replace';

export type ParseBackupResult =
  | {
      ok: true;
      format: number;
      legacy: boolean;
      checksumOk: boolean;
      schemaVersion: number;
      exportedAt: string | null;
      raw: unknown;
      warnings: string[];
    }
  | { ok: false; error: string };

export interface MergeReport {
  mode: ImportMode;
  sessionsAdded: number;
  sessionsKept: number;
  daysAdded: number;
  daysMerged: number;
  historyAdded: number;
  exercisesUpdated: number;
  skillsUpdated: number;
  domainsUpdated: number;
  profileChanged: boolean;
  xpLocal: number;
  xpIncoming: number;
  xpResult: number;
}

export interface ImportPreview {
  format: number;
  legacy: boolean;
  checksumOk: boolean;
  schemaVersion: number;
  exportedAt: string | null;
  deviceId: string | null;
  rev: number | null;
  updatedAt: string | null;
  profileName: string;
  xp: number;
  sessions: number;
  sessionsNew: number;
  days: number;
  daysNew: number;
  history: number;
  exercises: number;
  warnings: string[];
}

export interface BackupEnvelope {
  kind: typeof BACKUP_KIND;
  format: number;
  exportedAt: string;
  checksum: string;
  payload: unknown;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function newDeviceId(nowMs = Date.now(), rand = Math.random): string {
  return `f-${nowMs.toString(36)}-${rand().toString(36).slice(2, 10)}`;
}

/** FNV-1a 32-bit, hex. Integrity check, not a cryptographic hash. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function inferSchemaVersion(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 1;
  const rec = raw as Record<string, unknown>;
  const meta = rec.meta as Record<string, unknown> | undefined;
  if (meta && typeof meta.schemaVersion === 'number') return meta.schemaVersion;
  const profile = rec.profile as Record<string, unknown> | undefined;
  if (profile && typeof profile.schemaVersion === 'number') return profile.schemaVersion;
  return 1;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeCollections(raw: unknown): Record<string, unknown> {
  const rec = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
  rec.profile = rec.profile && typeof rec.profile === 'object' ? { ...(rec.profile as object) } : {};
  rec.domains = asArray(rec.domains);
  rec.skills = asArray(rec.skills);
  rec.exerciseStates = asArray(rec.exerciseStates);
  rec.sessions = asArray(rec.sessions);
  rec.daySummaries = asArray(rec.daySummaries);
  rec.history = asArray(rec.history);
  return rec;
}

function migrate1to2(state: Record<string, unknown>) {
  const profile = state.profile as Record<string, unknown>;
  profile.onboarded = !!profile.calibrated;
  if (!Array.isArray(state.history)) state.history = [];
  if (!Array.isArray(state.skills)) state.skills = [];
  profile.schemaVersion = 2;
}

function migrate2to3(state: Record<string, unknown>) {
  const skills = asArray<Record<string, unknown>>(state.skills);
  skills.forEach((s) => {
    if (!s.sources) s.sources = [];
  });
  state.skills = skills;
  const exerciseStates = asArray<Record<string, unknown>>(state.exerciseStates);
  exerciseStates.forEach((st) => {
    if (typeof st.mastery === 'undefined') st.mastery = 0;
    if (typeof st.stability === 'undefined') st.stability = 0.5;
    if (typeof st.consecutivePlateau === 'undefined') st.consecutivePlateau = 0;
  });
  state.exerciseStates = exerciseStates;
  (state.profile as Record<string, unknown>).schemaVersion = 3;
}

function keyed<T>(items: T[], keyOf: (item: T, index: number) => string, pick: (a: T, b: T) => T): T[] {
  const map = new Map<string, T>();
  items.forEach((item, i) => {
    const key = keyOf(item, i);
    const prev = map.get(key);
    map.set(key, prev ? pick(prev, item) : item);
  });
  return [...map.values()];
}

function laterIso(a?: string, b?: string): string {
  if (!a) return b || '';
  if (!b) return a;
  return a >= b ? a : b;
}

function pickLater<T extends { lastPlayedAt?: string; lastUpdated?: string; updatedAt?: string; finishedAt?: string | null; startedAt?: string }>(
  a: T,
  b: T,
  field: 'lastPlayedAt' | 'lastUpdated' | 'updatedAt' | 'finishedAt' | 'startedAt'
): T {
  const av = (a as Record<string, unknown>)[field];
  const bv = (b as Record<string, unknown>)[field];
  const as = typeof av === 'string' ? av : '';
  const bs = typeof bv === 'string' ? bv : '';
  return bs > as ? b : a;
}

function migrate3to4(state: Record<string, unknown>, opts: { now: string; deviceId: string }) {
  state.sessions = keyed(asArray<Session>(state.sessions), (s, i) => s.id || `__anon_s_${i}`, (a, b) =>
    pickLater(a, b, 'finishedAt')
  );
  state.daySummaries = keyed(
    asArray<DaySummary>(state.daySummaries),
    (d, i) => d.date || `__anon_d_${i}`,
    (a, b) => ((b.totalScore || 0) > (a.totalScore || 0) ? b : a)
  );
  state.history = keyed(
    asArray<HistoryItem>(state.history),
    (h, i) => h.date || `__anon_h_${i}`,
    (a, b) => ((b.score || 0) > (a.score || 0) ? b : a)
  );
  state.exerciseStates = keyed(
    asArray<ExerciseState>(state.exerciseStates),
    (e, i) => e.exerciseId || `__anon_e_${i}`,
    (a, b) => pickLater(a, b, 'lastPlayedAt')
  );
  state.skills = keyed(
    asArray<SkillIndex>(state.skills),
    (s, i) => s.skill || `__anon_sk_${i}`,
    (a, b) => pickLater(a, b, 'lastUpdated')
  );
  state.domains = keyed(
    asArray<DomainIndex>(state.domains),
    (d, i) => d.domain || `__anon_dm_${i}`,
    (a, b) => pickLater(a, b, 'updatedAt')
  );

  const prevMeta = state.meta && typeof state.meta === 'object' ? (state.meta as Record<string, unknown>) : {};
  const meta: StorageMeta = {
    schemaVersion: 4,
    deviceId: typeof prevMeta.deviceId === 'string' && prevMeta.deviceId ? prevMeta.deviceId : opts.deviceId,
    rev: typeof prevMeta.rev === 'number' && prevMeta.rev > 0 ? prevMeta.rev : 1,
    updatedAt: typeof prevMeta.updatedAt === 'string' && prevMeta.updatedAt ? prevMeta.updatedAt : opts.now
  };
  state.meta = meta;
  (state.profile as Record<string, unknown>).schemaVersion = 4;
}

function healV4(state: Record<string, unknown>, opts: { now: string; deviceId: string }) {
  const profile = state.profile as Record<string, unknown>;
  if (typeof profile.sessionLengthSec !== 'number') profile.sessionLengthSec = 300;
  if (typeof profile.soundOn !== 'boolean') profile.soundOn = true;
  if (typeof profile.locale !== 'string') profile.locale = 'ru';
  if (typeof profile.xp !== 'number') profile.xp = 0;
  if (!profile.createdAt) profile.createdAt = opts.now;
  if (!profile.name) profile.name = 'User';
  profile.schemaVersion = CURRENT_SCHEMA_VERSION;

  const prev = state.meta && typeof state.meta === 'object' ? (state.meta as Record<string, unknown>) : {};
  state.meta = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    deviceId: typeof prev.deviceId === 'string' && prev.deviceId ? prev.deviceId : opts.deviceId,
    rev: typeof prev.rev === 'number' && prev.rev > 0 ? prev.rev : 1,
    updatedAt: typeof prev.updatedAt === 'string' && prev.updatedAt ? prev.updatedAt : opts.now
  } satisfies StorageMeta;
}

export function migrateState(
  raw: unknown,
  opts?: { now?: string; deviceId?: string }
): AppState {
  const now = opts?.now || new Date().toISOString();
  const deviceId = opts?.deviceId || newDeviceId();
  const state = normalizeCollections(raw);
  let version = inferSchemaVersion(state);
  if (version > CURRENT_SCHEMA_VERSION) throw new FutureSchemaError(version);
  if (version < 1) version = 1;
  if (version < 2) {
    migrate1to2(state);
    version = 2;
  }
  if (version < 3) {
    migrate2to3(state);
    version = 3;
  }
  if (version < 4) {
    migrate3to4(state, { now, deviceId });
    version = 4;
  }
  healV4(state, { now, deviceId });
  return state as unknown as AppState;
}

export function serializeBackup(state: AppState, exportedAt = new Date().toISOString()): string {
  const payload = cloneJson(state);
  const envelope: BackupEnvelope = {
    kind: BACKUP_KIND,
    format: CURRENT_BACKUP_FORMAT,
    exportedAt,
    checksum: fnv1a(JSON.stringify(payload)),
    payload
  };
  return JSON.stringify(envelope);
}

export function isEnvelope(value: unknown): value is BackupEnvelope {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return rec.kind === BACKUP_KIND && typeof rec.format === 'number' && 'payload' in rec;
}

export function parseBackup(json: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'not_fokus' };

  const warnings: string[] = [];

  if (isEnvelope(parsed)) {
    if (parsed.format > CURRENT_BACKUP_FORMAT) {
      return { ok: false, error: 'future_format' };
    }
    if (parsed.format < 1) return { ok: false, error: 'not_fokus' };
    const payloadJson = JSON.stringify(parsed.payload);
    const expected = fnv1a(payloadJson);
    const checksumOk = typeof parsed.checksum === 'string' && parsed.checksum === expected;
    if (!checksumOk) return { ok: false, error: 'checksum' };
    const schemaVersion = inferSchemaVersion(parsed.payload);
    if (schemaVersion > CURRENT_SCHEMA_VERSION) return { ok: false, error: 'future_schema' };
    if (!parsed.payload || typeof parsed.payload !== 'object' || !('profile' in (parsed.payload as object))) {
      return { ok: false, error: 'not_fokus' };
    }
    if (parsed.format < CURRENT_BACKUP_FORMAT) warnings.push('old_format');
    return {
      ok: true,
      format: parsed.format,
      legacy: false,
      checksumOk: true,
      schemaVersion,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
      raw: parsed.payload,
      warnings
    };
  }

  const rec = parsed as Record<string, unknown>;
  if (!rec.profile || typeof rec.profile !== 'object') return { ok: false, error: 'not_fokus' };
  const schemaVersion = inferSchemaVersion(parsed);
  if (schemaVersion > CURRENT_SCHEMA_VERSION) return { ok: false, error: 'future_schema' };
  warnings.push('legacy_raw');
  return {
    ok: true,
    format: 0,
    legacy: true,
    checksumOk: true,
    schemaVersion,
    exportedAt: null,
    raw: parsed,
    warnings
  };
}

function unionStrings(a?: string[], b?: string[]): string[] {
  return [...new Set([...(a || []), ...(b || [])])];
}

function xpOf(profile?: Profile): number {
  return typeof profile?.xp === 'number' ? profile.xp : 0;
}

function mergeProfile(local: Profile, incoming: Profile, localWinsScalars: boolean): Profile {
  const base = localWinsScalars ? local : incoming;
  const other = localWinsScalars ? incoming : local;
  const createdAt =
    local.createdAt && incoming.createdAt
      ? local.createdAt <= incoming.createdAt
        ? local.createdAt
        : incoming.createdAt
      : local.createdAt || incoming.createdAt;
  return {
    ...other,
    ...base,
    createdAt,
    xp: Math.max(xpOf(local), xpOf(incoming)),
    achievements: unionStrings(local.achievements, incoming.achievements),
    onboarded: !!(local.onboarded || incoming.onboarded),
    calibrated: !!(local.calibrated || incoming.calibrated),
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
}

function mergeExercise(a: ExerciseState, b: ExerciseState): ExerciseState {
  const later = pickLater(a, b, 'lastPlayedAt');
  const earlier = later === a ? b : a;
  return {
    ...later,
    attempts: Math.max(a.attempts || 0, b.attempts || 0),
    mastery: Math.max(a.mastery || 0, b.mastery || 0),
    stability: later.stability ?? earlier.stability,
    consecutivePlateau: later.consecutivePlateau ?? earlier.consecutivePlateau
  };
}

function mergeSkill(a: SkillIndex, b: SkillIndex): SkillIndex {
  const later = pickLater(a, b, 'lastUpdated');
  return {
    ...later,
    attempts: Math.max(a.attempts || 0, b.attempts || 0),
    confidence: Math.max(a.confidence || 0, b.confidence || 0),
    sources: unionStrings(a.sources, b.sources)
  };
}

function mergeDomain(a: DomainIndex, b: DomainIndex): DomainIndex {
  return { ...pickLater(a, b, 'updatedAt') };
}

function mergeDay(a: DaySummary, b: DaySummary): DaySummary {
  const playedA = !a.skipped && (a.totalScore || 0) > 0;
  const playedB = !b.skipped && (b.totalScore || 0) > 0;
  const richer = (b.totalScore || 0) > (a.totalScore || 0) ? b : a;
  const other = richer === a ? b : a;
  return {
    ...richer,
    streak: Math.max(a.streak || 0, b.streak || 0),
    skipped: playedA || playedB ? false : a.skipped && b.skipped,
    fokusIndex:
      typeof a.fokusIndex === 'number' || typeof b.fokusIndex === 'number'
        ? Math.max(a.fokusIndex || 0, b.fokusIndex || 0)
        : richer.fokusIndex,
    lifestyle: richer.lifestyle || other.lifestyle,
    domainDeltas: Object.keys(richer.domainDeltas || {}).length ? richer.domainDeltas : other.domainDeltas
  };
}

function mergeHistory(a: HistoryItem, b: HistoryItem): HistoryItem {
  return (b.score || 0) > (a.score || 0) ? b : a;
}

function mergeSession(a: Session, b: Session): Session {
  return pickLater(a, b, 'finishedAt');
}

function indexBy<T>(items: T[], keyOf: (item: T, i: number) => string): Map<string, T> {
  const map = new Map<string, T>();
  items.forEach((item, i) => map.set(keyOf(item, i), item));
  return map;
}

export function mergeStates(local: AppState, incoming: AppState, mode: ImportMode = 'merge'): { state: AppState; report: MergeReport } {
  const localXp = xpOf(local.profile);
  const incomingXp = xpOf(incoming.profile);

  if (mode === 'replace') {
    const deviceId = local.meta?.deviceId || incoming.meta?.deviceId || newDeviceId();
    const state: AppState = cloneJson(incoming);
    state.profile = { ...incoming.profile, schemaVersion: CURRENT_SCHEMA_VERSION };
    state.meta = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      deviceId,
      rev: Math.max(local.meta?.rev || 0, incoming.meta?.rev || 0),
      updatedAt: laterIso(local.meta?.updatedAt, incoming.meta?.updatedAt)
    };
    return {
      state,
      report: {
        mode,
        sessionsAdded: incoming.sessions.length,
        sessionsKept: 0,
        daysAdded: incoming.daySummaries.length,
        daysMerged: 0,
        historyAdded: incoming.history.length,
        exercisesUpdated: incoming.exerciseStates.length,
        skillsUpdated: incoming.skills.length,
        domainsUpdated: incoming.domains.length,
        profileChanged: true,
        xpLocal: localXp,
        xpIncoming: incomingXp,
        xpResult: incomingXp
      }
    };
  }

  const localWins = (local.meta?.updatedAt || '') >= (incoming.meta?.updatedAt || '');
  const profile = mergeProfile(local.profile, incoming.profile, localWins);

  const sessionKey = (s: Session, i: number) => s.id || `__anon_s_${i}`;
  const localSessions = indexBy(local.sessions, sessionKey);
  let sessionsAdded = 0;
  const sessions = keyed(
    [...local.sessions, ...incoming.sessions],
    sessionKey,
    mergeSession
  );
  incoming.sessions.forEach((s, i) => {
    if (!localSessions.has(sessionKey(s, i))) sessionsAdded++;
  });

  const dayKey = (d: DaySummary, i: number) => d.date || `__anon_d_${i}`;
  const localDays = indexBy(local.daySummaries, dayKey);
  let daysAdded = 0;
  let daysMerged = 0;
  incoming.daySummaries.forEach((d, i) => {
    if (localDays.has(dayKey(d, i))) daysMerged++;
    else daysAdded++;
  });
  const daySummaries = keyed([...local.daySummaries, ...incoming.daySummaries], dayKey, mergeDay);

  const historyKey = (h: HistoryItem, i: number) => h.date || `__anon_h_${i}`;
  const localHistory = indexBy(local.history, historyKey);
  let historyAdded = 0;
  incoming.history.forEach((h, i) => {
    if (!localHistory.has(historyKey(h, i))) historyAdded++;
  });
  const history = keyed([...local.history, ...incoming.history], historyKey, mergeHistory);

  const exKey = (e: ExerciseState, i: number) => e.exerciseId || `__anon_e_${i}`;
  const localEx = indexBy(local.exerciseStates, exKey);
  let exercisesUpdated = 0;
  incoming.exerciseStates.forEach((e, i) => {
    const prev = localEx.get(exKey(e, i));
    if (!prev || prev.lastPlayedAt !== e.lastPlayedAt || (e.attempts || 0) > (prev.attempts || 0)) {
      exercisesUpdated++;
    }
  });
  const exerciseStates = keyed([...local.exerciseStates, ...incoming.exerciseStates], exKey, mergeExercise);

  const skillKey = (s: SkillIndex, i: number) => s.skill || `__anon_sk_${i}`;
  const localSkills = indexBy(local.skills, skillKey);
  let skillsUpdated = 0;
  incoming.skills.forEach((s, i) => {
    const prev = localSkills.get(skillKey(s, i));
    if (!prev || prev.lastUpdated !== s.lastUpdated || (s.attempts || 0) > (prev.attempts || 0)) skillsUpdated++;
  });
  const skills = keyed([...local.skills, ...incoming.skills], skillKey, mergeSkill);

  const domainKey = (d: DomainIndex, i: number) => d.domain || `__anon_dm_${i}`;
  let domainsUpdated = 0;
  incoming.domains.forEach(() => domainsUpdated++);
  const domains = keyed([...local.domains, ...incoming.domains], domainKey, mergeDomain);

  const state: AppState = {
    profile,
    domains,
    skills,
    exerciseStates,
    sessions,
    daySummaries,
    history,
    meta: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      deviceId: local.meta?.deviceId || incoming.meta?.deviceId || newDeviceId(),
      rev: Math.max(local.meta?.rev || 0, incoming.meta?.rev || 0),
      updatedAt: laterIso(local.meta?.updatedAt, incoming.meta?.updatedAt)
    }
  };

  return {
    state,
    report: {
      mode,
      sessionsAdded,
      sessionsKept: local.sessions.length,
      daysAdded,
      daysMerged,
      historyAdded,
      exercisesUpdated,
      skillsUpdated,
      domainsUpdated,
      profileChanged: JSON.stringify(profile) !== JSON.stringify(local.profile),
      xpLocal: localXp,
      xpIncoming: incomingXp,
      xpResult: profile.xp || 0
    }
  };
}

export function previewImport(local: AppState, incoming: AppState, parsed: Extract<ParseBackupResult, { ok: true }>): ImportPreview {
  const sessionKey = (s: Session, i: number) => s.id || `__anon_s_${i}`;
  const dayKey = (d: DaySummary, i: number) => d.date || `__anon_d_${i}`;
  const localSessions = new Set(local.sessions.map(sessionKey));
  const localDays = new Set(local.daySummaries.map(dayKey));
  return {
    format: parsed.format,
    legacy: parsed.legacy,
    checksumOk: parsed.checksumOk,
    schemaVersion: parsed.schemaVersion,
    exportedAt: parsed.exportedAt,
    deviceId: incoming.meta?.deviceId || null,
    rev: incoming.meta?.rev ?? null,
    updatedAt: incoming.meta?.updatedAt || null,
    profileName: incoming.profile?.name || 'User',
    xp: xpOf(incoming.profile),
    sessions: incoming.sessions.length,
    sessionsNew: incoming.sessions.filter((s, i) => !localSessions.has(sessionKey(s, i))).length,
    days: incoming.daySummaries.length,
    daysNew: incoming.daySummaries.filter((d, i) => !localDays.has(dayKey(d, i))).length,
    history: incoming.history.length,
    exercises: incoming.exerciseStates.length,
    warnings: parsed.warnings
  };
}

export function applyImport(
  local: AppState,
  json: string,
  mode: ImportMode,
  opts?: { now?: string; deviceId?: string }
):
  | { ok: true; state: AppState; report: MergeReport; preview: ImportPreview; warnings: string[] }
  | { ok: false; error: string } {
  const parsed = parseBackup(json);
  if (!parsed.ok) return parsed;
  let incoming: AppState;
  try {
    incoming = migrateState(parsed.raw, opts);
  } catch (e) {
    if (e instanceof FutureSchemaError) return { ok: false, error: 'future_schema' };
    if (e instanceof FutureFormatError) return { ok: false, error: 'future_format' };
    return { ok: false, error: 'not_fokus' };
  }
  const { state, report } = mergeStates(local, incoming, mode);
  const preview = previewImport(local, incoming, parsed);
  return { ok: true, state, report, preview, warnings: parsed.warnings };
}
