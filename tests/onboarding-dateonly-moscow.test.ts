import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  configureFokusTimeZones,
  resolveFokusTimeZone,
  timeZoneSupported,
  withZoneChange
} from '../src/core/streak';
import {
  buildFirstWeekPlan,
  countMissedDays,
  dateOnly,
  dayKey,
  daysBetween,
  getTodayRitual
} from '../src/core/onboarding';
import { renderOnboarding } from '../src/ui/screens/onboarding';
import { storage } from '../src/core/storage';

const TZ = 'Europe/Moscow';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

afterEach(() => {
  configureFokusTimeZones(null);
  vi.useRealTimers();
});

describe('dayKey and dateOnly mapping to Europe/Moscow civil day', () => {
  test('dayKey: aliases dateOnly and maps Moscow midnight correctly', () => {
    if (!timeZoneSupported(TZ)) return;
    expect(dayKey('2026-10-01T21:30:00.000Z')).toBe('2026-10-02');
    expect(dayKey('2026-10-01T20:59:59.000Z')).toBe('2026-10-01');
    expect(dayKey('2026-10-01')).toBe('2026-10-01');
    expect(dayKey('2026-10-01T21:30:00.000Z', 'UTC')).toBe('2026-10-01');
  });

  test('dateOnly: instant just after Moscow midnight maps to the Moscow civil day', () => {
    if (!timeZoneSupported(TZ)) return;
    // 2026-10-01 21:30 UTC = 2026-10-02 00:30 Europe/Moscow
    expect(dateOnly('2026-10-01T21:30:00.000Z')).toBe('2026-10-02');
    // 20:59 UTC = 23:59 MSK, still the same civil day
    expect(dateOnly('2026-10-01T20:59:59.000Z')).toBe('2026-10-01');
    // 21:00 UTC = exactly 00:00 MSK next day
    expect(dateOnly('2026-10-01T21:00:00.000Z')).toBe('2026-10-02');
  });

  test('dateOnly: plain civil keys pass through; explicit zone respected', () => {
    expect(dateOnly('2026-10-01')).toBe('2026-10-01');
    expect(dateOnly('2026-10-01T21:30:00.000Z', 'UTC')).toBe('2026-10-01');
  });

  test('daysBetween: Moscow civil days, not UTC slices', () => {
    if (!timeZoneSupported(TZ)) return;
    // 23:59 MSK 10-01 → 00:30 MSK 10-02 is one civil day apart
    expect(daysBetween('2026-10-01T20:59:00.000Z', '2026-10-01T21:30:00.000Z')).toBe(1);
    expect(daysBetween('2026-10-01', '2026-10-08')).toBe(7);
  });
});

describe('Начало программы по обе стороны московской полуночи (20:59Z vs 21:01Z)', () => {
  test('dayKey and buildFirstWeekPlan across Moscow midnight boundary', () => {
    if (!timeZoneSupported(TZ)) return;

    // 20:59:00 UTC = 23:59:00 MSK (before midnight)
    const beforeMidnightIso = '2026-10-01T20:59:00.000Z';
    // 21:01:00 UTC = 00:01:00 MSK (after midnight)
    const afterMidnightIso = '2026-10-01T21:01:00.000Z';

    expect(dayKey(beforeMidnightIso)).toBe('2026-10-01');
    expect(dayKey(afterMidnightIso)).toBe('2026-10-02');

    const planBefore = buildFirstWeekPlan({
      primaryGoal: 'attention',
      sessionLengthSec: 300,
      startDate: beforeMidnightIso
    });
    expect(planBefore.startDate).toBe('2026-10-01');

    const planAfter = buildFirstWeekPlan({
      primaryGoal: 'attention',
      sessionLengthSec: 300,
      startDate: afterMidnightIso
    });
    expect(planAfter.startDate).toBe('2026-10-02');
  });

  test('getTodayRitual progression across Moscow midnight', () => {
    if (!timeZoneSupported(TZ)) return;

    const plan = buildFirstWeekPlan({
      primaryGoal: 'attention',
      sessionLengthSec: 300,
      startDate: '2026-10-01T20:59:00.000Z' // Day 1 is 2026-10-01
    });

    // Same evening at 23:59 MSK: still Day 1
    const r1 = getTodayRitual(plan, '2026-10-01T20:59:00.000Z', []);
    expect(r1.day).toBe(1);
    expect(r1.inFirstWeek).toBe(true);

    // Two minutes later at 00:01 MSK: advances to Day 2
    const r2 = getTodayRitual(plan, '2026-10-01T21:01:00.000Z', [{ date: '2026-10-01' }]);
    expect(r2.day).toBe(2);
    expect(r2.inFirstWeek).toBe(true);
  });
});

describe('Обратная совместимость: ранее записанный полный ISO timestamp', () => {
  test('legacy ISO timestamp in firstWeekPlan.startDate is handled correctly', () => {
    if (!timeZoneSupported(TZ)) return;

    // Older versions saved new Date().toISOString() into firstWeekPlan.startDate
    const legacyPlan = {
      startDate: '2026-10-01T21:30:00.000Z', // 00:30 MSK on Oct 2nd
      targetSessionSec: 300,
      primaryGoal: 'attention' as const,
      skipPolicy: 'one-forgiven' as const,
      days: []
    };

    // getTodayRitual handles legacy ISO string seamlessly
    const ritual = getTodayRitual(legacyPlan, '2026-10-02T10:00:00.000Z', []);
    expect(ritual.day).toBe(1);
    expect(ritual.inFirstWeek).toBe(true);

    // countMissedDays works identically with legacy ISO string and normalized dateOnly
    const missedWithIso = countMissedDays('2026-10-01T21:30:00.000Z', '2026-10-04T12:00:00.000Z', [
      { date: '2026-10-02' }
    ]);
    const missedWithDateOnly = countMissedDays('2026-10-02', '2026-10-04', [
      { date: '2026-10-02' }
    ]);
    expect(missedWithIso).toBe(missedWithDateOnly);
    expect(missedWithIso).toBe(1); // Oct 3 was missed
  });
});

describe('Новый профиль: чистый YYYY-MM-DD для плана и полный ISO timestamp для событий', () => {
  beforeEach(() => {
    (storage as any).backend = new MockStorage();
    storage.reset();
    document.body.innerHTML = '<div id="app"></div>';
  });

  test('onboarding screen stores normalized calendar date in firstWeekPlan and full timestamp in onboardingCompletedAt', () => {
    if (!timeZoneSupported(TZ)) return;

    // Fix time to 21:05 UTC (= 00:05 MSK next day)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T21:05:00.000Z'));

    const app = document.getElementById('app')!;
    renderOnboarding(app);

    // Step 1: Goal
    (app.querySelector('input[name="onboard-goal"][value="attention"]') as HTMLInputElement).checked = true;
    (app.querySelector('#btn-next') as HTMLButtonElement).click();

    // Step 2: Time
    (app.querySelector('input[name="onboard-time"][value="5"]') as HTMLInputElement).checked = true;
    (app.querySelector('#btn-next') as HTMLButtonElement).click();

    // Step 3: Name and finish
    const nameInput = app.querySelector('#onboard-name') as HTMLInputElement;
    nameInput.value = 'Алексей';
    nameInput.dispatchEvent(new Event('input'));
    (app.querySelector('#btn-next') as HTMLButtonElement).click();

    const profile = storage.getProfile();

    // 1. Calendar day is normalized to YYYY-MM-DD (Moscow civil day 2026-10-02)
    expect(profile.firstWeekPlan?.startDate).toBe('2026-10-02');
    expect(profile.firstWeekPlan?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // 2. Event moment retains the full ISO timestamp with time and timezone
    expect(profile.onboardingCompletedAt).toBe('2026-10-01T21:05:00.000Z');
    expect(new Date(profile.onboardingCompletedAt!).toISOString()).toBe('2026-10-01T21:05:00.000Z');
  });
});

describe('Onboarding, Today и серия при смене TZ устройства', () => {
  test('calendar day calculation is invariant across process timezones', () => {
    if (!timeZoneSupported(TZ)) return;

    // Regardless of host machine timezone, default civil zone Europe/Moscow produces consistent calendar days
    const testInstant = '2026-10-01T21:30:00.000Z';
    expect(dateOnly(testInstant)).toBe('2026-10-02');
    expect(dayKey(testInstant)).toBe('2026-10-02');
  });

  test('switching device zone preserves past calendar days and anchors new sessions correctly', () => {
    if (!timeZoneSupported(TZ)) return;

    // User starts in Moscow
    const moscowStart = '2026-10-01T20:59:00.000Z'; // 23:59 MSK -> 2026-10-01
    const plan = buildFirstWeekPlan({
      primaryGoal: 'balance',
      sessionLengthSec: 300,
      startDate: moscowStart
    });
    expect(plan.startDate).toBe('2026-10-01');

    // User flies to Los Angeles on day 3
    const switchTime = Date.parse('2026-10-03T18:00:00.000Z');
    const periods = withZoneChange(
      [{ zone: 'Europe/Moscow', fromMs: 0 }],
      'America/Los_Angeles',
      switchTime
    );
    configureFokusTimeZones(periods);

    expect(resolveFokusTimeZone().timeZone).toBe('America/Los_Angeles');

    // Day 1 and 2 sessions keep their recorded calendar days
    const pastSummaries = [
      { date: '2026-10-01' },
      { date: '2026-10-02' }
    ];

    // Today in Los Angeles on Oct 3rd (14:00 PDT = 21:00 UTC)
    const todayInLA = '2026-10-03T21:00:00.000Z';
    const ritual = getTodayRitual(plan, todayInLA, pastSummaries);
    expect(ritual.inFirstWeek).toBe(true);
    expect(ritual.day).toBe(3);
    expect(ritual.missedDays).toBe(0);
  });
});
