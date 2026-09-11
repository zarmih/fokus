import { expect, test, afterEach } from 'vitest';
import {
  FOCUS_CHECKPOINT_TTL_MS,
  TIMER_RING_C,
  buildCheckpoint,
  checkpointToAbandonedSession,
  formatSessionClock,
  isCheckpointFresh,
  isFocusDndLive,
  readFocusPrefs,
  sessionFocusFlags,
  setFocusDndLive,
  shouldSaveCheckpoint,
  shouldSuppressNotify,
  timerRingOffset,
  timerRingProgress,
  visitCheckpoint
} from '../src/core/focus-mode';
import type { FocusCheckpoint, SessionItem } from '../src/core/types';
import { CURRENT_SCHEMA_VERSION } from '../src/core/offline-sync';

afterEach(() => {
  setFocusDndLive(false);
});

function item(partial: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: partial.exerciseId || 'stroop',
    level: partial.level ?? 4,
    accuracy: partial.accuracy ?? 0.82,
    avgRtMs: partial.avgRtMs ?? 480,
    score: partial.score ?? 40
  };
}

function checkpoint(partial: Partial<FocusCheckpoint> = {}): FocusCheckpoint {
  return buildCheckpoint({
    sessionId: partial.sessionId || 'cp-1',
    startedAt: partial.startedAt || '2026-09-11T10:00:00.000Z',
    savedAt: partial.savedAt || '2026-09-11T10:03:00.000Z',
    mode: partial.mode || 'normal',
    items: partial.items || [
      { exerciseId: 'stroop' },
      { exerciseId: 'odd-one' },
      { exerciseId: 'grid-memory' }
    ],
    currentIndex: partial.currentIndex ?? 1,
    timeLeft: partial.timeLeft ?? 180,
    sessionBudget: partial.sessionBudget ?? 300,
    results: partial.results ?? [item()],
    domainDeltas: partial.domainDeltas || { attention: 4 }
  });
}

test('focus prefs default on without a schema field', () => {
  expect(readFocusPrefs({})).toEqual({ enabled: true, timerRing: true, dnd: true });
  expect(readFocusPrefs({ focusMode: false, focusTimerRing: false, focusDnd: false })).toEqual({
    enabled: false,
    timerRing: false,
    dnd: false
  });
});

test('session flags hide chrome and enlarge targets for a full ritual', () => {
  const on = sessionFocusFlags(readFocusPrefs({}), 'normal');
  expect(on.active).toBe(true);
  expect(on.hideChrome).toBe(true);
  expect(on.largerTargets).toBe(true);
  expect(on.timerRing).toBe(true);
  expect(on.dnd).toBe(true);

  const off = sessionFocusFlags(readFocusPrefs({ focusMode: false }), 'normal');
  expect(off.active).toBe(false);
  expect(off.hideChrome).toBe(false);
  expect(off.timerRing).toBe(false);
  expect(off.dnd).toBe(false);
});

test('duel does not enter focus mode', () => {
  const flags = sessionFocusFlags(readFocusPrefs({}), 'duel');
  expect(flags.active).toBe(false);
  expect(flags.timerRing).toBe(false);
});

test('timer ring is remaining / budget, clock is mm:ss', () => {
  expect(formatSessionClock(300)).toBe('5:00');
  expect(formatSessionClock(9)).toBe('0:09');
  expect(timerRingProgress(300, 300)).toBe(1);
  expect(timerRingProgress(0, 300)).toBe(0);
  expect(timerRingProgress(150, 300)).toBeCloseTo(0.5);
  expect(timerRingOffset(300, 300)).toBeCloseTo(0);
  expect(timerRingOffset(0, 300)).toBeCloseTo(TIMER_RING_C);
});

test('fresh checkpoint resumes; stale with blocks becomes a G8 abandoned session', () => {
  const fresh = checkpoint();
  expect(isCheckpointFresh(fresh, '2026-09-11T10:10:00.000Z')).toBe(true);
  expect(visitCheckpoint(fresh, '2026-09-11T10:10:00.000Z').kind).toBe('resume');

  const stale = checkpoint({ savedAt: '2026-09-11T04:00:00.000Z' });
  const visit = visitCheckpoint(stale, '2026-09-11T10:00:00.000Z');
  expect(visit.kind).toBe('stale-abandon');
  if (visit.kind !== 'stale-abandon') return;
  expect(visit.session.interrupted).toBe(true);
  expect(visit.session.endReason).toBe('abandoned');
  expect(visit.session.finishedAt).toBeNull();
  expect(visit.session.plannedDurationSec).toBe(300);
  expect(visit.session.items).toHaveLength(1);
});

test('stale empty checkpoint drops without a fake abandoned session', () => {
  const empty = checkpoint({
    results: [],
    currentIndex: 0,
    savedAt: '2026-09-10T10:00:00.000Z'
  });
  expect(checkpointToAbandonedSession(empty)).toBeNull();
  expect(visitCheckpoint(empty, '2026-09-11T10:00:00.000Z').kind).toBe('stale-drop');
});

test('invalid checkpoints are not resumable', () => {
  expect(isCheckpointFresh(checkpoint({ mode: 'practice' }), '2026-09-11T10:04:00.000Z')).toBe(false);
  expect(isCheckpointFresh(checkpoint({ currentIndex: 9 }), '2026-09-11T10:04:00.000Z')).toBe(false);
  expect(isCheckpointFresh(checkpoint({ timeLeft: 0 }), '2026-09-11T10:04:00.000Z')).toBe(false);
  expect(isCheckpointFresh(undefined, '2026-09-11T10:04:00.000Z')).toBe(false);
  expect(FOCUS_CHECKPOINT_TTL_MS).toBe(4 * 60 * 60 * 1000);
});

test('checkpoint is only saved for a live normal ritual with progress', () => {
  expect(shouldSaveCheckpoint({
    mode: 'normal', focusActive: true, currentIndex: 0, resultsCount: 0, playing: false
  })).toBe(false);
  expect(shouldSaveCheckpoint({
    mode: 'normal', focusActive: true, currentIndex: 0, resultsCount: 0, playing: true
  })).toBe(true);
  expect(shouldSaveCheckpoint({
    mode: 'normal', focusActive: true, currentIndex: 1, resultsCount: 1, playing: false
  })).toBe(true);
  expect(shouldSaveCheckpoint({
    mode: 'calibration', focusActive: true, currentIndex: 1, resultsCount: 1, playing: true
  })).toBe(false);
  expect(shouldSaveCheckpoint({
    mode: 'normal', focusActive: false, currentIndex: 1, resultsCount: 1, playing: true
  })).toBe(false);
});

test('optional focus fields do not bump the storage schema', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe(4);
});

test('DND live flag suppresses reminders without touching recovery', () => {
  expect(shouldSuppressNotify()).toBe(false);
  setFocusDndLive(true);
  expect(isFocusDndLive()).toBe(true);
  expect(shouldSuppressNotify()).toBe(true);
  setFocusDndLive(false);
  expect(shouldSuppressNotify()).toBe(false);
});
