import { beforeEach, describe, expect, test } from 'vitest';
import {
  ANALYTICS_METHODOLOGY_VERSION,
  METRIC_COPY,
  assessDataSufficiency,
  exerciseTrend
} from '../src/core/analytics/methodology';
import { computeFokusIndex } from '../src/core/fokus-index';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../src/core/offline-sync';
import { storage } from '../src/core/storage';
import { renderProgress } from '../src/ui/screens/progress';
import type { DomainIndex, Session, SessionItem } from '../src/core/types';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-12T12:00:00Z');
const DOMAIN: Record<string, string> = { a1: 'attention', m1: 'memory', s1: 'speed', f1: 'flexibility', l1: 'logic' };
const domainOf = (id: string) => DOMAIN[id];

function item(exerciseId: string, accuracy: number, extra: Partial<SessionItem> = {}): SessionItem {
  return { exerciseId, level: 3, difficultyBefore: 3, accuracy, avgRtMs: 1000, score: 10, rounds: 8, mode: 'standard', ...extra };
}
function session(daysAgo: number, items: SessionItem[], extra: Partial<Session> = {}): Session {
  const t = new Date(NOW - daysAgo * DAY).toISOString();
  return { id: `s${daysAgo}-${Math.random()}`, startedAt: t, finishedAt: t, durationSec: 300, items, mode: 'normal', ...extra };
}
/** One block per day, oldest first. */
function series(id: string, accs: number[], extra: (i: number) => Partial<SessionItem> = () => ({})): Session[] {
  return accs.map((a, i) => session(accs.length - i, [item(id, a, extra(i))]));
}

describe('data sufficiency (replaces confidence %)', () => {
  test('none / low / partial / enough follow the documented thresholds', () => {
    expect(assessDataSufficiency({ sessions: [], domainOf, nowMs: NOW }).level).toBe('none');

    const few = [session(1, [item('a1', 0.8), item('m1', 0.8), item('s1', 0.8)])];
    expect(assessDataSufficiency({ sessions: few, domainOf, nowMs: NOW }).level).toBe('low');

    const three = Array.from({ length: 4 }, (_, d) => session(d + 1, [item('a1', 0.8), item('m1', 0.8), item('s1', 0.8)]));
    const partial = assessDataSufficiency({ sessions: three, domainOf, nowMs: NOW });
    expect(partial.level).toBe('partial');
    expect(partial.blocks28d).toBe(12);
    expect(partial.domainsCovered).toBe(3);

    const all = Array.from({ length: 5 }, (_, d) => session(d + 1, Object.keys(DOMAIN).map((id) => item(id, 0.8))));
    expect(assessDataSufficiency({ sessions: all, domainOf, nowMs: NOW }).level).toBe('enough');

    // Same data but stale: drops back.
    expect(assessDataSufficiency({ sessions: all, domainOf, nowMs: NOW + 10 * DAY }).level).toBe('partial');
    expect(assessDataSufficiency({ sessions: all, domainOf, nowMs: NOW + 20 * DAY }).level).toBe('low');
  });

  test('Fokus Index carries the category and version, never a confidence percentage', () => {
    const domains: DomainIndex[] = ['attention', 'memory', 'speed', 'flexibility', 'logic'].map((d, i) => ({ domain: d, value: 300 + i * 200, trend: 0, updatedAt: 'x' }));
    const thin = computeFokusIndex(domains, [], { sessions: [session(1, [item('a1', 0.8)])], nowMs: NOW });
    expect(thin.methodologyVersion).toBe(ANALYTICS_METHODOLOGY_VERSION);
    expect(thin.dataSufficiency.level).toBe('low');
    expect(thin.balance).toBe('unknown'); // no profile shape on thin data
    expect(JSON.stringify(thin)).not.toMatch(/confidence|Уверенность/);
    const rich = computeFokusIndex(domains, [], {
      sessions: Array.from({ length: 5 }, (_, d) => session(d + 1, ['odd-one', 'grid-memory', 'math-sprint', 'stroop', 'pattern-next'].map((id) => item(id, 0.8)))),
      nowMs: NOW
    });
    expect(rich.dataSufficiency.level).toBe('enough');
    expect(rich.balance).not.toBe('unknown');
  });
});

describe('personal trend per exercise', () => {
  test('fewer than 6 comparable blocks → insufficient, with how many are missing', () => {
    const t = exerciseTrend({ sessions: series('a1', [0.5, 0.6, 0.7, 0.8]), exerciseId: 'a1', nowMs: NOW });
    expect(t.verdict).toBe('insufficient');
    expect(t.needMore).toBe(2);
  });

  test('accuracy rise above noise → better; noise → stable; drop → worse', () => {
    expect(exerciseTrend({ sessions: series('a1', [0.6, 0.62, 0.6, 0.61, 0.8, 0.82, 0.81, 0.8]), exerciseId: 'a1', nowMs: NOW }).verdict).toBe('better');
    expect(exerciseTrend({ sessions: series('a1', [0.7, 0.72, 0.69, 0.71, 0.7, 0.72, 0.7, 0.71]), exerciseId: 'a1', nowMs: NOW }).verdict).toBe('stable');
    expect(exerciseTrend({ sessions: series('a1', [0.85, 0.86, 0.84, 0.85, 0.65, 0.66, 0.64, 0.65]), exerciseId: 'a1', nowMs: NOW }).verdict).toBe('worse');
  });

  test('faster at equal accuracy → better', () => {
    const s = series('a1', [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8], (i) => ({ avgRtMs: i < 4 ? 1000 : 800 }));
    expect(exerciseTrend({ sessions: s, exerciseId: 'a1', nowMs: NOW }).verdict).toBe('better');
  });

  test('blocks at a different level, in calibration, in accessible mode or older than 56 days are not compared', () => {
    const levelJump = series('a1', [0.9, 0.9, 0.9, 0.9, 0.6, 0.6, 0.6, 0.6], (i) => (i < 4 ? { difficultyBefore: 2 } : { difficultyBefore: 6 }));
    const lj = exerciseTrend({ sessions: levelJump, exerciseId: 'a1', nowMs: NOW });
    expect(lj.verdict).toBe('insufficient'); // harder level is not "worse"
    expect(lj.observations).toBe(4);

    const calib = series('a1', [0.6, 0.6, 0.6, 0.6, 0.6, 0.6]).map((s, i) => (i < 3 ? { ...s, mode: 'calibration' as const } : s));
    expect(exerciseTrend({ sessions: calib, exerciseId: 'a1', nowMs: NOW }).observations).toBe(3);

    const access = series('a1', [0.6, 0.6, 0.6, 0.6, 0.6, 0.6], (i) => ({ mode: i < 3 ? 'accessible' : 'standard' }));
    expect(exerciseTrend({ sessions: access, exerciseId: 'a1', nowMs: NOW }).observations).toBe(3);

    const old = series('a1', [0.6, 0.6, 0.6, 0.6, 0.6, 0.6]);
    expect(exerciseTrend({ sessions: old, exerciseId: 'a1', nowMs: NOW + 60 * DAY }).observations).toBe(0);
  });
});

describe('copy', () => {
  test('every metric says what it measures and what cannot be concluded; no certainty language', () => {
    for (const c of Object.values(METRIC_COPY)) {
      expect(c.measures.length).toBeGreaterThan(20);
      expect(c.cannotConclude.length).toBeGreaterThan(20);
      expect(`${c.title} ${c.measures} ${c.cannotConclude}`).not.toMatch(/уверен|\d+\s*%|мозг|IQ/i);
    }
  });
});

describe('storage migration 4 → 5', () => {
  test('tags stored index values as method 1, keeps every record, and is idempotent', () => {
    const v4 = {
      profile: { name: 'x', schemaVersion: 4, sessionLengthSec: 300, createdAt: '2026-01-01T00:00:00Z', onboarded: true, calibrated: true },
      domains: [{ domain: 'attention', value: 500, trend: 0, updatedAt: 'x' }],
      skills: [], exerciseStates: [], history: [],
      sessions: [session(3, [item('a1', 0.7)])],
      daySummaries: [
        { date: '2026-11-01T10:00:00Z', totalScore: 10, domainDeltas: {}, streak: 1, skipped: false, fokusIndex: 480 },
        { date: '2026-11-02T10:00:00Z', totalScore: 12, domainDeltas: {}, streak: 2, skipped: false }
      ],
      meta: { schemaVersion: 4, deviceId: 'd', rev: 7, updatedAt: '2026-11-02T10:00:00Z' }
    };
    const m = migrateState(JSON.parse(JSON.stringify(v4)), { now: '2026-11-12T00:00:00Z', deviceId: 'd' });
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
    expect(m.meta?.schemaVersion).toBe(5);
    expect(m.meta?.analyticsMethodologyVersion).toBe(2);
    expect(m.meta?.rev).toBe(7);
    expect(m.daySummaries).toHaveLength(2);
    expect(m.daySummaries[0]).toMatchObject({ fokusIndex: 480, fokusIndexMethod: 1 });
    expect(m.daySummaries[1].fokusIndexMethod).toBeUndefined();
    expect(m.sessions).toHaveLength(1);
    expect(m.sessions[0].items[0].accuracy).toBe(0.7);
    const again = migrateState(JSON.parse(JSON.stringify(m)), { now: '2026-11-13T00:00:00Z', deviceId: 'd' });
    expect(again.daySummaries).toEqual(m.daySummaries);
  });

  test('new day summaries are written as method 2', () => {
    storage.reset();
    storage.addDaySummary({ date: new Date().toISOString(), totalScore: 1, domainDeltas: {}, streak: 1, skipped: false, fokusIndex: 500 });
    expect(storage.getDaySummaries().slice(-1)[0]?.fokusIndexMethod).toBe(2);
    expect(storage.getMeta()?.analyticsMethodologyVersion).toBe(2);
  });
});

describe('Progress screen', () => {
  class MockStorage {
    data: Record<string, string> = {};
    getItem(k: string) { return this.data[k] || null; }
    setItem(k: string, v: string) { this.data[k] = v; }
    removeItem(k: string) { delete this.data[k]; }
  }
  beforeEach(() => {
    (storage as any).backend = new MockStorage();
    storage.reset();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test('after one calibration + one session: no confidence %, no record, no profile verdict; data completeness shown', () => {
    storage.setProfile({ ...storage.getProfile(), calibrated: true, onboarded: true });
    storage.setDomains(['attention', 'memory', 'speed', 'flexibility', 'logic'].map((d, i) => ({ domain: d, value: 200 + i * 120, trend: 0, updatedAt: new Date().toISOString() })));
    storage.addSession({ id: 's1', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), durationSec: 300, mode: 'normal', items: [item('odd-one', 0.8), item('grid-memory', 0.7), item('stroop', 0.9)] });
    storage.addDaySummary({ date: new Date().toISOString(), totalScore: 30, domainDeltas: {}, streak: 1, skipped: false, fokusIndex: 263 });
    renderProgress(document.getElementById('app')!);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/Уверенность|уверенность \d|личный рекорд|Специализированный профиль/);
    expect(document.querySelector('[data-data-sufficiency="low"]')).toBeTruthy();
    expect(text).toMatch(/Личная динамика/);
    expect(text).toMatch(/Мало данных/);
  });
});
