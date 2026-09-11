import { expect, test } from 'vitest';
import {
  QUALITY_WEIGHTS,
  qualityBand,
  qualityComponentLabel,
  scoreSessionQuality,
  scoreSessions
} from '../src/core/sessionQuality';
import type { Session, SessionItem } from '../src/core/types';

function item(partial: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: 'grid-memory',
    level: 5,
    accuracy: 0.88,
    avgRtMs: 420,
    score: 60,
    ...partial
  };
}

function session(partial: Partial<Session> & { items?: SessionItem[] }): Session {
  return {
    id: partial.id || 's1',
    startedAt: partial.startedAt || '2026-09-10T10:00:00.000Z',
    finishedAt: partial.finishedAt === undefined ? '2026-09-10T10:05:00.000Z' : partial.finishedAt,
    durationSec: partial.durationSec ?? 300,
    items: partial.items || [item(), item({ avgRtMs: 430 }), item({ avgRtMs: 410 })],
    interrupted: partial.interrupted,
    endReason: partial.endReason,
    plannedDurationSec: partial.plannedDurationSec
  };
}

test('weights are transparent and sum to 1', () => {
  const sum = Object.values(QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);
  expect(sum).toBeCloseTo(1, 8);
  expect(qualityComponentLabel('accuracy')).toBe('Точность');
  expect(qualityComponentLabel('interruptions')).toBe('Без обрывов');
});

test('empty session scores 0 with low confidence', () => {
  const q = scoreSessionQuality(session({ items: [], finishedAt: null, durationSec: 0 }));
  expect(q.score).toBe(0);
  expect(q.confidence).toBe('low');
  expect(q.sample.blocks).toBe(0);
});

test('clean completed ritual scores high and is a weighted sum', () => {
  const q = scoreSessionQuality(session({ plannedDurationSec: 300 }));
  expect(q.score).toBeGreaterThanOrEqual(80);
  expect(q.confidence).toBe('high');
  expect(q.sample.interrupted).toBe(false);
  const expected =
    QUALITY_WEIGHTS.accuracy * q.breakdown.accuracy +
    QUALITY_WEIGHTS.rtStability * q.breakdown.rtStability +
    QUALITY_WEIGHTS.difficulty * q.breakdown.difficulty +
    QUALITY_WEIGHTS.completion * q.breakdown.completion +
    QUALITY_WEIGHTS.interruptions * q.breakdown.interruptions;
  expect(q.score).toBe(Math.round(expected));
  expect(qualityBand(q.score)).toBe('чистый ритуал');
});

test('unstable reaction times lower rtStability', () => {
  const stable = scoreSessionQuality(session({
    items: [item({ avgRtMs: 400 }), item({ avgRtMs: 410 }), item({ avgRtMs: 420 })]
  }));
  const jumpy = scoreSessionQuality(session({
    items: [item({ avgRtMs: 280 }), item({ avgRtMs: 1600 }), item({ avgRtMs: 420 })]
  }));
  expect(jumpy.breakdown.rtStability).toBeLessThan(stable.breakdown.rtStability);
  expect(jumpy.score).toBeLessThan(stable.score);
  expect(jumpy.sample.rtCv).not.toBeNull();
  expect(jumpy.sample.rtCv!).toBeGreaterThan(stable.sample.rtCv || 0);
});

test('abandoned / unfinished session is an interruption, not a fake ability drop', () => {
  const q = scoreSessionQuality(session({
    finishedAt: null,
    interrupted: true,
    endReason: 'abandoned',
    durationSec: 40,
    items: [item()],
    plannedDurationSec: 300
  }));
  expect(q.sample.interrupted).toBe(true);
  expect(q.breakdown.interruptions).toBeLessThan(40);
  expect(q.breakdown.completion).toBeLessThan(50);
  expect(q.confidence).toBe('low');
});

test('fatigue stop keeps more completion credit than an abandon', () => {
  const fatigue = scoreSessionQuality(session({
    endReason: 'fatigue',
    durationSec: 180,
    items: [item(), item()],
    plannedDurationSec: 720
  }));
  const abandon = scoreSessionQuality(session({
    finishedAt: null,
    interrupted: true,
    endReason: 'abandoned',
    durationSec: 180,
    items: [item(), item()],
    plannedDurationSec: 720
  }));
  expect(fatigue.breakdown.completion).toBeGreaterThan(abandon.breakdown.completion);
  expect(fatigue.breakdown.interruptions).toBeGreaterThan(abandon.breakdown.interruptions);
});

test('under-challenged 100% at level 1 is weaker difficulty fit than engaged play', () => {
  const easy = scoreSessionQuality(session({
    items: [item({ level: 1, accuracy: 1, avgRtMs: 400 }), item({ level: 1, accuracy: 1, avgRtMs: 410 }), item({ level: 1, accuracy: 1, avgRtMs: 420 })]
  }));
  const engaged = scoreSessionQuality(session({
    items: [item({ level: 6, accuracy: 0.82, avgRtMs: 400 }), item({ level: 6, accuracy: 0.8, avgRtMs: 410 }), item({ level: 6, accuracy: 0.81, avgRtMs: 420 })]
  }));
  expect(easy.breakdown.difficulty).toBeLessThan(engaged.breakdown.difficulty);
});

test('single block leaves RT stability neutral and confidence low', () => {
  const q = scoreSessionQuality(session({ items: [item()] }));
  expect(q.breakdown.rtStability).toBe(50);
  expect(q.sample.rtCv).toBeNull();
  expect(q.confidence).toBe('low');
});

test('scoreSessions is chronological', () => {
  const rows = scoreSessions([
    session({ id: 'b', startedAt: '2026-09-11T10:00:00.000Z' }),
    session({ id: 'a', startedAt: '2026-09-09T10:00:00.000Z' })
  ]);
  expect(rows.map((r) => r.sessionId)).toEqual(['a', 'b']);
});
