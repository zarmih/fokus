import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { timeZoneSupported } from '../src/core/streak';
import {
  reminderDayKey,
  reminderPlayedOnDay,
  nextReminderFireAt,
  moscowWallHour,
  maybeNotify,
  REMINDER_LAST_KEY
} from '../src/core/reminders';
import { storage } from '../src/core/storage';

const TZ = 'Europe/Moscow';

test('reminderDayKey: UTC evening maps to next Moscow civil day', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 21:30 UTC = 2026-10-29 00:30 Europe/Moscow
  const now = new Date('2026-10-28T21:30:00.000Z');
  expect(now.toISOString().slice(0, 10)).toBe('2026-10-28');
  expect(reminderDayKey(now, TZ)).toBe('2026-10-29');
});

test('reminderDayKey: still previous Moscow day before midnight', () => {
  if (!timeZoneSupported(TZ)) return;
  // 2026-10-28 20:30 UTC = 2026-10-28 23:30 Europe/Moscow
  const beforeMidnight = new Date('2026-10-28T20:30:00.000Z');
  expect(reminderDayKey(beforeMidnight, TZ)).toBe('2026-10-28');
});

test('reminderPlayedOnDay: session just after Moscow midnight counts as Moscow today', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-03T21:30:00.000Z'); // 2026-10-04 00:30 MSK
  const today = reminderDayKey(now, TZ);
  expect(today).toBe('2026-10-04');

  const played = reminderPlayedOnDay(
    today,
    {
      daySummaries: [],
      sessions: [{ startedAt: '2026-10-03T21:30:00.000Z', finishedAt: '2026-10-03T21:40:00.000Z' }]
    },
    TZ
  );
  expect(played).toBe(true);

  // UTC-day startsWith would miss this (UTC date still 2026-10-03)
  expect('2026-10-03T21:30:00.000Z'.startsWith(now.toISOString().slice(0, 10))).toBe(true);
  expect('2026-10-03T21:30:00.000Z'.startsWith(today)).toBe(false);
});

test('reminderPlayedOnDay: civil summary date matches Moscow day key', () => {
  if (!timeZoneSupported(TZ)) return;
  const today = '2026-10-04';
  expect(
    reminderPlayedOnDay(today, { daySummaries: [{ date: '2026-10-04' }], sessions: [] }, TZ)
  ).toBe(true);
  expect(
    reminderPlayedOnDay(today, { daySummaries: [{ date: '2026-10-03' }], sessions: [] }, TZ)
  ).toBe(false);
});


test('nextReminderFireAt: before 9 MSK → same UTC day 06:00Z', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-29T05:30:00.000Z'); // 08:30 MSK
  const fire = nextReminderFireAt(now, 9, TZ);
  expect(fire.toISOString()).toBe('2026-10-29T06:00:00.000Z');
});

test('nextReminderFireAt: after 9 MSK → next calendar day 06:00Z', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-29T06:30:00.000Z'); // 09:30 MSK
  const fire = nextReminderFireAt(now, 9, TZ);
  expect(fire.toISOString()).toBe('2026-10-30T06:00:00.000Z');
});

test('nextReminderFireAt: exactly at fire instant rolls to tomorrow', () => {
  if (!timeZoneSupported(TZ)) return;
  const now = new Date('2026-10-29T06:00:00.000Z'); // 09:00 MSK exact
  const fire = nextReminderFireAt(now, 9, TZ);
  expect(fire.toISOString()).toBe('2026-10-30T06:00:00.000Z');
});

test('moscowWallHour: UTC morning maps to Moscow hour', () => {
  if (!timeZoneSupported(TZ)) return;
  expect(moscowWallHour(new Date('2026-10-29T05:30:00.000Z'), TZ)).toBe(8);
  expect(moscowWallHour(new Date('2026-10-29T06:30:00.000Z'), TZ)).toBe(9);
});

class ReminderMockStorage {
  data: Record<string, string> = {};
  getItem(k: string) {
    return this.data[k] ?? null;
  }
  setItem(k: string, v: string) {
    this.data[k] = v;
  }
  removeItem(k: string) {
    delete this.data[k];
  }
}

describe('maybeNotify Moscow hour gate', () => {
  let NotifSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (storage as any).backend = new ReminderMockStorage();
    storage.reset();
    const p = storage.getProfile();
    p.reminderHour = 9;
    storage.setProfile(p);
    try {
      localStorage.removeItem(REMINDER_LAST_KEY);
    } catch {
      /* ignore */
    }

    NotifSpy = vi.fn(function (this: any, title: string, opts?: NotificationOptions) {
      this.title = title;
      this.body = opts?.body;
      this.onclick = null;
      this.close = vi.fn();
    });
    Object.defineProperty(NotifSpy, 'permission', { value: 'granted', configurable: true });
    vi.stubGlobal('Notification', NotifSpy);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('maybeNotify: before 9 MSK does not fire Notification', () => {
    if (!timeZoneSupported(TZ)) return;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T05:30:00.000Z')); // 08:30 MSK
    maybeNotify();
    expect(NotifSpy).not.toHaveBeenCalled();
  });

  test('maybeNotify: at/after 9 MSK may fire Notification', () => {
    if (!timeZoneSupported(TZ)) return;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T06:30:00.000Z')); // 09:30 MSK
    maybeNotify();
    expect(NotifSpy).toHaveBeenCalled();
  });
});
