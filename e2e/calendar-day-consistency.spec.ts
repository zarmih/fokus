import { expect, test } from '@playwright/test';
import { navigate, onboard, openFresh, stored, tick, playThrough } from './helpers';

test.describe('Calendar Day Consistency — America/Los_Angeles', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('new profile in Los Angeles matches local date and starts Day 1 cleanly', async ({ page }) => {
    // 2026-11-12 02:00:00 UTC = 2026-11-11 18:00:00 PST (Nov 11 in LA, Nov 12 in Moscow)
    const timeLA = new Date('2026-11-12T02:00:00Z');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: timeLA });
    await page.goto('./');
    await tick(page, 1500);

    await onboard(page);

    const s = await stored(page);
    expect(s.profile.timeZones).toEqual([{ zone: 'America/Los_Angeles', fromMs: 0 }]);
    expect(s.profile.firstWeekPlan?.startDate).toBe('2026-11-11');

    // On Today screen, Day 1 must be active (not upcoming or skipped)
    await expect(page.locator('#today-plan')).toBeVisible();
    await expect(page.locator('body')).toContainText('День 1');
    await expect(page.locator('#streak-days')).toHaveText('0');
  });
});

test.describe('Calendar Day Consistency — Pacific/Kiritimati (UTC+14)', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' });

  test('new profile in Kiritimati matches local date (+1 day from UTC) and starts Day 1', async ({ page }) => {
    // 2026-11-12 11:00:00 UTC = 2026-11-13 01:00:00 (+14) in Kiritimati
    const timeKiritimati = new Date('2026-11-12T11:00:00Z');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: timeKiritimati });
    await page.goto('./');
    await tick(page, 1500);

    await onboard(page);

    const s = await stored(page);
    expect(s.profile.timeZones).toEqual([{ zone: 'Pacific/Kiritimati', fromMs: 0 }]);
    expect(s.profile.firstWeekPlan?.startDate).toBe('2026-11-13');

    // Today screen shows Day 1
    await expect(page.locator('#today-plan')).toBeVisible();
    await expect(page.locator('body')).toContainText('День 1');
  });
});

test.describe('Calendar Day Consistency — Moscow midnight boundary', () => {
  test.use({ timezoneId: 'Europe/Moscow' });

  test('crossing Moscow midnight transitions cleanly from Day 1 to Day 2', async ({ page }) => {
    // 2026-10-01 20:55:00 UTC = 2026-10-01 23:55:00 MSK (5 minutes before midnight)
    const beforeMidnight = new Date('2026-10-01T20:55:00Z');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: beforeMidnight });
    await page.goto('./');
    await tick(page, 1500);

    await onboard(page);

    const s1 = await stored(page);
    expect(s1.profile.firstWeekPlan?.startDate).toBe('2026-10-01');
    await expect(page.locator('#today-plan')).toBeVisible();
    await expect(page.locator('body')).toContainText('День 1');

    // Complete first session before midnight
    await page.locator('#btn-start').click();
    await playThrough(page);
    await tick(page, 1000);

    const s2 = await stored(page);
    expect(s2.daySummaries.length).toBe(1);
    expect(s2.daySummaries[0].date).toBe('2026-10-01');

    // Advance clock past Moscow midnight (2026-10-01 21:05:00 UTC = 2026-10-02 00:05:00 MSK)
    await page.clock.setSystemTime(new Date('2026-10-01T21:05:00Z'));
    await navigate(page, 'today');
    await tick(page, 500);

    // It is now Day 2 of the program
    await expect(page.locator('#today-plan')).toBeVisible();
    await expect(page.locator('body')).toContainText('День 2');
    await expect(page.locator('#streak-days')).toHaveText('1');
  });

  test('previously recorded ISO timestamp in firstWeekPlan.startDate parses cleanly', async ({ page }) => {
    const now = new Date('2026-10-02T12:00:00+03:00');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: now });

    // Seed state with ISO timestamp in firstWeekPlan.startDate
    await page.addInitScript(() => {
      const state = {
        meta: { schemaVersion: 6, rev: 1, updatedAt: '2026-10-02T09:00:00Z' },
        profile: {
          schemaVersion: 6,
          name: 'ISO Tester',
          displayName: 'ISO Tester',
          onboarded: true,
          calibrated: true,
          timeZones: [{ zone: 'Europe/Moscow', fromMs: 0 }],
          sessionLengthSec: 300,
          primaryGoal: 'attention',
          firstWeekPlan: {
            startDate: '2026-10-01T21:30:00.000Z', // 00:30 MSK on 2026-10-02
            targetSessionSec: 300,
            primaryGoal: 'attention',
            skipPolicy: 'one-forgiven',
            days: [
              { day: 1, durationSec: 300, focusDomains: ['attention'], intensity: 'steady', label: 'Знакомство с форматом (без спешки)' },
              { day: 2, durationSec: 300, focusDomains: ['attention', 'memory'], intensity: 'steady', label: 'Входим в ритм (адаптация)' }
            ]
          }
        },
        sessions: [],
        daySummaries: [],
        domains: [],
        skills: [],
        exerciseStates: []
      };
      localStorage.setItem('fokus.app.state.v1', JSON.stringify(state));
    });

    await page.goto('./');
    await tick(page, 1500);

    // Day 1 since start is 2026-10-02 MSK and now is 2026-10-02 MSK
    await expect(page.locator('#today-plan')).toBeVisible();
    await expect(page.locator('body')).toContainText('День 1');
  });
});
