import type { FocusCheckpoint, FocusCheckpointItem, Session, SessionItem } from './types';

/** Four hours — after that the snapshot is an abandoned ritual, not a live pause. */
export const FOCUS_CHECKPOINT_TTL_MS = 4 * 60 * 60 * 1000;
export const FOCUS_TARGET_MIN_PX = 48;
export const TIMER_RING_R = 18;
export const TIMER_RING_C = 2 * Math.PI * TIMER_RING_R;

export interface FocusPrefs {
  enabled: boolean;
  timerRing: boolean;
  dnd: boolean;
}

export interface FocusFlags {
  active: boolean;
  hideChrome: boolean;
  largerTargets: boolean;
  timerRing: boolean;
  dnd: boolean;
}

export interface FocusCheckpointInput {
  sessionId: string;
  startedAt: string;
  savedAt?: string;
  mode: string;
  items: FocusCheckpointItem[];
  currentIndex: number;
  timeLeft: number;
  sessionBudget: number;
  results: SessionItem[];
  domainDeltas: Record<string, number>;
}

export type CheckpointVisit =
  | { kind: 'none' }
  | { kind: 'resume'; checkpoint: FocusCheckpoint }
  | { kind: 'stale-abandon'; session: Session }
  | { kind: 'stale-drop' };

let dndLive = false;

export function setFocusDndLive(live: boolean): void {
  dndLive = live;
}

export function isFocusDndLive(): boolean {
  return dndLive;
}

/** Reminders stay quiet while a DND session is on screen. */
export function shouldSuppressNotify(): boolean {
  return dndLive;
}

export function readFocusPrefs(profile: {
  focusMode?: boolean;
  focusTimerRing?: boolean;
  focusDnd?: boolean;
}): FocusPrefs {
  return {
    enabled: profile.focusMode !== false,
    timerRing: profile.focusTimerRing !== false,
    dnd: profile.focusDnd !== false
  };
}

/**
 * Full-session flags. Duel is out of scope. Practice and probes still get
 * chrome/targets so the play surface matches; only a normal ritual checkpoints.
 */
export function sessionFocusFlags(prefs: FocusPrefs, mode = 'normal'): FocusFlags {
  const active = prefs.enabled && mode !== 'duel';
  return {
    active,
    hideChrome: active,
    largerTargets: active,
    timerRing: active && prefs.timerRing,
    dnd: active && prefs.dnd
  };
}

export function formatSessionClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function timerRingProgress(timeLeft: number, budget: number): number {
  if (!(budget > 0)) return 0;
  if (!(timeLeft > 0)) return 0;
  return Math.min(1, Math.max(0, timeLeft / budget));
}

export function timerRingOffset(timeLeft: number, budget: number, circumference = TIMER_RING_C): number {
  return circumference * (1 - timerRingProgress(timeLeft, budget));
}

export function buildCheckpoint(input: FocusCheckpointInput, nowIso?: string): FocusCheckpoint {
  return {
    version: 1,
    sessionId: input.sessionId,
    startedAt: input.startedAt,
    savedAt: input.savedAt || nowIso || new Date().toISOString(),
    mode: input.mode,
    items: input.items.map((it) => ({ exerciseId: it.exerciseId, difficulty: it.difficulty })),
    currentIndex: input.currentIndex,
    timeLeft: input.timeLeft,
    sessionBudget: input.sessionBudget,
    results: input.results.map((r) => ({ ...r })),
    domainDeltas: { ...input.domainDeltas }
  };
}

export function isCheckpointFresh(cp: FocusCheckpoint | null | undefined, nowIso: string): boolean {
  if (!cp || cp.version !== 1) return false;
  if (cp.mode !== 'normal') return false;
  if (!Array.isArray(cp.items) || cp.items.length === 0) return false;
  if (!Array.isArray(cp.results)) return false;
  if (cp.currentIndex < 0 || cp.currentIndex >= cp.items.length) return false;
  if (!(cp.timeLeft > 0) || !(cp.sessionBudget > 0)) return false;
  if (!cp.items.every((it) => it && typeof it.exerciseId === 'string' && it.exerciseId)) return false;
  const saved = Date.parse(cp.savedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(saved) || !Number.isFinite(now)) return false;
  return now - saved <= FOCUS_CHECKPOINT_TTL_MS;
}

export function checkpointToAbandonedSession(cp: FocusCheckpoint): Session | null {
  if (!cp.results.length) return null;
  return {
    id: cp.sessionId,
    startedAt: cp.startedAt,
    finishedAt: null,
    durationSec: Math.max(0, cp.sessionBudget - cp.timeLeft),
    items: cp.results,
    interrupted: true,
    endReason: 'abandoned',
    plannedDurationSec: cp.sessionBudget
  };
}

/**
 * Today calls this once. Fresh → resume card. Stale with blocks → G8 abandoned
 * session. Stale empty → drop. Does not touch recovery.ts.
 */
export function visitCheckpoint(
  checkpoint: FocusCheckpoint | null | undefined,
  nowIso: string
): CheckpointVisit {
  if (!checkpoint) return { kind: 'none' };
  if (isCheckpointFresh(checkpoint, nowIso)) {
    return { kind: 'resume', checkpoint };
  }
  const abandoned = checkpointToAbandonedSession(checkpoint);
  if (abandoned) return { kind: 'stale-abandon', session: abandoned };
  return { kind: 'stale-drop' };
}

export function shouldSaveCheckpoint(params: {
  mode: string;
  focusActive: boolean;
  currentIndex: number;
  resultsCount: number;
  playing: boolean;
}): boolean {
  if (!params.focusActive || params.mode !== 'normal') return false;
  return params.resultsCount > 0 || params.currentIndex > 0 || params.playing;
}
