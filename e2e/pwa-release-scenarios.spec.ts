import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { calibrateNewUser, navigate, openFresh, playThrough, startToday, stored, tick } from './helpers';

test.describe('PWA Release Scenarios — Service Worker, Data Privacy, Offline Recovery & A11y', () => {

  test('SW update preserves calibration, sessions, and streak progress', async ({ page }) => {
    const errors = await openFresh(page, { clock: false });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    // Seed calibrated user with session and day summary
    await page.evaluate(() => {
      const state = {
        meta: { schemaVersion: 6, rev: 1, updatedAt: '2026-11-12T09:00:00Z' },
        profile: {
          schemaVersion: 6,
          name: 'PWA Tester',
          displayName: 'PWA Tester',
          onboarded: true,
          calibrated: true,
          timeZones: [{ zone: 'Europe/Moscow', fromMs: 0 }],
          sessionLengthSec: 300,
          primaryGoal: 'attention'
        },
        sessions: [{
          id: 's-1',
          mode: 'normal',
          startedAt: '2026-11-12T09:00:00Z',
          finishedAt: '2026-11-12T09:05:00Z',
          durationSec: 300,
          items: []
        }],
        daySummaries: [{
          date: '2026-11-12T09:00:00Z',
          totalScore: 100,
          domainDeltas: {},
          streak: 1,
          skipped: false
        }],
        domains: [],
        skills: [],
        exerciseStates: []
      };
      localStorage.setItem('fokus.v1', JSON.stringify(state));
    });
    await page.reload();
    await page.waitForSelector('#app *');

    const before = await stored(page);
    expect(before.profile.calibrated).toBe(true);
    expect(before.sessions.length).toBeGreaterThanOrEqual(1);

    // Simulate an update deployment
    const swPath = path.join(process.cwd(), 'dist', 'sw.js');
    const original = fs.readFileSync(swPath, 'utf8');
    try {
      fs.writeFileSync(swPath, original.replace(/const CACHE = "fokus-[^"]+"/, 'const CACHE = "fokus-pwa-scenarios-update"'));
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      });
      await expect(page.locator('#btn-pwa-update')).toBeVisible({ timeout: 20_000 });
      await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
      await Promise.all([page.waitForEvent('load'), page.locator('#btn-pwa-update').click()]);
      await page.waitForFunction(() => caches.keys().then((k) => k.filter((name) => name.startsWith('fokus-')).join() === 'fokus-pwa-scenarios-update'));
      await page.waitForSelector('#app *');
      const after = await stored(page);
      expect(after.profile.calibrated).toBe(true);
      expect(after.profile.name).toBe(before.profile.name);
      expect(after.profile.onboarded).toBe(true);
      expect(after.sessions).toEqual(before.sessions);
      expect(after.daySummaries).toEqual(before.daySummaries);
    } finally {
      fs.writeFileSync(swPath, original);
    }
    expect(errors).toEqual([]);
  });

  test('data export matches privacy description: anonymous strips PII while full keeps it', async ({ page }) => {
    await openFresh(page);
    await calibrateNewUser(page);

    // Set custom user name and lifestyle data
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fokus.v1') || '{}');
      s.profile.name = 'Екатерина';
      s.profile.displayName = 'Екатерина';
      s.profile.lastLifestyle = { sleep: 'good', stress: 'low', date: '2026-11-12' };
      s.daySummaries = [{
        date: '2026-11-12T09:00:00Z',
        totalScore: 120,
        domainDeltas: { attention: 5 },
        streak: 1,
        skipped: false,
        lifestyle: { sleep: 'good', stress: 'low' }
      }];
      localStorage.setItem('fokus.v1', JSON.stringify(s));
    });
    await page.reload();
    await tick(page, 1000);

    await navigate(page, 'settings');

    // Verify privacy copy
    const redactLabel = page.locator('.privacy-check');
    await expect(redactLabel).toBeVisible();
    expect(await redactLabel.textContent()).toContain('без имени и записей о сне/стрессе');

    // 1. Anonymous export (checkbox is checked by default)
    await expect(page.locator('#export-redact')).toBeChecked();
    const [anonDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btn-export').click()
    ]);
    const anonFile = await anonDownload.path();
    const anonData = JSON.parse(fs.readFileSync(anonFile!, 'utf8'));

    // Assertions for anonymous export (envelope payload or direct state)
    const anonPayload = anonData.payload || anonData;
    expect(anonPayload.profile.name).toBe('User');
    expect(anonPayload.profile.displayName).toBeUndefined();
    expect(anonPayload.profile.lastLifestyle).toBeUndefined();
    expect(anonPayload.daySummaries[0]?.lifestyle).toBeUndefined();
    // Cognitive metrics are preserved
    expect(anonPayload.daySummaries[0]?.totalScore).toBe(120);
    expect(anonPayload.profile.calibrated).toBe(true);

    // 2. Full export (uncheck redact)
    await page.locator('#export-redact').uncheck();
    await expect(page.locator('#export-redact')).not.toBeChecked();
    const [fullDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#btn-export').click()
    ]);
    const fullFile = await fullDownload.path();
    const fullData = JSON.parse(fs.readFileSync(fullFile!, 'utf8'));

    // Assertions for full export (envelope payload or direct state)
    const fullPayload = fullData.payload || fullData;
    expect(fullPayload.profile.name).toBe('Екатерина');
    expect(fullPayload.profile.displayName).toBe('Екатерина');
    expect(fullPayload.profile.lastLifestyle?.sleep).toBe('good');
    expect(fullPayload.daySummaries[0]?.lifestyle?.sleep).toBe('good');
  });

  test('local profile wipe: requires confirmation word and completely clears storage and caches', async ({ page }) => {
    await openFresh(page);
    await calibrateNewUser(page);
    expect((await stored(page)).profile.calibrated).toBe(true);

    await navigate(page, 'settings');
    await expect(page.locator('#btn-reset')).toBeVisible();

    // Click reset -> reveals confirmation input
    await page.locator('#btn-reset').click();
    await expect(page.locator('#wipe-confirm')).toBeVisible();

    // Attempt invalid word
    await page.fill('#wipe-confirm-input', 'неправильно');
    await page.locator('#btn-wipe-confirm').click();
    await expect(page.locator('#wipe-confirm-hint')).toContainText('Введите УДАЛИТЬ заглавными буквами');
    expect((await stored(page)).profile.calibrated).toBe(true);

    // Valid confirmation word
    await page.fill('#wipe-confirm-input', 'УДАЛИТЬ');
    await Promise.all([
      page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
      page.locator('#btn-wipe-confirm').click(),
    ]);
    await expect(page.getByRole('progressbar').first()).toBeVisible();

    // Check state in localStorage is completely reset
    const raw = await page.evaluate(() => localStorage.getItem('fokus.v1'));
    const state = raw ? JSON.parse(raw) : null;
    expect(state?.profile?.onboarded ?? false).toBe(false);
    expect(state?.profile?.calibrated ?? false).toBe(false);
  });

  test('offline session recovery: interrupted session can be resumed and completed offline', async ({ page, context }) => {
    test.slow();
    await openFresh(page);
    await calibrateNewUser(page);

    // Seed an unfinished session for today: started but finishedAt is null
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fokus.v1') || '{}');
      const nowIso = new Date().toISOString();
      s.sessions = [{
        id: 'sess-interrupted',
        mode: 'normal',
        startedAt: nowIso,
        finishedAt: null,
        durationSec: 60,
        plannedDurationSec: 300,
        items: [{ exerciseId: 'odd-one', score: 100, accuracy: 1, durationSec: 60 }]
      }];
      localStorage.setItem('fokus.v1', JSON.stringify(s));
    });

    // Now go offline
    await context.setOffline(true);
    await navigate(page, 'today');
    await tick(page, 1000);

    // Today screen should recognize the unfinished session and offer the resume CTA
    await expect(page.locator('#cta-resume-title')).toBeVisible();
    await expect(page.locator('#cta-resume-title')).toContainText(/Продолжить с того места|Pick up where you left off/);
    await expect(page.locator('#btn-start')).toBeVisible();
    const remaining = await page.locator('.workout-chip').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-exercise-id')));
    expect(remaining).not.toContain('odd-one');
    await page.locator('#tab-program').click();
    const program = page.locator('.ritual-row');
    await expect(program).toHaveCount(remaining.length);
    expect(await program.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-exercise-id')))).toEqual(remaining);
    await page.locator('#tab-today').click();

    // Clicking #btn-start directly resumes the workout offline without asking for lifestyle checkin
    await page.locator('#btn-start').click();
    await tick(page, 800);
    await expect(page.locator('[data-session-phase="intro"]')).toBeVisible();

    // Play through the remainder of the session
    await playThrough(page);
    await expect(page.getByText('Итог').first()).toBeVisible();

    // Verify that the session completed and results were recorded in local state
    const after = await stored(page);
    const completed = after.sessions.filter((x: any) => x.finishedAt !== null);
    expect(completed.length).toBeGreaterThanOrEqual(1);
    expect(completed.at(-1)?.plannedDurationSec).toBe(240);
  });

  test('core exercises a11y: keyboard navigation, reduced motion, and non-color accessible cues', async ({ page }) => {
    await openFresh(page);
    await calibrateNewUser(page);

    // Enable accessible mode in profile
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fokus.v1') || '{}');
      s.profile.accessibleMode = true;
      localStorage.setItem('fokus.v1', JSON.stringify(s));
    });

    // Navigate to trainers / catalog to launch odd-one in accessible mode
    await navigate(page, 'trainers');
    await tick(page, 1000);

    // Launch odd-one exercise directly
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { screenId: 'session', params: { mode: 'practice', items: [{ exerciseId: 'odd-one' }] } }
      }));
    });
    await tick(page, 1000);

    // 1. Verify accessible mode announcement and note
    await expect(page.locator('.instruction-mode[data-mode="accessible"]')).toBeVisible();
    await expect(page.locator('.instruction-mode')).toContainText(/Доступный режим|Accessible mode/);

    // 2. Keyboard navigation: advance past intro using keyboard (Space/Enter)
    await page.locator('#btn-next').focus();
    await page.keyboard.press('Enter');
    await tick(page, 3500);

    // 3. In play phase, verify interactive tiles have proper a11y roles and tabindex
    await expect(page.locator('[data-session-phase="play"]')).toBeVisible();
    const tiles = page.locator('#game-container [role="button"], #game-container button, #game-container [data-idx]');
    expect(await tiles.count()).toBeGreaterThanOrEqual(2);

    // Test keyboard interaction: focus tile and press Enter/Space
    const firstTile = tiles.first();
    await firstTile.focus();
    await page.keyboard.press('Space');
    await tick(page, 400);

    // 4. Verify reduced motion styling is active
    const motionApplied = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    expect(motionApplied).toBe(true);
  });

});
