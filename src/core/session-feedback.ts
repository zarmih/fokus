/**
 * Post-session feel feedback (👍 / 😐 / 👎 + optional note).
 * Local-only: nothing leaves the device. Separate from product-feedback.
 */

import { addCalendarDays, calendarDayKey, PREFERRED_TIME_ZONE, resolveFokusTimeZone } from './streak';

export const SESSION_FEEDBACK_KEY = 'fokus.session-feedback.v1';
export const SESSION_FEEDBACK_SCHEMA = 1;
export const SESSION_FEEDBACK_NOTE_MAX = 280;
export const SESSION_FEEDBACK_MAX_ENTRIES = 200;

export type SessionFeel = 'up' | 'neutral' | 'down';

export interface SessionFeedbackEntry {
  id: string;
  sessionId: string;
  feel: SessionFeel;
  note: string;
  createdAt: string;
}

export interface SessionFeedbackStore {
  schema: number;
  entries: SessionFeedbackEntry[];
}

export interface SessionFeelAggregate {
  days: number;
  total: number;
  up: number;
  neutral: number;
  down: number;
  /** Short Russian summary for Progress UI. */
  summaryRu: string;
  empty: boolean;
}

export function emptySessionFeedbackStore(): SessionFeedbackStore {
  return { schema: SESSION_FEEDBACK_SCHEMA, entries: [] };
}

export function parseSessionFeedbackStore(raw: string | null): SessionFeedbackStore {
  if (!raw) return emptySessionFeedbackStore();
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return emptySessionFeedbackStore();
    const entries = Array.isArray(v.entries)
      ? v.entries
          .filter(
            (e: unknown) =>
              e &&
              typeof e === 'object' &&
              typeof (e as SessionFeedbackEntry).id === 'string' &&
              typeof (e as SessionFeedbackEntry).sessionId === 'string' &&
              isFeel((e as SessionFeedbackEntry).feel)
          )
          .slice(0, SESSION_FEEDBACK_MAX_ENTRIES)
          .map((e: SessionFeedbackEntry) => ({
            id: String(e.id),
            sessionId: String(e.sessionId).slice(0, 120),
            feel: e.feel as SessionFeel,
            note: typeof e.note === 'string' ? e.note.slice(0, SESSION_FEEDBACK_NOTE_MAX) : '',
            createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString()
          }))
      : [];
    return { schema: SESSION_FEEDBACK_SCHEMA, entries };
  } catch {
    return emptySessionFeedbackStore();
  }
}

export function serializeSessionFeedbackStore(store: SessionFeedbackStore): string {
  return JSON.stringify({ ...store, schema: SESSION_FEEDBACK_SCHEMA });
}

function isFeel(v: unknown): v is SessionFeel {
  return v === 'up' || v === 'neutral' || v === 'down';
}

export function addSessionFeedback(
  store: SessionFeedbackStore,
  input: { sessionId: string; feel: SessionFeel; note?: string },
  now = new Date(),
  rand = Math.random
): SessionFeedbackStore {
  const sessionId = String(input.sessionId || '').trim().slice(0, 120);
  if (!sessionId || !isFeel(input.feel)) return store;
  const note = String(input.note || '')
    .trim()
    .slice(0, SESSION_FEEDBACK_NOTE_MAX);
  const entry: SessionFeedbackEntry = {
    id: `sf_${now.getTime().toString(36)}_${Math.floor(rand() * 1e6).toString(36)}`,
    sessionId,
    feel: input.feel,
    note,
    createdAt: now.toISOString()
  };
  // One entry per session: replace prior rating for the same sessionId.
  const rest = store.entries.filter((e) => e.sessionId !== sessionId);
  return { ...store, entries: [entry, ...rest].slice(0, SESSION_FEEDBACK_MAX_ENTRIES) };
}

export function entryForSession(
  store: SessionFeedbackStore,
  sessionId: string
): SessionFeedbackEntry | null {
  return store.entries.find((e) => e.sessionId === sessionId) || null;
}

/** Aggregate ratings whose createdAt falls in the last `days` civil days (inclusive of today). */
export function aggregateSessionFeel(
  store: SessionFeedbackStore,
  days = 7,
  now = new Date(),
  timeZone?: string
): SessionFeelAggregate {
  const zone = resolveFokusTimeZone(timeZone).timeZone || PREFERRED_TIME_ZONE;
  const today = calendarDayKey(now, zone);
  const cutoffKey = addCalendarDays(today, -(Math.max(1, days) - 1));

  let up = 0;
  let neutral = 0;
  let down = 0;
  for (const e of store.entries) {
    const day = calendarDayKey(e.createdAt, zone);
    if (day < cutoffKey || day > today) continue;
    if (e.feel === 'up') up += 1;
    else if (e.feel === 'neutral') neutral += 1;
    else if (e.feel === 'down') down += 1;
  }
  const total = up + neutral + down;
  return {
    days: Math.max(1, days),
    total,
    up,
    neutral,
    down,
    summaryRu: summaryRu(up, neutral, down, Math.max(1, days)),
    empty: total === 0
  };
}

function summaryRu(up: number, neutral: number, down: number, days: number): string {
  const total = up + neutral + down;
  if (total === 0) {
    return `За ${days} дней пока нет отметок — после сессий можно коротко сказать, как ощущалось.`;
  }
  const parts: string[] = [];
  if (down > 0) parts.push(`сложно ${down}`);
  if (up > 0) parts.push(`легко ${up}`);
  if (neutral > 0) parts.push(`нейтрально ${neutral}`);
  let lead: string;
  if (down > up && down >= neutral) {
    lead = 'Чаще ощущалось сложно.';
  } else if (up > down && up >= neutral) {
    lead = 'Чаще ощущалось легко.';
  } else if (neutral >= up && neutral >= down) {
    lead = 'В основном ровно, без крайностей.';
  } else {
    lead = 'Смешанные ощущения.';
  }
  return `${lead} За ${days} дн.: ${parts.join(' · ')} (всего ${total}).`;
}

export function feelLabelRu(feel: SessionFeel): string {
  if (feel === 'up') return 'Легко';
  if (feel === 'down') return 'Сложно';
  return 'Нормально';
}

/* ——— localStorage I/O (same pattern as feedback-io) ——— */

type Backend = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultBackend(): Backend {
  return {
    getItem: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* quota */
      }
    },
    removeItem: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  };
}

let mem: SessionFeedbackStore | null = null;

export function loadSessionFeedback(store?: Backend): SessionFeedbackStore {
  if (mem && !store) return mem;
  const b = store || defaultBackend();
  mem = parseSessionFeedbackStore(b.getItem(SESSION_FEEDBACK_KEY));
  return mem;
}

export function saveSessionFeedback(next: SessionFeedbackStore, store?: Backend): SessionFeedbackStore {
  const b = store || defaultBackend();
  mem = next;
  b.setItem(SESSION_FEEDBACK_KEY, serializeSessionFeedbackStore(next));
  return next;
}

export function submitSessionFeedback(
  input: { sessionId: string; feel: SessionFeel; note?: string },
  store?: Backend,
  now = new Date(),
  rand = Math.random
): SessionFeedbackStore {
  const cur = loadSessionFeedback(store);
  return saveSessionFeedback(addSessionFeedback(cur, input, now, rand), store);
}

export function clearSessionFeedback(store?: Backend): void {
  const b = store || defaultBackend();
  b.removeItem(SESSION_FEEDBACK_KEY);
  mem = emptySessionFeedbackStore();
}

export function __resetSessionFeedbackMem() {
  mem = null;
}
