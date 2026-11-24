import { chromium, expect, test } from '@playwright/test';

test('Chromium installs and launches Fokus as a standalone app with its local profile', async ({ baseURL }) => {
  if (!baseURL) throw new Error('Missing Playwright baseURL');
  // Browser installation is unavailable in the default incognito test context.
  const context = await chromium.launchPersistentContext('', { channel: 'chromium', locale: 'ru-RU' });
  const page = context.pages()[0];
  const cdp = await context.newCDPSession(page);
  let installedId: string | undefined;
  try {
    await page.goto(baseURL);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
    const { manifest } = await cdp.send('Page.getAppManifest');
    expect(manifest).toMatchObject({ scope: baseURL, startUrl: baseURL });
    const manifestId = manifest!.id;

    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('fokus.v1')!);
      Object.assign(state.profile, { onboarded: true, calibrated: true, name: 'Тест установки' });
      localStorage.setItem('fokus.v1', JSON.stringify(state));
    });

    await cdp.send('PWA.install', { manifestId, installUrlOrBundleUrl: baseURL });
    installedId = manifestId;
    await cdp.send('PWA.changeAppUserSettings', { manifestId, displayMode: 'standalone' });
    const [app] = await Promise.all([context.waitForEvent('page'), cdp.send('PWA.launch', { manifestId })]);
    await expect(app).toHaveURL(baseURL);
    await expect(app.locator('#btn-start')).toBeVisible();
    expect(await app.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true);
    const profile = await app.evaluate(() => JSON.parse(localStorage.getItem('fokus.v1')!).profile);
    expect(profile).toMatchObject({ name: 'Тест установки', calibrated: true });
  } finally {
    if (installedId) await cdp.send('PWA.uninstall', { manifestId: installedId }).catch(() => {});
    await context.close();
  }
});
