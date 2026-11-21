import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  configureFokusTimeZones,
  resolveFokusTimeZone,
  timeZoneSupported,
  calendarDayKey
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
import { loadContinuitySnapshot } from '../src/core/continuity';

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
  configureFokusTimeZones(null);
  vi.useRealTimers();
});

describe('Calendar Day Consistency — Unit Scenarios', () => {
  describe('1. Previously recorded ISO timestamp handling', () => {
    test('startDate as ISO string with Z or offset resolves consistently to civil day', () => {
      // 2026-10-01 21:30 UTC = 2026-10-02 00:30 MSK
      const isoZ = '2026-10-01T21:30:00.000Z';
      const isoOffset = '2026-10-02T00:30:00+03:00';
      const plainDate = '2026-10-02';

      expect(dateOnly(isoZ, 'Europe/Moscow')).toBe('2026-10-02');
      expect(dateOnly(isoOffset, 'Europe/Moscow')).toBe('2026-10-02');
      expect(dateOnly(plainDate, 'Europe/Moscow')).toBe('2026-10-02');

      const planFromIso = buildFirstWeekPlan({
        sessionLengthSec: 300,
        startDate: isoZ,
        timeZone: 'Europe/Moscow'
      });
      expect(planFromIso.startDate).toBe('2026-10-02');

      // Legacy plan object that directly has ISO string in startDate
      const legacyPlan = {
        ...planFromIso,
        startDate: isoZ
      };

      const ritualDay1 = getTodayRitual(legacyPlan, '2026-10-02', [], 'Europe/Moscow');
      expect(ritualDay1.inFirstWeek).toBe(true);
      expect(ritualDay1.day).toBe(1);
      expect(ritualDay1.skipState).toBe('on-track');

      const ritualDay2 = getTodayRitual(legacyPlan, '2026-10-03', [{ date: '2026-10-02' }], 'Europe/Moscow');
      expect(ritualDay2.inFirstWeek).toBe(true);
      expect(ritualDay2.day).toBe(2);
      expect(ritualDay2.skipState).toBe('on-track');
    });

    test('countMissedDays with ISO session timestamps across civil days', () => {
      // Session recorded at 21:30 UTC = 00:30 MSK on 2026-10-02
      const summaries = [{ date: '2026-10-01T21:30:00.000Z' }];
      // Day 1: 10-01, today: 10-03
      // Played: 10-02 (MSK). Missed: 10-01 → 1 missed day
      const missed = countMissedDays('2026-10-01', '2026-10-03', summaries, 'Europe/Moscow');
      expect(missed).toBe(1);
    });
  });

  describe('2. Start of program across Moscow midnight (20:59Z vs 21:01Z)', () => {
    test('before Moscow midnight (20:59Z = 23:59 MSK): starts on 2026-10-01', () => {
      const now = new Date('2026-10-01T20:59:00.000Z');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now);

      const plan = buildFirstWeekPlan({
        sessionLengthSec: 300,
        startDate: now.toISOString(),
        timeZone: 'Europe/Moscow'
      });
      expect(plan.startDate).toBe('2026-10-01');

      const ritual = getTodayRitual(plan, now.toISOString(), [], 'Europe/Moscow');
      expect(ritual.inFirstWeek).toBe(true);
      expect(ritual.day).toBe(1);

      // Session completed at 23:59 MSK
      storage.addDaySummary({
        date: '2026-10-01',
        totalScore: 100,
        domainDeltas: { attention: 5 },
        streak: 1,
        skipped: false
      });

      const snap = loadContinuitySnapshot(storage, now);
      expect(snap.today).toBe('2026-10-01');
      expect(snap.streak.current).toBe(1);
      expect(snap.streak.playedToday).toBe(true);
    });

    test('after Moscow midnight (21:01Z = 00:01 MSK): starts on 2026-10-02', () => {
      const now = new Date('2026-10-01T21:01:00.000Z');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now);

      const plan = buildFirstWeekPlan({
        sessionLengthSec: 300,
        startDate: now.toISOString(),
        timeZone: 'Europe/Moscow'
      });
      expect(plan.startDate).toBe('2026-10-02');

      const ritual = getTodayRitual(plan, now.toISOString(), [], 'Europe/Moscow');
      expect(ritual.inFirstWeek).toBe(true);
      expect(ritual.day).toBe(1);

      // Session completed at 00:01 MSK
      storage.addDaySummary({
        date: '2026-10-02',
        totalScore: 100,
        domainDeltas: { attention: 5 },
        streak: 1,
        skipped: false
      });

      const snap = loadContinuitySnapshot(storage, now);
      expect(snap.today).toBe('2026-10-02');
      expect(snap.streak.current).toBe(1);
      expect(snap.streak.playedToday).toBe(true);
    });
  });

  describe('3. Consistency across device timezones (UTC, America/Los_Angeles, Pacific/Kiritimati)', () => {
    test.each([
      { zone: 'UTC', instant: '2026-11-12T12:00:00Z', expectedDay: '2026-11-12' },
      { zone: 'America/Los_Angeles', instant: '2026-11-12T02:00:00Z', expectedDay: '2026-11-11' }, // 18:00 on Nov 11 in LA
      { zone: 'Pacific/Kiritimati', instant: '2026-11-12T11:00:00Z', expectedDay: '2026-11-13' }  // 01:00 on Nov 13 in Kiritimati (+14)
    ])('onboarding, Today and streak agree on $zone', ({ zone, instant, expectedDay }) => {
      if (!timeZoneSupported(zone)) return;

      const now = new Date(instant);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now);

      // Emulate device timeZone by persisting in user profile
      storage.setProfile({ ...storage.getProfile(), timeZones: [{ zone, fromMs: 0 }] });

      // Onboarding plan generated in this timezone
      const plan = buildFirstWeekPlan({
        sessionLengthSec: 300,
        startDate: now.toISOString(),
        timeZone: zone
      });
      expect(plan.startDate).toBe(expectedDay);

      // Today screen check
      const snap = loadContinuitySnapshot(storage, now);
      expect(snap.timeZone).toBe(zone);
      expect(snap.today).toBe(expectedDay);

      const ritual = getTodayRitual(plan, snap.today, [], zone);
      expect(ritual.inFirstWeek).toBe(true);
      expect(ritual.day).toBe(1);
      expect(ritual.skipState).toBe('on-track');

      // Complete session
      storage.addDaySummary({
        date: snap.today,
        totalScore: 150,
        domainDeltas: { attention: 3 },
        streak: 1,
        skipped: false
      });

      const snapAfter = loadContinuitySnapshot(storage, now);
      expect(snapAfter.streak.current).toBe(1);
      expect(snapAfter.streak.playedToday).toBe(true);
      expect(snapAfter.today).toBe(expectedDay);
    });

    test('device timezone change preserves history and aligns Today with active profile zone', () => {
      // User creates profile in Europe/Moscow on 2026-10-01
      storage.setProfile({ ...storage.getProfile(), timeZones: [{ zone: 'Europe/Moscow', fromMs: 0 }] });
      storage.addDaySummary({
        date: '2026-10-01',
        totalScore: 100,
        domainDeltas: { attention: 4 },
        streak: 1,
        skipped: false
      });

      // User travels to America/Los_Angeles
      // Profile retains Europe/Moscow until explicitly switched
      const snapMoscow = loadContinuitySnapshot(storage, new Date('2026-10-02T12:00:00Z'));
      expect(snapMoscow.today).toBe('2026-10-02');
      expect(snapMoscow.streak.current).toBe(1);

      // User switches zone to America/Los_Angeles in settings at switchMs
      const switchMs = new Date('2026-10-02T15:00:00Z').getTime();
      storage.setProfile({
        ...storage.getProfile(),
        timeZones: [
          { zone: 'Europe/Moscow', fromMs: 0 },
          { zone: 'America/Los_Angeles', fromMs: switchMs }
        ]
      });

      // At switch time: 2026-10-02 15:00 UTC = 08:00 AM Oct 2 in LA
      const snapLA = loadContinuitySnapshot(storage, new Date('2026-10-02T15:00:00Z'));
      expect(snapLA.timeZone).toBe('America/Los_Angeles');
      expect(snapLA.today).toBe('2026-10-02');
      // Past day 2026-10-01 is preserved in streak
      expect(snapLA.streak.current).toBe(1);
      expect(snapLA.playedDays).toContain('2026-10-01');
    });
  });
});
