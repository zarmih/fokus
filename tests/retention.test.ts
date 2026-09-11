import { afterEach, describe, expect, test } from 'vitest';
import {
  assessRetention,
  bandFromRisk,
  bandLabel,
  daysBetween,
  isoDay,
  rhythmScore,
  sparkFromRetention,
  type RetentionInput
} from '../src/core/retention';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';

const NOW = new Date(2026, 8, 11, 12, 0, 0); // local noon 2026-09-11

afterEach(() => {
  // no shared mocks
});

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

function domains(updatedAt: string, values?: Partial<Record<string, number>>): DomainIndex[] {
  const v = { attention: 700, memory: 640, speed: 610, flexibility: 580, logic: 560, ...values };
  return Object.entries(v).map(([domain, value]) => ({
    domain,
    value: value as number,
    trend: 0,
    updatedAt
  }));
}

function base(over: Partial<RetentionInput> = {}): RetentionInput {
  return {
    daySummaries: [],
    sessions: [],
    domains: [],
    playedToday: false,
    streak: 0,
    now: NOW,
    ...over
  };
}

const SPAM = /прокачай мозг|нейрофитнес|не пропусти|brain training|you're on fire|возраст мозга|\biq\b|не ломай серию|last chance/i;

describe('iso helpers', () => {
  test('isoDay and daysBetween are UTC-calendar stable', () => {
    expect(isoDay('2026-09-08T22:10:00Z')).toBe('2026-09-08');
    expect(daysBetween('2026-09-08', '2026-09-11')).toBe(3);
  });

  test('rhythm inverts risk; bands map thresholds', () => {
    expect(rhythmScore(40)).toBe(60);
    expect(bandFromRisk(10)).toBe('stable');
    expect(bandFromRisk(25)).toBe('watch');
    expect(bandFromRisk(50)).toBe('at_risk');
    expect(bandFromRisk(75)).toBe('critical');
    expect(bandLabel('at_risk')).toBe('просел');
  });
});

describe('assessRetention — cold start', () => {
  test('empty history stays stable and does not nag', () => {
    const snap = assessRetention(base());
    expect(snap.band).toBe('stable');
    expect(snap.risk).toBeLessThan(25);
    expect(snap.primaryNudge).toBeNull();
    expect(snap.confidence).toBeLessThan(30);
  });
});

describe('assessRetention — adherence', () => {
  test('seven regular days is a healthy rhythm', () => {
    const summaries = [];
    for (let i = 6; i >= 0; i--) {
      const d = `2026-09-${String(11 - i).padStart(2, '0')}`;
      summaries.push(day(`${d}T10:00:00Z`, 120, { streak: 7 - i }));
    }
    const snap = assessRetention(base({
      daySummaries: summaries,
      sessions: summaries.map((s) => session(s.date)),
      domains: domains('2026-09-11T10:00:00Z'),
      playedToday: true,
      streak: 7
    }));
    expect(snap.band).toBe('stable');
    expect(snap.risk).toBeLessThan(25);
    expect(snap.signals.find((s) => s.id === 'adherence_gap')!.score).toBeLessThan(30);
  });

  test('four-day gap raises risk and offers a resume nudge', () => {
    const snap = assessRetention(base({
      daySummaries: [day('2026-09-07T10:00:00Z', 90, { streak: 5 })],
      sessions: [session('2026-09-07T10:00:00Z')],
      domains: domains('2026-09-07T10:00:00Z'),
      playedToday: false,
      streak: 0
    }));
    expect(snap.gapDays).toBe(4);
    expect(snap.risk).toBeGreaterThanOrEqual(50);
    expect(['at_risk', 'critical']).toContain(snap.band);
    expect(snap.primaryNudge?.kind).toBe('resume');
    expect(snap.nudges.length).toBeGreaterThan(0);
    expect(snap.nudges.length).toBeLessThanOrEqual(2);
    snap.nudges.forEach((n) => {
      expect(n.body).not.toMatch(SPAM);
      expect(n.title).not.toMatch(SPAM);
    });
  });
});

describe('assessRetention — streak fragility', () => {
  test('long unplayed streak in the evening is fragile', () => {
    const evening = new Date(2026, 8, 11, 21, 0, 0);
    const snap = assessRetention(base({
      now: evening,
      daySummaries: [day('2026-09-10T10:00:00Z', 110, { streak: 12 })],
      sessions: [session('2026-09-10T10:00:00Z')],
      domains: domains('2026-09-10T10:00:00Z'),
      playedToday: false,
      streak: 12
    }));
    const frag = snap.signals.find((s) => s.id === 'streak_fragility')!;
    expect(frag.score).toBeGreaterThanOrEqual(70);
    expect(snap.nudges.some((n) => n.kind === 'protect_streak' || n.kind === 'resume' || n.kind === 'short_session')).toBe(true);
    const spark = sparkFromRetention(snap);
    expect(spark).not.toBeNull();
    expect(spark!.body).not.toMatch(SPAM);
  });

  test('playing today collapses fragility', () => {
    const snap = assessRetention(base({
      daySummaries: [day('2026-09-11T08:00:00Z', 100, { streak: 12 })],
      sessions: [session('2026-09-11T08:00:00Z')],
      domains: domains('2026-09-11T08:00:00Z'),
      playedToday: true,
      streak: 12
    }));
    expect(snap.signals.find((s) => s.id === 'streak_fragility')!.score).toBeLessThan(20);
  });

  test('optional shieldCharges lowers fragility after a forgiven skip', () => {
    const evening = new Date(2026, 8, 11, 21, 0, 0);
    const input = {
      now: evening,
      daySummaries: [day('2026-09-10T10:00:00Z', 100, { streak: 9, skipped: true })],
      sessions: [session('2026-09-09T10:00:00Z')],
      domains: domains('2026-09-10T10:00:00Z'),
      playedToday: false,
      streak: 9,
      skippedYesterday: true
    };
    const bare = assessRetention(base(input));
    const shielded = assessRetention(base({ ...input, shieldCharges: 1 }));
    expect(shielded.signals.find((s) => s.id === 'streak_fragility')!.score)
      .toBeLessThan(bare.signals.find((s) => s.id === 'streak_fragility')!.score);
  });
});

describe('assessRetention — domain neglect', () => {
  test('a stale domain surfaces rebalance copy', () => {
    const snap = assessRetention(base({
      daySummaries: [
        day('2026-09-11T09:00:00Z', 100, { domainDeltas: { attention: 8 }, streak: 4 }),
        day('2026-08-28T09:00:00Z', 80, { domainDeltas: { memory: 6 }, streak: 1 })
      ],
      sessions: [session('2026-09-11T09:00:00Z')],
      domains: [
        { domain: 'attention', value: 720, updatedAt: '2026-09-11T09:00:00Z' },
        { domain: 'memory', value: 500, updatedAt: '2026-08-28T09:00:00Z' },
        { domain: 'speed', value: 610, updatedAt: '2026-09-10T09:00:00Z' },
        { domain: 'flexibility', value: 590, updatedAt: '2026-09-09T09:00:00Z' },
        { domain: 'logic', value: 600, updatedAt: '2026-09-08T09:00:00Z' }
      ],
      playedToday: true,
      streak: 4
    }));
    expect(snap.neglectedDomain).toBe('memory');
    expect(snap.signals.find((s) => s.id === 'domain_neglect')!.score).toBeGreaterThanOrEqual(50);
    expect(snap.nudges.some((n) => n.kind === 'rebalance' && /Память/.test(n.body))).toBe(true);
  });
});

describe('assessRetention — session fatigue', () => {
  test('three fatiguing sessions today recommend rest', () => {
    const weak = [item({ accuracy: 0.45, avgRtMs: 1400 }), item({ accuracy: 0.4, avgRtMs: 900 }), item({ accuracy: 0.42, avgRtMs: 1600 })];
    const snap = assessRetention(base({
      daySummaries: [day('2026-09-11T18:00:00Z', 40, { streak: 3 })],
      sessions: [
        session('2026-09-10T10:00:00Z', [item({ accuracy: 0.9 }), item({ accuracy: 0.88 })]),
        session('2026-09-11T08:00:00Z', [item()], 400),
        session('2026-09-11T12:00:00Z', [item({ accuracy: 0.6 })], 400),
        session('2026-09-11T16:00:00Z', weak, 500)
      ],
      domains: domains('2026-09-11T16:00:00Z'),
      playedToday: true,
      streak: 3,
      sessionLengthSec: 300
    }));
    const fatigue = snap.signals.find((s) => s.id === 'session_fatigue')!;
    expect(fatigue.score).toBeGreaterThanOrEqual(55);
    expect(snap.primaryNudge?.kind).toBe('rest');
    expect(snap.primaryNudge?.body).toMatch(/завтра/i);
  });

  test('fatigue is zero when the user has not played today', () => {
    const snap = assessRetention(base({
      sessions: [session('2026-09-10T10:00:00Z')],
      playedToday: false
    }));
    expect(snap.signals.find((s) => s.id === 'session_fatigue')!.score).toBe(0);
  });
});

describe('sparkFromRetention', () => {
  test('stable snapshots do not emit a coach spark', () => {
    const snap = assessRetention(base({
      daySummaries: [day('2026-09-11T10:00:00Z')],
      sessions: [session('2026-09-11T10:00:00Z')],
      domains: domains('2026-09-11T10:00:00Z'),
      playedToday: true,
      streak: 3
    }));
    expect(snap.band).toBe('stable');
    expect(sparkFromRetention(snap)).toBeNull();
  });
});
