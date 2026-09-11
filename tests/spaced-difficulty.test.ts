import { expect, test } from 'vitest';
import {
  applySpacedDifficulty,
  inspectSpacing,
  isHardSuccess,
  PEAK_DIFFICULTY_FLOOR,
  PEAK_STEP_DOWN,
  FAIL_MAX_DROP,
  REAPPROACH_CLEAR_SUCCESSES
} from '../src/core/spaced-difficulty';
import type { Session } from '../src/core/types';

test('low-band success is not a peak and does not hold difficulty', () => {
  expect(isHardSuccess(0.96, 3.0, 3.0)).toBe(false);
  const d = applySpacedDifficulty({
    currentDifficulty: 3.0,
    proposedDifficulty: 3.5,
    accuracy: 0.96,
    history: []
  });
  expect(d.reasonCode).toBe('open');
  expect(d.target).toBe(3.5);
});

test('hard success at peak steps down instead of climbing', () => {
  const d = applySpacedDifficulty({
    currentDifficulty: 8.0,
    proposedDifficulty: 8.5,
    accuracy: 0.95,
    history: [{ accuracy: 0.92, difficulty: 7.6 }]
  });
  expect(d.mode).toBe('peak-cooldown');
  expect(d.reasonCode).toBe('peak-hold');
  expect(d.target).toBeLessThanOrEqual(8.0 - PEAK_STEP_DOWN + 1e-9);
  expect(d.target).toBeGreaterThanOrEqual(PEAK_DIFFICULTY_FLOOR - 2);
});

test('failure drop is gentler than a raw -0.8 staircase', () => {
  const d = applySpacedDifficulty({
    currentDifficulty: 5.0,
    proposedDifficulty: 4.2,
    accuracy: 0.5,
    history: []
  });
  expect(d.reasonCode).toBe('fail-drop');
  expect(d.target).toBeCloseTo(5.0 - FAIL_MAX_DROP, 5);
  expect(d.target).toBeGreaterThan(4.2);
  expect(d.target).toBeLessThan(5.0);
});

test('reapproach caps below the failed height until enough solid successes', () => {
  const history = [
    { accuracy: 0.5, difficulty: 7.0 }
  ];
  const early = applySpacedDifficulty({
    currentDifficulty: 6.4,
    proposedDifficulty: 7.2,
    accuracy: 0.88,
    history
  });
  expect(early.mode).toBe('reapproach');
  expect(early.target).toBeLessThan(7.0);

  const cleared = applySpacedDifficulty({
    currentDifficulty: 6.6,
    proposedDifficulty: 7.1,
    accuracy: 0.88,
    history: [
      { accuracy: 0.5, difficulty: 7.0 },
      ...Array.from({ length: REAPPROACH_CLEAR_SUCCESSES }, () => ({
        accuracy: 0.8,
        difficulty: 6.5
      }))
    ]
  });
  expect(cleared.mode).toBe('open');
  expect(cleared.target).toBe(7.1);
});

test('inspectSpacing marks peak cooldown from session history', () => {
  const sessions: Session[] = [
    {
      id: 'a',
      startedAt: '2026-09-01T10:00:00.000Z',
      finishedAt: '2026-09-01T10:05:00.000Z',
      durationSec: 300,
      items: [{ exerciseId: 'stroop', level: 8, accuracy: 0.94, avgRtMs: 800, score: 70, difficultyAfter: 8.2 }]
    },
    {
      id: 'b',
      startedAt: '2026-09-02T10:00:00.000Z',
      finishedAt: '2026-09-02T10:05:00.000Z',
      durationSec: 300,
      items: [{ exerciseId: 'stroop', level: 8, accuracy: 0.88, avgRtMs: 900, score: 60, difficultyAfter: 8.0 }]
    }
  ];
  const snap = inspectSpacing({ exerciseId: 'stroop', currentDifficulty: 8.0, sessions });
  expect(snap.mode).toBe('peak-cooldown');
  expect(snap.sessionsRemaining).toBeGreaterThan(0);
});
