import { expect, test } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import { assessRetention, isoDay } from '../src/core/retention';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';

const TZ = 'Europe/Moscow';

function item(partial?: Partial<SessionItem>): SessionItem {
  return {
    exerciseId: 'grid-memory',
    level: 2,
    accuracy: 0.85,
    avgRtMs: 700,
    score: 80,
    ...partial
  };
}

function session(startedAt: string, items: SessionItem[] = [item()], durationSec = 300): Session {
  return { id: startedAt, startedAt, finishedAt: startedAt, durationSec, items };
}

function day(date: string, score = 100, extras: Partial<DaySummary> = {}): DaySummary {
  return {
    date,
    totalScore: score,
    domainDeltas: { attention: 4, memory: 3 },
    streak: 1,
    skipped: false,
    ...extras
  };
}

function domains(updatedAt: string): DomainIndex[] {
  const v = { attention: 700, memory: 640, speed: 610, flexibility: 580, logic: 560 };
  return Object.entries(v).map(([domain, value]) => ({
    domain,
    value,
    trend: 0,
    updatedAt
  }));
}

test('isoDay: UTC evening maps to next Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 21:30 UTC = 2026-10-29 00:30 Europe/Moscow
  const now = new Date('2026-10-28T21:30:00.000Z');
  expect(now.toISOString().slice(0, 10)).toBe('2026-10-28');
  expect(isoDay(now)).toBe('2026-10-29');
  expect(isoDay('2026-10-28T21:30:00.000Z')).toBe('2026-10-29');
});

test('isoDay: still previous Moscow day before midnight', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 20:30 UTC = 2026-10-28 23:30 Europe/Moscow
  const beforeMidnight = new Date('2026-10-28T20:30:00.000Z');
  expect(isoDay(beforeMidnight)).toBe('2026-10-28');
  expect(isoDay('2026-10-28T20:30:00.000Z')).toBe('2026-10-28');
});

test('isoDay: date-only civil keys stay as stored', () => {
  expect(isoDay('2026-10-04')).toBe('2026-10-04');
  expect(isoDay('2026-10-03')).toBe('2026-10-03');
});

test('assessRetention: session just after Moscow midnight buckets as Moscow today', () => {
  if (!timeZoneSupported(TZ)) return;
  // now = 2026-10-04 00:30 MSK; session started same instant (still 2026-10-03 UTC)
  const now = new Date('2026-10-03T21:30:00.000Z');
  expect(isoDay(now)).toBe('2026-10-04');

  const startedAt = '2026-10-03T21:30:00.000Z';
  expect(isoDay(startedAt)).toBe('2026-10-04');
  // UTC slice would wrongly keep 2026-10-03
  expect(startedAt.slice(0, 10)).toBe('2026-10-03');

  const snap = assessRetention({
    daySummaries: [day('2026-10-04', 100, { streak: 2 })],
    sessions: [session(startedAt)],
    domains: domains(startedAt),
    playedToday: true,
    streak: 2,
    now
  });

  expect(snap.gapDays).toBe(0);
  // Session must land on Moscow today so fatigue sees load>=1 (evidence), not "not-played".
  expect(snap.signals.find((s) => s.id === 'session_fatigue')!.evidence).toMatch(/load=1/);
});

test('assessRetention: UTC "same day" play does not erase Moscow overnight gap', () => {
  if (!timeZoneSupported(TZ)) return;
  // Moscow morning of Oct 4; last session was Moscow afternoon Oct 3 (= still Oct 3 UTC).
  // UTC isoDay(now) would be 2026-10-03 and report gapDays=0; Moscow must report 1.
  const now = new Date('2026-10-03T21:30:00.000Z');
  expect(now.toISOString().slice(0, 10)).toBe('2026-10-03');
  expect(isoDay(now)).toBe('2026-10-04');

  const snap = assessRetention({
    daySummaries: [day('2026-10-03')],
    sessions: [session('2026-10-03T12:00:00.000Z')],
    domains: domains('2026-10-03T12:00:00.000Z'),
    playedToday: false,
    streak: 1,
    now
  });
  expect(snap.gapDays).toBe(1);
});

test('assessRetention: lookback today follows Moscow civil day near midnight', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 21:30 UTC = Moscow morning of the 29th; last play was civil 2026-10-25
  const now = new Date('2026-10-28T21:30:00.000Z');
  const snap = assessRetention({
    daySummaries: [day('2026-10-25')],
    sessions: [session('2026-10-25T12:00:00.000Z')],
    domains: domains('2026-10-25T12:00:00.000Z'),
    playedToday: false,
    streak: 0,
    now
  });
  // today=2026-10-29 MSK, lastActive=2026-10-25 → gap 4
  expect(isoDay(now)).toBe('2026-10-29');
  expect(snap.gapDays).toBe(4);
  expect(snap.primaryNudge?.kind).toBe('resume');
});
