import { expect, test } from 'vitest';
import { calendarDayKey, addCalendarDays, timeZoneSupported } from '../src/core/streak';
import { buildFirstWeekPlan, getTodayRitual, countMissedDays } from '../src/core/onboarding';

test('1. Lifestyle: stored date 2026-10-04 equals calendarDayKey', () => {
  if (!timeZoneSupported('Europe/Moscow')) return;
  const storedDate = '2026-10-04';
  const tz = 'Europe/Moscow';
  const now = new Date('2026-10-03T22:30:00.000Z');
  expect(calendarDayKey(now, tz)).toBe(storedDate);
  expect(now.toISOString().slice(0, 10)).toBe('2026-10-03');
});

test('2. Unfinished session: calendarDayKey equals Moscow civil day', () => {
  if (!timeZoneSupported('Europe/Moscow')) return;
  const startedAt = '2026-10-03T21:30:00.000Z';
  const tz = 'Europe/Moscow';
  expect(calendarDayKey(startedAt, tz)).toBe('2026-10-04');
  expect(startedAt.startsWith('2026-10-04')).toBe(false);
});

test('3. Ritual: buildFirstWeekPlan and getTodayRitual boundary', () => {
  const plan = buildFirstWeekPlan({ sessionLengthSec: 300, startDate: '2026-10-01' });
  expect(getTodayRitual(plan, '2026-10-04', []).day).toBe(4);
  expect(getTodayRitual(plan, '2026-10-03', []).day).toBe(3);
});

test('4. countMissedDays handles UTC strings with Moscow boundary', () => {
  if (!timeZoneSupported('Europe/Moscow')) return;
  const missed1 = countMissedDays('2026-10-01', '2026-10-04', [{ date: '2026-10-03T21:30:00.000Z' }]);
  expect(missed1).toBe(3);
  
  const missed2 = countMissedDays('2026-09-11', '2026-09-14', [{ date: '2026-09-11' }]);
  expect(missed2).toBe(2);
});

test('5. Chart key: addCalendarDays and calendarDayKey', () => {
  if (!timeZoneSupported('Europe/Moscow')) return;
  const tz = 'Europe/Moscow';
  expect(addCalendarDays('2026-10-04', -1)).toBe('2026-10-03');
  expect(calendarDayKey('2026-10-03T21:30:00.000Z', tz)).toBe('2026-10-04');
});

import { beforeEach, afterEach, vi } from 'vitest';
import { renderToday } from '../src/ui/screens/today';
import { storage } from '../src/core/storage';

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

afterEach(() => {
  vi.useRealTimers();
});

test('unfinished session started just after Moscow midnight still offers resume', () => {
  if (!timeZoneSupported('Europe/Moscow')) return;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-03T21:30:00.000Z'));

  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 300;
  storage.setProfile(p);
  storage.addSession({
    id: 'open-1',
    startedAt: '2026-10-03T21:30:00.000Z',
    finishedAt: null,
    durationSec: 40,
    plannedDurationSec: 300,
    items: [{ exerciseId: 'odd-one', level: 2, accuracy: 0.8, avgRtMs: 500, score: 10 }]
  });

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Продолжить тренировку/);
  expect(calendarDayKey(new Date(), 'Europe/Moscow')).toBe('2026-10-04');
});
