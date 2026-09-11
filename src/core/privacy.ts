import type { AppState, DaySummary, Profile } from './types';

export const FOKUS_KEY_PREFIX = 'fokus.';
export const APP_STATE_KEY = 'fokus.v1';
export const REMINDER_LAST_KEY = 'fokus.reminder.last';
export const ANON_NAME = 'User';
export const WIPE_CONFIRM_WORD = 'УДАЛИТЬ';

export type StoreCategory = 'state' | 'preference' | 'cache' | 'unknown';
export type PiiKind = 'name' | 'lifestyle';
export type WipeScope = 'progress' | 'all';

export interface KnownStoreSpec {
  id: string;
  key: string;
  title: string;
  description: string;
  mayContainPii: boolean;
  category: StoreCategory;
}

export interface InventoryItem extends KnownStoreSpec {
  present: boolean;
  bytes: number;
  piiPresent: boolean;
}

export interface InventoryReport {
  items: InventoryItem[];
  totalBytes: number;
  piiPresent: boolean;
  pii: { name: boolean; lifestyle: boolean };
}

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys?(): string[];
}

export interface ExportFile {
  filename: string;
  body: string;
  redacted: boolean;
}

/** Catalog of every Fokus-owned local key. Cache Storage is listed in the UI, not here. */
export const KNOWN_STORES: KnownStoreSpec[] = [
  {
    id: 'app-state',
    key: APP_STATE_KEY,
    title: 'Профиль и прогресс',
    description:
      'Имя (если задано), настройки, сессии, XP, сон/стресс, Fokus Index. Только localStorage этого устройства.',
    mayContainPii: true,
    category: 'state'
  },
  {
    id: 'reminder',
    key: REMINDER_LAST_KEY,
    title: 'Последнее напоминание',
    description: 'Дата YYYY-MM-DD, чтобы не слать локальное уведомление дважды за день. Не имя и не сон.',
    mayContainPii: false,
    category: 'preference'
  }
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PII_KEY_RE = /^(name|displayName|lastLifestyle|lifestyle|email|phone|sdp|candidate|ice|iceCandidate)$/i;

export function utf8Bytes(value: string): number {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1).replace(/\.0$/, '')} КБ`;
  }
  const mb = n / (1024 * 1024);
  return `${mb.toFixed(1).replace(/\.0$/, '')} МБ`;
}

export function isWipeConfirm(value: string): boolean {
  return value.trim() === WIPE_CONFIRM_WORD;
}

export function listFokusKeys(store: StorageBackend): string[] {
  if (typeof store.keys === 'function') {
    return store.keys().filter((k) => k.startsWith(FOKUS_KEY_PREFIX));
  }
  return KNOWN_STORES.map((s) => s.key).filter((k) => store.getItem(k) != null);
}

export function detectStoredPii(state: Partial<AppState> | null | undefined): { name: boolean; lifestyle: boolean } {
  const profile = state?.profile;
  const nameValue = (profile?.displayName || '').trim() || (profile?.name || '').trim();
  const name = !!nameValue && nameValue !== ANON_NAME;
  const fromDays = (state?.daySummaries || []).some((d) => !!(d && d.lifestyle));
  const lifestyle = !!profile?.lastLifestyle || fromDays;
  return { name, lifestyle };
}

function looksLikePiiPayload(raw: string): boolean {
  try {
    return jsonContainsPii(JSON.parse(raw));
  } catch {
    EMAIL_RE.lastIndex = 0;
    return EMAIL_RE.test(raw);
  }
}

function jsonContainsPii(value: unknown, depth = 0): boolean {
  if (value == null || depth > 8) return false;
  if (typeof value === 'string') {
    EMAIL_RE.lastIndex = 0;
    return EMAIL_RE.test(value);
  }
  if (Array.isArray(value)) return value.some((v) => jsonContainsPii(v, depth + 1));
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEY_RE.test(k)) {
        if (k === 'name' && (v === ANON_NAME || v == null || v === '')) continue;
        if (v != null && v !== '') return true;
      }
      if (jsonContainsPii(v, depth + 1)) return true;
    }
  }
  return false;
}

export function inventoryLocalData(store: StorageBackend): InventoryReport {
  const listed = typeof store.keys === 'function' ? store.keys().filter((k) => k.startsWith(FOKUS_KEY_PREFIX)) : [];
  const items: InventoryItem[] = [];
  const seen = new Set<string>();
  let pii = { name: false, lifestyle: false };

  for (const spec of KNOWN_STORES) {
    seen.add(spec.key);
    const raw = store.getItem(spec.key);
    let piiPresent = false;
    if (raw && spec.id === 'app-state') {
      try {
        pii = detectStoredPii(JSON.parse(raw));
        piiPresent = pii.name || pii.lifestyle;
      } catch {
        piiPresent = looksLikePiiPayload(raw);
      }
    } else if (raw && spec.mayContainPii) {
      piiPresent = looksLikePiiPayload(raw);
    }
    items.push({
      ...spec,
      present: raw != null,
      bytes: raw ? utf8Bytes(raw) : 0,
      piiPresent
    });
  }

  for (const key of listed) {
    if (seen.has(key)) continue;
    const raw = store.getItem(key) ?? '';
    items.push({
      id: `unknown:${key}`,
      key,
      title: 'Другие данные Fokus',
      description: 'Ключ с префиксом fokus., которого нет в каталоге.',
      mayContainPii: true,
      category: 'unknown',
      present: true,
      bytes: utf8Bytes(raw),
      piiPresent: looksLikePiiPayload(raw)
    });
  }

  return {
    items,
    totalBytes: items.reduce((sum, item) => sum + item.bytes, 0),
    piiPresent: items.some((item) => item.piiPresent),
    pii
  };
}

export function redactState<T>(state: T): T {
  const next = JSON.parse(JSON.stringify(state ?? {})) as AppState & Record<string, unknown>;
  if (next && typeof next === 'object' && next.profile && typeof next.profile === 'object') {
    next.profile.name = ANON_NAME;
    delete next.profile.displayName;
    delete next.profile.lastLifestyle;
  }
  if (Array.isArray(next.daySummaries)) {
    next.daySummaries = next.daySummaries.map((day) => {
      if (!day || typeof day !== 'object') return day;
      const { lifestyle: _lifestyle, ...rest } = day as DaySummary;
      return rest as DaySummary;
    });
  }
  return next as T;
}

export function redactExportJson(raw: string): string {
  try {
    return JSON.stringify(redactState(JSON.parse(raw)));
  } catch {
    return JSON.stringify({ profile: { name: ANON_NAME } });
  }
}

export function buildExportFile(rawJson: string, redacted: boolean, now = new Date()): ExportFile {
  const date = now.toISOString().slice(0, 10);
  return {
    redacted,
    body: redacted ? redactExportJson(rawJson) : rawJson,
    filename: redacted ? `fokus-data-${date}.json` : `fokus-data-${date}-full.json`
  };
}

export function stripPii(state: AppState, kinds: PiiKind[]): AppState {
  const next = JSON.parse(JSON.stringify(state)) as AppState;
  if (kinds.includes('name') && next.profile) {
    next.profile.name = ANON_NAME;
    delete next.profile.displayName;
  }
  if (kinds.includes('lifestyle')) {
    if (next.profile) delete next.profile.lastLifestyle;
    next.daySummaries = (next.daySummaries || []).map((day) => {
      if (!day || typeof day !== 'object') return day;
      const { lifestyle: _lifestyle, ...rest } = day;
      return rest as DaySummary;
    });
  }
  return next;
}

export function resetProgressState(
  state: AppState,
  opts: { now?: string; schemaVersion: number }
): AppState {
  const p = state.profile || ({} as Profile);
  return {
    profile: {
      name: ANON_NAME,
      createdAt: opts.now || new Date().toISOString(),
      sessionLengthSec: typeof p.sessionLengthSec === 'number' ? p.sessionLengthSec : 300,
      soundOn: p.soundOn !== false,
      onboarded: !!p.onboarded,
      theme: p.theme,
      language: p.language,
      locale: p.locale || 'ru',
      schemaVersion: opts.schemaVersion,
      primaryGoal: p.primaryGoal,
      reminderHour: p.reminderHour,
      skipLifestylePrompt: p.skipLifestylePrompt,
      xp: 0
    },
    domains: [],
    skills: [],
    exerciseStates: [],
    sessions: [],
    daySummaries: [],
    history: []
  };
}

export function wipeFokusKeys(store: StorageBackend): string[] {
  const keys = listFokusKeys(store);
  for (const key of keys) store.removeItem(key);
  return keys;
}

export async function wipeAppCaches(): Promise<string[]> {
  if (typeof caches === 'undefined') return [];
  try {
    const names = await caches.keys();
    const fokus = names.filter((n) => n.startsWith('fokus'));
    await Promise.all(fokus.map((n) => caches.delete(n)));
    return fokus;
  } catch {
    return [];
  }
}

export function redactString(value: string): string {
  EMAIL_RE.lastIndex = 0;
  return value.replace(EMAIL_RE, '[redacted]');
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 8) return '[…]';
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => redactForLog(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = PII_KEY_RE.test(key) ? '[redacted]' : redactForLog(entry, depth + 1);
    }
    return out;
  }
  return String(value);
}
