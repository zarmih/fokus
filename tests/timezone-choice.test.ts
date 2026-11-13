import { afterEach, describe, expect, test } from 'vitest';
import {
  addCalendarDays, calendarDayKey, computeDayStreak, configureFokusTimeZones, currentFokusZone, extractPlayedDays,
  fokusWallHour, resolveFokusTimeZone, withZoneChange, zoneAt
} from '../src/core/streak';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../src/core/offline-sync';
import { changeZone, initialZones, zoneLabel, zoneOffsetMinutes, zoneOptions, zoneSuggestion } from '../src/core/time-zone-choice';

afterEach(() => configureFokusTimeZones(null));

const at = (iso: string) => Date.parse(iso);
const userDay = (iso: string) => calendarDayKey(iso, resolveFokusTimeZone().timeZone);

describe('explicit migration of Moscow history (schema 6)', () => {
  test('existing data gets a legacy Moscow period; stored dates and records are untouched', () => {
    const v5 = {
      profile: { name: 'M', createdAt: '2026-10-01T00:00:00Z', sessionLengthSec: 300, schemaVersion: 5 },
      sessions: [{ id: 's1', startedAt: '2026-11-10T22:30:00Z', items: [] }],
      daySummaries: [{ date: '2026-11-11', totalScore: 1, domainDeltas: {}, streak: 1, skipped: false }],
      meta: { schemaVersion: 5, deviceId: 'd', rev: 3, updatedAt: '2026-11-11T00:00:00Z' }
    };
    const m = migrateState(JSON.parse(JSON.stringify(v5)), { now: '2026-11-13T00:00:00Z', deviceId: 'd' });
    expect(CURRENT_SCHEMA_VERSION).toBe(6);
    expect(m.profile.timeZones).toEqual([{ zone: 'Europe/Moscow', fromMs: 0 }]);
    expect(m.sessions).toEqual(v5.sessions);
    expect(m.daySummaries).toEqual(v5.daySummaries);
    // idempotent
    expect(migrateState(JSON.parse(JSON.stringify(m)), { now: '2026-11-14T00:00:00Z', deviceId: 'd' }).profile.timeZones).toEqual(m.profile.timeZones);
  });

  test('without a chosen zone days are counted in Moscow, as before', () => {
    expect(currentFokusZone()).toBeNull();
    expect(resolveFokusTimeZone().timeZone).toBe('Europe/Moscow');
    expect(userDay('2026-11-10T22:30:00Z')).toBe('2026-11-11');
  });
});

describe('changing zone never re-dates past days', () => {
  test('a trip Moscow → Los Angeles: old sessions keep Moscow dates, new ones use LA', () => {
    const periods = withZoneChange([{ zone: 'Europe/Moscow', fromMs: 0 }], 'America/Los_Angeles', at('2026-11-12T12:00:00Z'));
    configureFokusTimeZones(periods);
    expect(resolveFokusTimeZone()).toEqual({ timeZone: 'America/Los_Angeles', source: 'user' });
    // 01:30 MSK on the 11th (= 14:30 on the 10th in LA) stays the 11th.
    expect(userDay('2026-11-10T22:30:00Z')).toBe('2026-11-11');
    // After the switch: 2026-11-13T06:00Z is the 12th in LA (22:00), though already the 13th in Moscow.
    expect(userDay('2026-11-13T06:00:00Z')).toBe('2026-11-12');
    // An explicit other zone is still honoured as-is.
    expect(calendarDayKey('2026-11-13T06:00:00Z', 'Europe/Moscow')).toBe('2026-11-13');
  });

  test('daily practice at 09:00 local keeps the streak across the trip', () => {
    const switchMs = at('2026-11-12T12:00:00Z');
    configureFokusTimeZones(withZoneChange([{ zone: 'Europe/Moscow', fromMs: 0 }], 'America/Los_Angeles', switchMs));
    const sessions = [
      { startedAt: '2026-11-10T06:00:00Z' }, // 09:00 MSK 10th
      { startedAt: '2026-11-11T06:00:00Z' }, // 09:00 MSK 11th
      { startedAt: '2026-11-12T06:00:00Z' }, // 09:00 MSK 12th (before the switch)
      { startedAt: '2026-11-13T17:00:00Z' }, // 09:00 PST 13th
      { startedAt: '2026-11-14T17:00:00Z' } // 09:00 PST 14th
    ];
    const days = extractPlayedDays({ sessions }, resolveFokusTimeZone().timeZone);
    expect(days).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']);
    expect(computeDayStreak(days, '2026-11-14').current).toBe(5);
  });

  test('withZoneChange appends, never rewrites; same zone is a no-op; bad zones ignored', () => {
    const base = [{ zone: 'Europe/Moscow', fromMs: 0 }];
    expect(withZoneChange(base, 'Europe/Moscow', 5)).toEqual(base);
    expect(withZoneChange(base, 'Not/AZone', 5)).toEqual(base);
    const two = withZoneChange(base, 'Asia/Tokyo', 1000);
    expect(two).toEqual([...base, { zone: 'Asia/Tokyo', fromMs: 1000 }]);
    const three = withZoneChange(two, 'Europe/Moscow', 500); // clock went backwards: still after the last period
    expect(three[2].fromMs).toBeGreaterThan(1000);
    expect(zoneAt(0, three)).toBe('Europe/Moscow');
    expect(zoneAt(1000, three)).toBe('Asia/Tokyo');
  });
});

describe('midnight and DST', () => {
  test('midnight boundaries in the user zone, including UTC+14', () => {
    configureFokusTimeZones([{ zone: 'Pacific/Kiritimati', fromMs: 0 }]);
    expect(userDay('2026-11-12T09:59:59Z')).toBe('2026-11-12');
    expect(userDay('2026-11-12T10:00:00Z')).toBe('2026-11-13');
    configureFokusTimeZones([{ zone: 'Europe/Moscow', fromMs: 0 }]);
    expect(userDay('2026-11-12T20:59:59Z')).toBe('2026-11-12');
    expect(userDay('2026-11-12T21:00:00Z')).toBe('2026-11-13');
  });

  test('New York spring-forward and fall-back days', () => {
    configureFokusTimeZones([{ zone: 'America/New_York', fromMs: 0 }]);
    // 2026-03-08: 02:00 EST → 03:00 EDT. 23:30 local on the 7th (EST, -5) and on the 8th (EDT, -4).
    expect(userDay('2026-03-08T04:30:00Z')).toBe('2026-03-07');
    expect(userDay('2026-03-09T03:30:00Z')).toBe('2026-03-08');
    expect(zoneOffsetMinutes('America/New_York', at('2026-03-08T06:59:00Z'))).toBe(-300);
    expect(zoneOffsetMinutes('America/New_York', at('2026-03-08T07:00:00Z'))).toBe(-240);
    // 2026-11-01: 01:00–02:00 happens twice; both are the 1st, and the wall hour is 1 both times.
    expect(userDay('2026-11-01T05:30:00Z')).toBe('2026-11-01');
    expect(userDay('2026-11-01T06:30:00Z')).toBe('2026-11-01');
    expect(fokusWallHour(new Date('2026-11-01T05:30:00Z'))).toBe(1);
    expect(fokusWallHour(new Date('2026-11-01T06:30:00Z'))).toBe(1);
    // Day arithmetic is on civil dates, so a 23- or 25-hour day is still one day.
    expect(addCalendarDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addCalendarDays('2026-10-31', 2)).toBe('2026-11-02');
    const days = extractPlayedDays({ sessions: [{ startedAt: '2026-03-07T14:00:00Z' }, { startedAt: '2026-03-08T13:00:00Z' }, { startedAt: '2026-03-09T13:00:00Z' }] }, 'America/New_York');
    expect(computeDayStreak(days, '2026-03-09').current).toBe(3);
  });
});

describe('zone choice', () => {
  test('new profile starts in the device zone; unknown device → Moscow', () => {
    expect(initialZones('Europe/Berlin')).toEqual([{ zone: 'Europe/Berlin', fromMs: 0 }]);
    expect(initialZones(null)).toEqual([{ zone: 'Europe/Moscow', fromMs: 0 }]);
    expect(initialZones('Bad/Zone')).toEqual([{ zone: 'Europe/Moscow', fromMs: 0 }]);
  });

  test('device zone is suggested only when it differs from the zone in use', () => {
    expect(zoneSuggestion({ timeZones: [{ zone: 'Europe/Moscow', fromMs: 0 }] }, 'Europe/London')).toBe('Europe/London');
    expect(zoneSuggestion({ timeZones: [{ zone: 'Europe/London', fromMs: 0 }] }, 'Europe/London')).toBeNull();
    expect(zoneSuggestion({}, 'Europe/Moscow')).toBeNull();
    expect(zoneSuggestion({}, null)).toBeNull();
  });

  test('options include device and current zone, sorted by offset, with DST-aware labels', () => {
    const winter = at('2026-01-15T12:00:00Z');
    const opts = zoneOptions('America/Argentina/Ushuaia', 'Asia/Kathmandu', winter);
    const zones = opts.map((o) => o.zone);
    expect(zones).toContain('America/Argentina/Ushuaia');
    expect(zones).toContain('Asia/Kathmandu');
    const offs = zones.map((z) => zoneOffsetMinutes(z, winter));
    expect([...offs].sort((a, b) => a - b)).toEqual(offs);
    expect(zoneLabel('Asia/Kathmandu', winter)).toBe('Kathmandu (UTC+5:45)');
    expect(zoneLabel('America/New_York', winter)).toBe('New York (UTC−5)');
    expect(zoneLabel('America/New_York', at('2026-07-15T12:00:00Z'))).toBe('New York (UTC−4)');
  });

  test('changeZone appends from now on', () => {
    const p: any = { name: 'x', createdAt: '', sessionLengthSec: 300, timeZones: [{ zone: 'Europe/Moscow', fromMs: 0 }] };
    const next = changeZone(p, 'Asia/Tokyo', 1234);
    expect(next.timeZones).toEqual([{ zone: 'Europe/Moscow', fromMs: 0 }, { zone: 'Asia/Tokyo', fromMs: 1234 }]);
    expect(p.timeZones).toHaveLength(1);
  });
});
