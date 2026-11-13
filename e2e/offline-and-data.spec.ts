import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { calibrateNewUser, navigate, onboard, openFresh, playThrough, stored, tick } from './helpers';

test.describe('service worker', () => {
  test('after one online visit the app opens offline and can run the first calibration', async ({ page, context }) => {
    const errors = await openFresh(page, { clock: false });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const keys = await page.evaluate(() => caches.keys());
    expect(keys.some((k) => k.startsWith('fokus-'))).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('#app *');
    await onboard(page);
    // The calibration's first probe must load from the offline package.
    await expect(page.locator('[data-session-phase]')).toBeVisible();
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(r.url()));
    await page.locator('#btn-next').click();
    await expect(page.locator('[data-session-phase="play"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#game-container button, #game-container canvas, #game-container [data-idx], #game-container .grid-cell').first()).toBeAttached();
    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('a new deployment is offered as an update, not forced mid-use', async ({ page }) => {
    await openFresh(page, { clock: false });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    // Simulate a deploy: the preview server serves dist/ as-is, so a changed sw.js is a new version.
    const swPath = path.join(process.cwd(), 'dist', 'sw.js');
    const original = fs.readFileSync(swPath, 'utf8');
    try {
      fs.writeFileSync(swPath, original.replace(/const CACHE = "fokus-[^"]+"/, 'const CACHE = "fokus-e2e-next"'));
      await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg?.update(); });
      await expect(page.locator('#btn-pwa-update')).toBeVisible({ timeout: 20_000 });
      // Nothing reloaded under the user: the current screen is still there until they accept.
      await expect(page.locator('#app *').first()).toBeVisible();
      await page.locator('#btn-pwa-update').click();
      await page.waitForFunction(() => caches.keys().then((k) => k.includes('fokus-e2e-next')));
    } finally {
      fs.writeFileSync(swPath, original);
    }
  });
});

test('export → wipe → import restores profile and history', async ({ page }) => {
  await openFresh(page);
  await calibrateNewUser(page);
  const before = await stored(page);
  await navigate(page, 'settings');
  await page.locator('#export-redact').uncheck();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btn-export').click()]);
  const file = await download.path();
  const exported = JSON.parse(fs.readFileSync(file!, 'utf8'));
  expect(JSON.stringify(exported)).toContain(before.profile.name);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await tick(page, 1500);
  expect((await stored(page)).profile?.calibrated ?? false).toBe(false);

  await navigate(page, 'settings');
  page.on('dialog', (d) => d.accept());
  await page.setInputFiles('#file-input', file!);
  await tick(page, 500);
  await page.locator('#btn-import-replace').click();
  await page.waitForLoadState('load');
  await tick(page, 1500);
  const after = await stored(page);
  expect(after.profile.name).toBe(before.profile.name);
  expect(after.profile.calibrated).toBe(true);
  expect(after.exerciseStates.length).toBe(before.exerciseStates.length);
  expect(after.abilityModel?.spacing?.length).toBe(before.abilityModel?.spacing?.length);
  expect(after.meta?.schemaVersion ?? after.meta?.version).toBeDefined();
});
