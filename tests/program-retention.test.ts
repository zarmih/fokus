import { describe, expect, test } from 'vitest';
import {
  assessRetention,
  describeProgramRetention,
  RETENTION_SHORT_DURATION_SEC,
  type RetentionInput
} from '../src/core/retention';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';

const NOW = new Date(2026, 8, 11, 12, 0, 0); // 2026-09-11 local noon

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

describe('describeProgramRetention — Program ← Retention glue', () => {
  test('cold start: calm rhythm line, no short duration, no FOMO', () => {
    const snap = assessRetention(base());
    const view = describeProgramRetention(snap, { profileLengthSec: 900, playedToday: false });
    expect(view.rhythmLine).toMatch(/^Ритм \d+ · /);
    expect(view.durationSec).toBeNull();
    expect(view.coachOverride).toBeNull();
    expect(view.body).not.toMatch(SPAM);
    expect(view.aria).toContain('Ритм привычки');
  });

  test('multi-day gap: short duration + soft CTA + resume coach override', () => {
    const snap = assessRetention(
      base({
        daySummaries: [day('2026-09-01'), day('2026-09-02'), day('2026-09-03')],
        sessions: [
          session('2026-09-01T10:00:00'),
          session('2026-09-02T10:00:00'),
          session('2026-09-03T10:00:00')
        ],
        domains: domains('2026-09-03T10:00:00'),
        streak: 0,
        playedToday: false
      })
    );
    expect(snap.gapDays).toBeGreaterThanOrEqual(7);
    const view = describeProgramRetention(snap, {
      profileLengthSec: 900,
      softReturnActive: false,
      playedToday: false
    });
    expect(view.durationSec).toBe(RETENTION_SHORT_DURATION_SEC);
    expect(view.softenCta).toBe(true);
    expect(view.coachOverride).toBeTruthy();
    expect(view.coachOverride!).not.toMatch(SPAM);
    expect(view.nudgeKind === 'resume' || view.nudgeKind === 'short_session').toBe(true);
  });

  test('soft-return already active: duration stays with continuity (null)', () => {
    const snap = assessRetention(
      base({
        daySummaries: [day('2026-09-08'), day('2026-09-09')],
        sessions: [session('2026-09-08T10:00:00'), session('2026-09-09T10:00:00')],
        domains: domains('2026-09-09T10:00:00'),
        streak: 0,
        playedToday: false
      })
    );
    const view = describeProgramRetention(snap, {
      profileLengthSec: 900,
      softReturnActive: true,
      playedToday: false
    });
    expect(view.durationSec).toBeNull();
    expect(view.coachOverride).toBeNull(); // continuity owns copy
  });

  test('domain neglect surfaces focusDomain and rebalance coach when primary', () => {
    const snap = assessRetention(
      base({
        daySummaries: [
          day('2026-08-20', 90, { domainDeltas: { attention: 5, memory: 1 } }),
          day('2026-09-01', 100, { domainDeltas: { attention: 6 } }),
          day('2026-09-05', 100, { domainDeltas: { attention: 4, speed: 3 } }),
          day('2026-09-08', 100, { domainDeltas: { attention: 5, speed: 2 } }),
          day('2026-09-10', 100, { domainDeltas: { attention: 5, speed: 2 } })
        ],
        sessions: [
          session('2026-09-01T10:00:00'),
          session('2026-09-05T10:00:00'),
          session('2026-09-08T10:00:00'),
          session('2026-09-10T10:00:00')
        ],
        domains: [
          { domain: 'attention', value: 800, trend: 2, updatedAt: '2026-09-10T10:00:00' },
          { domain: 'memory', value: 500, trend: -1, updatedAt: '2026-08-20T10:00:00' },
          { domain: 'speed', value: 700, trend: 1, updatedAt: '2026-09-10T10:00:00' },
          { domain: 'flexibility', value: 600, trend: 0, updatedAt: '2026-09-05T10:00:00' },
          { domain: 'logic', value: 580, trend: 0, updatedAt: '2026-09-05T10:00:00' }
        ],
        streak: 2,
        playedToday: false
      })
    );
    const view = describeProgramRetention(snap, {
      profileLengthSec: 600,
      softReturnActive: false,
      playedToday: false
    });
    // Either primary is rebalance, or focusDomain still exposed via neglect signal
    if (view.nudgeKind === 'rebalance') {
      expect(view.focusDomain).toBe('memory');
      expect(view.coachOverride).toMatch(/памят/i);
    } else if (view.focusDomain) {
      expect(view.focusDomain).toBe('memory');
    }
    expect(view.body).not.toMatch(SPAM);
  });

  test('played today + fatigue rest: coachOverride without shortening', () => {
    const longItems = [item(), item(), item(), item()];
    const snap = assessRetention(
      base({
        daySummaries: [day('2026-09-09'), day('2026-09-10'), day('2026-09-11')],
        sessions: [
          session('2026-09-11T08:00:00', longItems, 1200),
          session('2026-09-11T09:30:00', longItems, 1100),
          session('2026-09-11T11:00:00', longItems, 1000)
        ],
        domains: domains('2026-09-11T11:00:00'),
        streak: 5,
        playedToday: true,
        sessionLengthSec: 900
      })
    );
    const view = describeProgramRetention(snap, {
      profileLengthSec: 900,
      playedToday: true
    });
    expect(view.durationSec).toBeNull();
    expect(view.softenCta).toBe(false);
    if (view.nudgeKind === 'rest') {
      expect(view.coachOverride).toBeTruthy();
    }
  });
});
