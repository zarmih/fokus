import { describe, expect, test } from 'vitest';
import {
  explainTodayPlan,
  applyRetentionRitualOrder,
  buildTodayPlanExplanation,
  ctaLabelFromPlan,
  emptyPlanCopy
} from '../src/core/today-plan';
import { assessRetention, describeProgramRetention } from '../src/core/retention';
import { buildContinuitySnapshot } from '../src/core/continuity';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';
import { buildFirstWeekPlan, getTodayRitual } from '../src/core/onboarding';

const NOW = new Date(2026, 8, 11, 12, 0, 0); // 2026-09-11

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

const SPAM = /прокачай мозг|нейрофитнес|не пропусти|brain training|you're on fire|возраст мозга|\biq\b|не ломай серию|last chance/i;

const catalog = [
  { id: 'stroop', domain: 'attention' },
  { id: 'grid-memory', domain: 'memory' },
  { id: 'posner', domain: 'attention' },
  { id: 'n-back', domain: 'memory' },
  { id: 'schulte', domain: 'speed' }
];

describe('explainTodayPlan — shared Today/Program/Coach story', () => {
  test('calibration path is shared and FOMO-free', () => {
    const retention = assessRetention({
      daySummaries: [],
      sessions: [],
      domains: [],
      playedToday: false,
      streak: 0,
      now: NOW
    });
    const continuity = buildContinuitySnapshot({ now: NOW });
    const exp = explainTodayPlan({
      calibrated: false,
      playedToday: false,
      continuity,
      retention
    });
    expect(exp.source).toBe('calibration');
    expect(exp.title).toMatch(/сложност|калибр/i);
    expect(exp.body).not.toMatch(SPAM);
    expect(exp.tone).toBe('start');
  });

  test('multi-day gap: same body for Program coach and Today hero', () => {
    const daySummaries = [day('2026-09-01'), day('2026-09-02'), day('2026-09-03')];
    const sessions = [
      session('2026-09-01T10:00:00'),
      session('2026-09-02T10:00:00'),
      session('2026-09-03T10:00:00')
    ];
    const retention = assessRetention({
      daySummaries,
      sessions,
      domains: domains('2026-09-03T10:00:00'),
      playedToday: false,
      streak: 0,
      now: NOW
    });
    const continuity = buildContinuitySnapshot({
      now: NOW,
      daySummaries,
      sessions
    });
    const programRetention = describeProgramRetention(retention, {
      profileLengthSec: 900,
      softReturnActive: continuity.ritual.active,
      playedToday: false
    });
    const exp = explainTodayPlan({
      calibrated: true,
      playedToday: false,
      continuity,
      retention,
      programRetention,
      focusDomains: ['attention'],
      planItems: [
        { exerciseId: 'stroop', reason: 'goal', domain: 'attention' },
        { exerciseId: 'grid-memory', reason: 'balance', domain: 'memory' }
      ]
    });
    expect(exp.recoveryPath).toBe(true);
    expect(exp.body).toBeTruthy();
    expect(exp.body).not.toMatch(SPAM);
    expect(exp.whyExercises).toBeTruthy();
    expect(exp.rhythmLine).toMatch(/^Ритм \d+/);
    // Soft return may own the story when openMisses in range
    expect(['soft_return', 'retention', 'default', 'adaptive']).toContain(exp.source);
    if (programRetention.coachOverride && !continuity.ritual.active) {
      expect(exp.body).toBe(programRetention.coachOverride);
    }
  });

  test('Today and Program get identical title+body from one object', () => {
    const { explanation } = buildTodayPlanExplanation({
      calibrated: true,
      playedToday: false,
      streak: 0,
      continuity: buildContinuitySnapshot({
        now: NOW,
        daySummaries: [day('2026-09-01'), day('2026-09-08')],
        sessions: [session('2026-09-01T10:00:00'), session('2026-09-08T10:00:00')]
      }),
      daySummaries: [day('2026-09-01'), day('2026-09-08')],
      sessions: [session('2026-09-01T10:00:00'), session('2026-09-08T10:00:00')],
      domains: domains('2026-09-08T10:00:00'),
      sessionLengthSec: 900,
      now: NOW,
      focusDomains: ['memory'],
      planItems: [{ exerciseId: 'grid-memory', reason: 'weak', domain: 'memory' }]
    });
    // Simulate three consumers reading the same object
    const todayHero = { title: explanation.title, body: explanation.body };
    const programCoach = { title: explanation.title, body: explanation.body };
    const coachTip = { title: explanation.title, body: explanation.body };
    expect(todayHero).toEqual(programCoach);
    expect(programCoach).toEqual(coachTip);
    expect(explanation.body).not.toMatch(SPAM);
  });

  test('played today → done source, rest-friendly copy', () => {
    const retention = assessRetention({
      daySummaries: [day('2026-09-11')],
      sessions: [session('2026-09-11T10:00:00')],
      domains: domains('2026-09-11T10:00:00'),
      playedToday: true,
      streak: 3,
      now: NOW
    });
    const continuity = buildContinuitySnapshot({
      now: NOW,
      daySummaries: [day('2026-09-11')],
      sessions: [session('2026-09-11T10:00:00')]
    });
    const exp = explainTodayPlan({
      calibrated: true,
      playedToday: true,
      continuity,
      retention
    });
    expect(exp.source).toBe('done');
    expect(exp.softenCta).toBe(false);
    expect(exp.body).not.toMatch(SPAM);
  });

  test('first-week day uses first_week source with ritual label CTA', () => {
    const plan = buildFirstWeekPlan({
      primaryGoal: 'attention',
      sessionLengthSec: 480,
      startDate: '2026-09-11'
    });
    const weekRitual = getTodayRitual(plan, '2026-09-11', []);
    const retention = assessRetention({
      daySummaries: [],
      sessions: [],
      domains: [],
      playedToday: false,
      streak: 0,
      now: NOW
    });
    const continuity = buildContinuitySnapshot({ now: NOW });
    const exp = explainTodayPlan({
      calibrated: true,
      playedToday: false,
      continuity,
      retention,
      inFirstWeek: true,
      weekRitual,
      focusDomains: weekRitual.ritualDay?.focusDomains || [],
      planItems: [{ exerciseId: 'odd-one', reason: 'goal', domain: 'attention' }]
    });
    expect(exp.source).toBe('first_week');
    expect(exp.title).toMatch(/День 1/);
    expect(exp.nextAction).toBeTruthy();
    expect(exp.body).not.toMatch(SPAM);
    expect(exp.whyExercises).toBeTruthy();
  });

});

describe('applyRetentionRitualOrder — neglect / gap reorders slots', () => {
  test('no-op when soft-return active', () => {
    const plan = {
      focusDomains: ['logic'],
      items: [
        { exerciseId: 'schulte', reason: 'a', domain: 'speed' },
        { exerciseId: 'grid-memory', reason: 'b', domain: 'memory' }
      ]
    };
    const out = applyRetentionRitualOrder(plan, {
      focusDomain: 'memory',
      band: 'at_risk',
      gapDays: 5,
      softReturnActive: true,
      catalog
    });
    expect(out.applied).toBe(false);
    expect(out.items[0].exerciseId).toBe('schulte');
  });

  test('neglect moves focus-domain exercises to the front', () => {
    const plan = {
      focusDomains: ['speed', 'attention'],
      items: [
        { exerciseId: 'schulte', reason: 'скорость', domain: 'speed' },
        { exerciseId: 'stroop', reason: 'внимание', domain: 'attention' },
        { exerciseId: 'grid-memory', reason: 'память', domain: 'memory' },
        { exerciseId: 'n-back', reason: 'память-2', domain: 'memory' }
      ]
    };
    const out = applyRetentionRitualOrder(plan, {
      focusDomain: 'memory',
      band: 'watch',
      gapDays: 0,
      softReturnActive: false,
      catalog
    });
    expect(out.applied).toBe(true);
    expect(out.focusDomains[0]).toBe('memory');
    expect(out.items[0].domain).toBe('memory');
    expect(out.items.map((i) => i.exerciseId).slice(0, 2)).toEqual(['grid-memory', 'n-back']);
    expect(out.items[0].reason).toMatch(/баланс|памят/i);
  });

  test('gap without neglect annotates first slot as recovery', () => {
    const plan = {
      focusDomains: ['attention'],
      items: [
        { exerciseId: 'stroop', reason: 'Неделя 2: работа над целью', domain: 'attention' },
        { exerciseId: 'posner', reason: 'свежий', domain: 'attention' }
      ]
    };
    const out = applyRetentionRitualOrder(plan, {
      focusDomain: null,
      band: 'at_risk',
      gapDays: 4,
      softReturnActive: false,
      catalog
    });
    expect(out.applied).toBe(true);
    expect(out.items[0].reason).toMatch(/возвращен|ритм|коротк/i);
  });

  test('stable band + no focus → no-op', () => {
    const plan = {
      focusDomains: ['attention'],
      items: [{ exerciseId: 'stroop', reason: 'ok', domain: 'attention' }]
    };
    const out = applyRetentionRitualOrder(plan, {
      focusDomain: null,
      band: 'stable',
      gapDays: 0,
      softReturnActive: false,
      catalog
    });
    expect(out.applied).toBe(false);
  });

  test('uses catalog domain when item.domain missing', () => {
    const plan = {
      focusDomains: ['speed'],
      items: [
        { exerciseId: 'schulte', reason: 'x' },
        { exerciseId: 'grid-memory', reason: 'y' }
      ]
    };
    const out = applyRetentionRitualOrder(plan, {
      focusDomain: 'memory',
      band: 'watch',
      gapDays: 0,
      softReturnActive: false,
      catalog
    });
    expect(out.applied).toBe(true);
    expect(out.items[0].exerciseId).toBe('grid-memory');
  });
});

describe('ctaLabelFromPlan + emptyPlanCopy — thin UX voice', () => {
  test('prefers nextAction over softenCta generic label', () => {
    expect(
      ctaLabelFromPlan({ nextAction: 'Лёгкий старт', softenCta: true, source: 'first_week' })
    ).toBe('Лёгкий старт');
    expect(
      ctaLabelFromPlan({ nextAction: 'Мягкий старт', softenCta: true, source: 'soft_return' })
    ).toBe('Мягкий старт');
    expect(
      ctaLabelFromPlan({ nextAction: '', softenCta: true, source: 'retention' })
    ).toBe('Короткий блок');
    expect(ctaLabelFromPlan(null)).toBe('Начать тренировку');
  });

  test('empty states stay FOMO-free and offer a calm CTA', () => {
    const spam = /прокачай|не пропусти|last chance|wikium|brain training/i;
    for (const kind of ['no_history', 'no_plan', 'offline', 'search'] as const) {
      const copy = emptyPlanCopy(kind);
      expect(copy.title).toBeTruthy();
      expect(copy.body).not.toMatch(spam);
      expect(copy.cta).toBeTruthy();
    }
    expect(emptyPlanCopy('no_history').cta).toMatch(/плану|сегодня/i);
    expect(emptyPlanCopy('offline').tone).toBe('recovery');
  });
});

import { rerollTodayPlanSlot } from '../src/core/today-plan';

describe('rerollTodayPlanSlot', () => {
  test('swaps one item, marks rerolled, second call no-ops, respects domain max count', () => {
    const items = [
      { exerciseId: 'a1', reason: 'reason 1', domain: 'A', nextExerciseId: 'a2', nextDomain: 'A' },
      { exerciseId: 'b1', reason: 'reason 2', domain: 'B' }
    ];
    
    const { items: newItems, applied } = rerollTodayPlanSlot(items, 0);
    expect(applied).toBe(true);
    expect(newItems[0].exerciseId).toBe('a2');
    expect(newItems[0].rerolled).toBe(true);
    expect(newItems[0].reason).toMatch(/следующий вариант/);
    expect(newItems[0].nextExerciseId).toBeUndefined();
    
    // second call
    const res2 = rerollTodayPlanSlot(newItems, 0);
    expect(res2.applied).toBe(false);
  });

  test('refuses a swap that would raise the max domain count', () => {
    const items = [
      { exerciseId: 'a1', reason: 'x', domain: 'A', nextExerciseId: 'b2', nextDomain: 'B' },
      { exerciseId: 'b1', reason: 'y', domain: 'B' },
      { exerciseId: 'c1', reason: 'z', domain: 'C' }
    ];
    // initial counts: A:1, B:1, C:1 -> max is 1.
    // swapping slot 0 to B would make counts: B:2, C:1 -> max is 2. This raises max domain count, so it should refuse.
    const { applied } = rerollTodayPlanSlot(items, 0);
    expect(applied).toBe(false);
  });
});
