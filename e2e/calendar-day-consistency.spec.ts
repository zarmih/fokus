import { expect, test } from '@playwright/test';
import { calibrateNewUser, navigate, openFresh, stored, tick, playThrough, startToday } from './helpers';

test.describe('Calendar Day Consistency — America/Los_Angeles', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('new profile in Los Angeles starts Day 1 cleanly and records local device zone', async ({ page }) => {
    // 2026-11-12 19:00:00 UTC = 2026-11-12 11:00:00 PST (Nov 12 in LA and Moscow)
    const timeLA = new Date('2026-11-12T19:00:00Z');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: timeLA });
    await page.goto('./');
    await tick(page, 1500);

    await calibrateNewUser(page);

    const s = await stored(page);
    expect(s.profile.timeZones).toEqual([{ zone: 'America/Los_Angeles', fromMs: 0 }]);
    expect(s.profile.firstWeekPlan?.startDate).toBe('2026-11-12');

    // On Today screen, Day 1 of first week must be active
    await expect(page.locator('#btn-start')).toBeVisible();
    await expect(page.locator('.week-card')).toBeVisible();
    await expect(page.locator('.week-kicker')).toContainText('день 1 из 7');
    await expect(page.locator('.habit-chip .stat-num')).toHaveText('0');
  });
});

test.describe('Calendar Day Consistency — Pacific/Kiritimati (UTC+14)', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' });

  test('new profile in Kiritimati starts Day 1 and records local device zone', async ({ page }) => {
    // 2026-11-12 06:00:00 UTC = 2026-11-12 20:00:00 (+14) in Kiritimati (Nov 12 in both)
    const timeKiritimati = new Date('2026-11-12T06:00:00Z');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: timeKiritimati });
    await page.goto('./');
    await tick(page, 1500);

    await calibrateNewUser(page);

    const s = await stored(page);
    expect(s.profile.timeZones).toEqual([{ zone: 'Pacific/Kiritimati', fromMs: 0 }]);
    expect(s.profile.firstWeekPlan?.startDate).toBe('2026-11-12');

    // Today screen shows Day 1
    await expect(page.locator('#btn-start')).toBeVisible();
    await expect(page.locator('.week-card')).toBeVisible();
    await expect(page.locator('.week-kicker')).toContainText('день 1 из 7');
    await expect(page.locator('.habit-chip .stat-num')).toHaveText('0');
  });
});

test.describe('Calendar Day Consistency — Moscow midnight boundary', () => {
  test.use({ timezoneId: 'Europe/Moscow' });

  test('crossing Moscow midnight transitions cleanly from Day 1 to Day 2', async ({ page }) => {
    test.slow();
    // 2026-10-01 20:30:00 UTC = 2026-10-01 23:30:00 MSK (30 minutes before midnight)
    const beforeMidnight = new Date('2026-10-01T20:30:00Z');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: beforeMidnight });
    await page.goto('./');
    await tick(page, 1500);

    await calibrateNewUser(page);

    const s1 = await stored(page);
    expect(s1.profile.firstWeekPlan?.startDate).toBe('2026-10-01');
    await expect(page.locator('#btn-start')).toBeVisible();
    await expect(page.locator('.week-card')).toBeVisible();
    await expect(page.locator('.week-kicker')).toContainText('день 1 из 7');

    // Complete first regular session before midnight
    await startToday(page);
    await expect(page.locator('[data-session-phase="intro"]')).toBeVisible();
    await playThrough(page);
    await expect(page.getByText('Итог').first()).toBeVisible();

    const s2 = await stored(page);
    expect(s2.daySummaries.length).toBeGreaterThanOrEqual(1);
    expect(s2.daySummaries[0].date).toContain('2026-10-01');

    // Keep Today open while the clock crosses Moscow midnight.
    await navigate(page, 'today');
    await expect(page.locator('[data-plan-day]')).toHaveAttribute('data-plan-day', '2026-10-01');
    await page.clock.setSystemTime(new Date('2026-10-01T20:59:59Z'));
    await tick(page, 16_000);

    // It is now Day 2 of the program
    await expect(page.locator('.week-card')).toBeVisible();
    await expect(page.locator('.week-kicker')).toContainText('день 2 из 7');
    await expect(page.locator('.habit-chip .stat-num')).toHaveText('1');
    const nextPlan = await page.locator('.workout-chip').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-exercise-id')));
    expect(nextPlan.length).toBeGreaterThan(0);
    await page.locator('#tab-program').click();
    await expect(page.locator('[data-plan-day]')).toHaveAttribute('data-plan-day', '2026-10-02');
    const program = page.locator('.ritual-row');
    await expect(program).toHaveCount(nextPlan.length);
    expect(await program.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-exercise-id')))).toEqual(nextPlan);
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
              { day: 2, durationSec: 300, focusDomains: ['attention', 'memory'], intensity: 'steady', label: 'Входим в ритм (адаптация)' },
              { day: 3, durationSec: 300, focusDomains: ['speed'], intensity: 'steady', label: 'Скорость реакции' },
              { day: 4, durationSec: 300, focusDomains: ['flexibility'], intensity: 'steady', label: 'Гибкость переключения' },
              { day: 5, durationSec: 300, focusDomains: ['logic'], intensity: 'steady', label: 'Логические цепочки' },
              { day: 6, durationSec: 300, focusDomains: ['memory'], intensity: 'steady', label: 'Закрепление памяти' },
              { day: 7, durationSec: 300, focusDomains: ['attention', 'logic'], intensity: 'steady', label: 'Итоговый обзор' }
            ]
          }
        },
        sessions: [],
        daySummaries: [],
        history: [],
        domains: [],
        skills: [],
        exerciseStates: []
      };
      localStorage.setItem('fokus.v1', JSON.stringify(state));
    });

    await page.goto('./');
    await tick(page, 1500);

    // Day 1 since start is 2026-10-02 MSK and now is 2026-10-02 MSK
    await expect(page.locator('.week-card')).toBeVisible();
    await expect(page.locator('.week-kicker')).toContainText('день 1 из 7');
  });
});
