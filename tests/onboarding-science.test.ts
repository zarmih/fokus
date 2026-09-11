import { expect, test, describe } from 'vitest';
import {
  buildFirstWeekPlan,
  getTodayRitual,
  pickTransferTip,
  rampDurations,
  TRANSFER_TIPS,
  firstWeekPreviewLines,
  skipCopy,
  countMissedDays
} from '../src/core/onboarding';
import { bootstrapFromProbe } from '../src/core/calibration';

describe('First-week ritual', () => {
  test('ramps gently toward the chosen duration and never exceeds it', () => {
    const d5 = rampDurations(300);
    const d8 = rampDurations(480);
    const d12 = rampDurations(720);
    expect(d5.every((s) => s === 300)).toBe(true);
    expect(d8[0]).toBe(300);
    expect(d8[d8.length - 1]).toBe(480);
    expect(d8.every((s, i) => i === 0 || s >= d8[i - 1])).toBe(true);
    expect(d12[0]).toBe(300);
    expect(d12[d12.length - 1]).toBe(720);
    expect(Math.max(...d12)).toBeLessThanOrEqual(720);
  });

  test('one skip is forgiven and missed days are not added as makeup sessions', () => {
    const plan = buildFirstWeekPlan({
      primaryGoal: 'attention',
      sessionLengthSec: 480,
      startDate: '2026-09-11'
    });
    expect(plan.days).toHaveLength(7);
    expect(plan.skipPolicy).toBe('one-forgiven');
    expect(plan.days[0].focusDomains).toEqual(['attention']);
    expect(plan.days[3].intensity).toBe('gentle');

    const played = [{ date: '2026-09-11T09:00:00.000Z' }, { date: '2026-09-13T09:00:00.000Z' }];
    const day3 = getTodayRitual(plan, '2026-09-13', played);
    expect(day3.inFirstWeek).toBe(true);
    expect(day3.day).toBe(3);
    expect(day3.skipState).toBe('forgiven');
    expect(day3.copy).toMatch(/навёрстывать/i);
    expect(day3.copy).not.toMatch(/отработай|штраф|долг/i);
    expect(plan.days).toHaveLength(7);

    const resume = getTodayRitual(plan, '2026-09-15', [{ date: '2026-09-11' }]);
    expect(resume.skipState).toBe('resume');
    expect(resume.copy).toMatch(/не копим/);
    expect(resume.ritualDay?.day).toBe(5);
  });

  test('calendar days are not shifted to make up misses', () => {
    const plan = buildFirstWeekPlan({
      primaryGoal: 'memory',
      sessionLengthSec: 300,
      startDate: '2026-09-11'
    });
    const missed = countMissedDays('2026-09-11', '2026-09-14', [{ date: '2026-09-11' }]);
    expect(missed).toBe(2);
    const today = getTodayRitual(plan, '2026-09-14', [{ date: '2026-09-11' }]);
    expect(today.day).toBe(4);
    expect(today.ritualDay?.label).toBe('Лёгкий день');
  });

  test('week is complete after 7 calendar days', () => {
    const plan = buildFirstWeekPlan({
      primaryGoal: 'balance',
      sessionLengthSec: 300,
      startDate: '2026-09-11'
    });
    const done = getTodayRitual(plan, '2026-09-18', []);
    expect(done.inFirstWeek).toBe(false);
    expect(done.skipState).toBe('complete');
    expect(firstWeekPreviewLines(plan)[0]).toMatch(/День 1/);
  });

  test('uses probe snapshot to bias the weak-zone day', () => {
    const snap = bootstrapFromProbe([
      { exerciseId: 'grid-memory', domain: 'memory', accuracy: 0.2, avgRtMs: 1600, difficulty: 3, rounds: 10 },
      { exerciseId: 'odd-one', domain: 'attention', accuracy: 0.9, avgRtMs: 500, difficulty: 3, rounds: 10 }
    ]);
    const plan = buildFirstWeekPlan({
      primaryGoal: 'attention',
      sessionLengthSec: 480,
      startDate: '2026-09-11',
      snapshot: snap
    });
    expect(plan.days[4].focusDomains[0]).toBe('memory');
  });
});

describe('Transfer framing', () => {
  test('tips stay modest and do not copy rival products', () => {
    const banned = /wikium|elevate|lumosity|peak|neuronation|прокачать мозг|гарантир|чудо|brain age|ваш IQ/i;
    for (const tip of TRANSFER_TIPS) {
      expect(tip.body).not.toMatch(banned);
      expect(tip.title).not.toMatch(banned);
    }
    expect(TRANSFER_TIPS.some((t) => t.body.includes('Не медицинское изделие'))).toBe(true);
  });

  test('picks a domain tip from the weaker probed area', () => {
    const snap = bootstrapFromProbe([
      { exerciseId: 'stroop', domain: 'flexibility', accuracy: 0.15, avgRtMs: 1600, difficulty: 3, rounds: 10 },
      { exerciseId: 'odd-one', domain: 'attention', accuracy: 0.9, avgRtMs: 400, difficulty: 3, rounds: 10 }
    ]);
    const tip = pickTransferTip({ primaryGoal: 'attention', snapshot: snap });
    expect(tip.domain).toBe('flexibility');
  });

  test('skip copy never asks to make up missed days', () => {
    expect(skipCopy('forgiven')).not.toMatch(/наверста|догони|штраф/i);
    expect(skipCopy('resume')).toMatch(/сегодняшнего/);
  });
});
