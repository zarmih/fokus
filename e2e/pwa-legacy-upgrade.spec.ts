import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('the previous reload-only update button opens the new Fokus shell offline with progress intact', async ({ page, context }) => {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  const swPath = path.join(process.cwd(), 'dist', 'sw.js');
  const index = fs.readFileSync(indexPath, 'utf8');
  const sw = fs.readFileSync(swPath, 'utf8');
  const legacyCache = 'fokus-legacy-upgrade-fixture';

  try {
    fs.writeFileSync(indexPath, `<!doctype html><button id="legacy-update" hidden>Обновить</button>
<script>
  const update = document.getElementById('legacy-update');
  update.onclick = () => location.reload();
  navigator.serviceWorker.register('./sw.js').then(registration => {
    registration.addEventListener('updatefound', () => {
      registration.installing.addEventListener('statechange', event => {
        if (event.target.state === 'installed' && navigator.serviceWorker.controller) update.hidden = false;
      });
    });
  });
</script>`);
    fs.writeFileSync(swPath, `
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open('${legacyCache}');
  await cache.add(new URL('./', self.registration.scope));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
`);
    await page.goto('./');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const before = await page.evaluate(() => {
      const now = new Date().toISOString();
      const state = {
        meta: { schemaVersion: 6, rev: 1, updatedAt: now },
        profile: { name: 'Fokus Legacy', onboarded: true, calibrated: true, sessionLengthSec: 300 },
        sessions: [{ id: 'legacy-session', mode: 'normal', startedAt: now, finishedAt: now, durationSec: 300, items: [] }],
        daySummaries: [{ date: now, totalScore: 70, domainDeltas: {}, streak: 1, skipped: false }]
      };
      localStorage.setItem('fokus.v1', JSON.stringify(state));
      return state;
    });

    fs.writeFileSync(indexPath, index);
    fs.writeFileSync(swPath, sw);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.locator('#legacy-update')).toBeVisible();
    await page.waitForFunction(async (oldCache) => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active?.state === 'activated' && !(await caches.has(oldCache));
    }, legacyCache);
    await context.setOffline(true);
    await Promise.all([page.waitForEvent('load'), page.locator('#legacy-update').click()]);
    await expect(page.locator('#cta-offline-title')).toHaveText('Нет подключения');
    await page.locator('#tab-program').click();
    await expect(page.locator('.ritual-row').first()).toBeVisible();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fokus.v1')!));
    expect(after.profile).toMatchObject(before.profile);
    expect(after.sessions).toEqual(before.sessions);
    expect(after.daySummaries).toEqual(before.daySummaries);
  } finally {
    fs.writeFileSync(indexPath, index);
    fs.writeFileSync(swPath, sw);
  }
});
