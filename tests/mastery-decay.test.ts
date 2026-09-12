import { expect, test } from 'vitest';
import {
  applyReprobeBias,
  blendConfidence,
  classifyBand,
  computeMasteryDecay,
  decayConfidence,
  ewmaUpdate,
  idleCalendarDays,
  masteryEvidence,
  scheduleReprobes,
  sparkFromReprobe,
  BAND_DUE,
  BAND_HELD,
  HALF_LIFE_DAYS,
  MIN_IDLE_DAYS_DUE,
  MIN_OBSERVATIONS,
  MASTERY_SETTINGS_COPY
} from '../src/core/mastery-decay';
import { applySpacedDifficulty } from '../src/core/spaced-difficulty';
import { getDailySpark } from '../src/core/coach';
import { setLocale } from '../src/core/i18n';
import type { ExerciseState, Session } from '../src/core/types';

const catalog = [
  { id: 'grid-memory', domain: 'memory', name: 'Матрица', skills: ['working_memory', 'visual_memory'] },
  { id: 'stroop', domain: 'attention', name: 'Чернила', skills: ['inhibition', 'selective_attention'] },
  { id: 'math-sprint', domain: 'speed', name: 'Счёт', skills: ['processing_speed'] }
];

function isoDaysAgo(n: number, now = '2026-09-11T12:00:00Z'): string {
  const t = new Date(now).getTime() - n * 86400000;
  return new Date(t).toISOString();
}

function session(id: string, daysAgo: number, items: Session['items'], now = '2026-09-11T12:00:00Z'): Session {
  const at = isoDaysAgo(daysAgo, now);
  return {
    id,
    startedAt: at,
    finishedAt: at,
    durationSec: 300,
    items
  };
}

function strongItem(exerciseId: string): Session['items'][number] {
  return { exerciseId, level: 6, accuracy: 0.92, avgRtMs: 800, score: 70, difficultyBefore: 6 };
}

function weakItem(exerciseId: string): Session['items'][number] {
  return { exerciseId, level: 4, accuracy: 0.55, avgRtMs: 1800, score: 20, difficultyBefore: 4 };
}

const NOW = '2026-09-11T12:00:00Z';

test('mastery evidence weights accuracy over latency and ignores difficulty', () => {
  const fastAccurate = masteryEvidence({ accuracy: 1, avgRtMs: 700 });
  const slowAccurate = masteryEvidence({ accuracy: 1, avgRtMs: 2000 });
  const fastMiss = masteryEvidence({ accuracy: 0.4, avgRtMs: 700 });
  expect(fastAccurate).toBeGreaterThan(slowAccurate);
  expect(fastAccurate).toBeGreaterThan(fastMiss);
  expect(fastAccurate).toBeGreaterThan(0.85);
  expect(fastMiss).toBeLessThan(0.7);
});

test('EWMA follows recent form', () => {
  let v = ewmaUpdate(null, 0.9);
  v = ewmaUpdate(v, 0.9);
  v = ewmaUpdate(v, 0.4);
  expect(v).toBeLessThan(0.9);
  expect(v).toBeGreaterThan(0.4);
});

test('calendar idle decays confidence with an 8-day half-life', () => {
  const base = 0.8;
  expect(decayConfidence(base, 0)).toBeCloseTo(0.8, 5);
  expect(decayConfidence(base, HALF_LIFE_DAYS)).toBeCloseTo(0.4, 5);
  expect(decayConfidence(base, HALF_LIFE_DAYS * 2)).toBeCloseTo(0.2, 5);
  expect(decayConfidence(base, -3)).toBeCloseTo(0.8, 5);
});

test('idle days use civil calendar, not raw 24h buckets', () => {
  const last = '2026-09-05T21:30:00Z'; // 2026-09-06 in Europe/Moscow
  const now = '2026-09-11T08:00:00Z'; // 2026-09-11 in Europe/Moscow
  const idle = idleCalendarDays({ lastPlayedAt: last, now, timeZone: 'Europe/Moscow' });
  expect(idle).toBe(5);
});

test('due band requires both low confidence and enough idle days', () => {
  expect(classifyBand({ samples: 1, confidence: 0.1, idleDays: 20 })).toBe('sparse');
  expect(classifyBand({ samples: 4, confidence: 0.2, idleDays: 1 })).toBe('held');
  expect(classifyBand({ samples: 4, confidence: 0.5, idleDays: MIN_IDLE_DAYS_DUE })).toBe('watch');
  expect(classifyBand({ samples: 4, confidence: BAND_DUE - 0.01, idleDays: MIN_IDLE_DAYS_DUE })).toBe('due');
  expect(classifyBand({ samples: 4, confidence: BAND_HELD, idleDays: 20 })).toBe('held');
});

test('recent strong blocks stay held; unused skill decays into due', () => {
  const recent: Session[] = [
    session('s1', 2, [strongItem('grid-memory'), strongItem('stroop')]),
    session('s2', 1, [strongItem('grid-memory'), strongItem('stroop')]),
    session('s3', 0, [strongItem('grid-memory'), strongItem('stroop')])
  ];
  const held = computeMasteryDecay({ catalog, sessions: recent, now: NOW, timeZone: 'UTC' });
  const matrix = held.cards.find((c) => c.exerciseId === 'grid-memory')!;
  expect(matrix.samples).toBeGreaterThanOrEqual(MIN_OBSERVATIONS);
  expect(matrix.band).toBe('held');
  expect(matrix.due).toBe(false);
  expect(held.hint).toBeNull();

  const idle: Session[] = [
    session('a', 20, [strongItem('grid-memory'), strongItem('stroop')]),
    session('b', 18, [strongItem('grid-memory'), strongItem('stroop')]),
    session('c', 16, [strongItem('grid-memory'), strongItem('stroop')])
  ];
  const dueSnap = computeMasteryDecay({ catalog, sessions: idle, now: NOW, timeZone: 'UTC' });
  const dueMatrix = dueSnap.cards.find((c) => c.exerciseId === 'grid-memory')!;
  expect(dueMatrix.idleDays).toBeGreaterThanOrEqual(MIN_IDLE_DAYS_DUE);
  expect(dueMatrix.confidence).toBeLessThan(BAND_DUE);
  expect(dueMatrix.band).toBe('due');
  expect(dueSnap.due.length).toBeGreaterThan(0);
  expect(dueSnap.hint?.line).toMatch(/Пора освежить|Re-probe due/);
});

test('skill rollup is unused only when every source exercise is idle', () => {
  const sessions: Session[] = [
    session('old', 16, [strongItem('grid-memory'), strongItem('stroop')]),
    session('old2', 14, [strongItem('grid-memory'), strongItem('stroop')]),
    session('fresh', 0, [strongItem('stroop')])
  ];
  const snap = computeMasteryDecay({ catalog, sessions, now: NOW, timeZone: 'UTC' });
  const memory = snap.skills.find((s) => s.skill === 'working_memory');
  const inhibition = snap.skills.find((s) => s.skill === 'inhibition');
  expect(memory?.due).toBe(true);
  expect(inhibition?.due).toBe(false);
});

test('scheduleReprobes proposes at most one card and does not set difficulty', () => {
  const sessions: Session[] = [
    session('a', 18, [strongItem('grid-memory'), strongItem('math-sprint')]),
    session('b', 16, [strongItem('grid-memory'), strongItem('math-sprint')])
  ];
  const snap = computeMasteryDecay({ catalog, sessions, now: NOW, timeZone: 'UTC' });
  const scheduled = scheduleReprobes(snap, 1);
  expect(scheduled.length).toBeLessThanOrEqual(1);
  expect(scheduled[0]?.reason).toBe('confidence-band');
  expect(JSON.stringify(scheduled)).not.toMatch(/difficulty|IQ|NeuroScore/i);
});

test('applyReprobeBias swaps the last slot only, never the first, never grows the plan', () => {
  const sessions: Session[] = [
    session('a', 18, [strongItem('grid-memory')]),
    session('b', 16, [strongItem('grid-memory')])
  ];
  const snap = computeMasteryDecay({ catalog, sessions, now: NOW, timeZone: 'UTC' });
  expect(snap.due[0]?.exerciseId).toBe('grid-memory');

  const plan = {
    focusDomains: ['attention'],
    items: [
      { exerciseId: 'stroop', reason: 'weakness' },
      { exerciseId: 'math-sprint', reason: 'explore' }
    ]
  };
  const out = applyReprobeBias(plan, snap, { allow: true, locale: 'ru' });
  expect(out.applied).toBe(true);
  expect(out.insertedId).toBe('grid-memory');
  expect(out.items).toHaveLength(2);
  expect(out.items[0].exerciseId).toBe('stroop');
  expect(out.items[1].exerciseId).toBe('grid-memory');
  expect(out.items[1].reason).toMatch(/Мягкий повтор/);
  expect(out.focusDomains).toContain('memory');

  const noop = applyReprobeBias(plan, snap, { allow: false });
  expect(noop.applied).toBe(false);
  expect(noop.items[1].exerciseId).toBe('math-sprint');

  const already = applyReprobeBias(
    { focusDomains: ['memory'], items: [{ exerciseId: 'grid-memory' }, { exerciseId: 'stroop' }] },
    snap,
    { allow: true }
  );
  expect(already.insertedId).toBeNull();
  expect(already.items.map((i) => i.exerciseId)).toEqual(['grid-memory', 'stroop']);
});

test('copy is original Fokus voice in RU and EN, not a clone', () => {
  setLocale('ru');
  const sessions: Session[] = [
    session('a', 18, [strongItem('grid-memory')]),
    session('b', 16, [strongItem('grid-memory')])
  ];
  const ru = computeMasteryDecay({ catalog, sessions, now: NOW, timeZone: 'UTC', locale: 'ru' });
  const en = computeMasteryDecay({ catalog, sessions, now: NOW, timeZone: 'UTC', locale: 'en' });
  expect(ru.hint?.title).toBe('Пора освежить');
  expect(en.hint?.title).toBe('Time to re-check');
  expect(en.hint?.line).toMatch(/Re-probe due/);
  const banned = /\b(Wikium|Elevate|Lumosity|Peak|NeuroNation|NeuroScore)\b|brain age|прокачай мозг|не пропусти/i;
  expect(ru.hint?.body).not.toMatch(banned);
  expect(en.hint?.body).not.toMatch(banned);
  expect(MASTERY_SETTINGS_COPY.ru.body).not.toMatch(banned);
  expect(MASTERY_SETTINGS_COPY.en.body).not.toMatch(banned);
  expect(MASTERY_SETTINGS_COPY.ru.body).toMatch(/не IQ/i);
  expect(MASTERY_SETTINGS_COPY.en.body).toMatch(/Not IQ/i);
  setLocale('ru');
});

test('coach spark yields to recovery and only then mentions a re-probe', () => {
  const sessions: Session[] = [
    session('a', 18, [strongItem('grid-memory')]),
    session('b', 16, [strongItem('grid-memory')])
  ];
  const snap = computeMasteryDecay({ catalog, sessions, now: NOW, timeZone: 'UTC', locale: 'ru' });
  const recovery = getDailySpark({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [{ date: '2026-09-07', totalScore: 80, domainDeltas: {}, streak: 4, skipped: true }],
    sessions: [],
    calibrated: true,
    playedToday: false,
    streak: 4,
    skippedYesterday: true,
    reprobe: snap
  });
  expect(recovery.tone).toBe('recovery');

  const spark = getDailySpark({
    domains: [],
    skills: [],
    states: [],
    daySummaries: [],
    sessions: [],
    calibrated: true,
    playedToday: false,
    streak: 2,
    reprobe: snap
  });
  expect(spark.title).toBe('Пора освежить');
  expect(spark.body).toMatch(/лестница сложности не сбрасывается/);
  expect(spark.tone).toBe('focus');
});

test('this layer does not rewrite G10 spaced-difficulty numbers', () => {
  const d = applySpacedDifficulty({
    currentDifficulty: 8.0,
    proposedDifficulty: 8.5,
    accuracy: 0.95,
    history: [{ accuracy: 0.92, difficulty: 7.6 }]
  });
  expect(d.mode).toBe('peak-cooldown');
  expect(d.target).toBeLessThan(8.0);
  expect(blendConfidence(6, 0.9)).toBeGreaterThan(0.7);
});

test('legacy exerciseStates without sessions stay sparse, not due', () => {
  const states: ExerciseState[] = [
    {
      exerciseId: 'grid-memory',
      level: 4,
      difficulty: 4,
      performance: 400,
      lastPlayedAt: isoDaysAgo(20),
      lastAccuracy: 0.9,
      attempts: 1
    }
  ];
  const snap = computeMasteryDecay({ catalog, states, sessions: [], now: NOW, timeZone: 'UTC' });
  const card = snap.cards.find((c) => c.exerciseId === 'grid-memory')!;
  expect(card.band).toBe('sparse');
  expect(card.due).toBe(false);
});

test('sparkFromReprobe is a no-op on empty snapshots', () => {
  expect(sparkFromReprobe(null)).toBeNull();
  const empty = computeMasteryDecay({ catalog: [], sessions: [], now: NOW });
  expect(sparkFromReprobe(empty)).toBeNull();
});
