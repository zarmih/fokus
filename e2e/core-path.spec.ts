import { expect, test } from '@playwright/test';
import { calibrateNewUser, navigate, openFresh, phase, playThrough, startToday, stored, tick } from './helpers';

test('first launch → calibration → «Тренировка на сегодня» with a balanced plan in budget', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/fokus/')) outbound.push(r.url()); });
  const errors = await openFresh(page);
  await calibrateNewUser(page);
  await expect(page.locator('#btn-start')).toHaveText(/Тренировка на сегодня/);
  // Privacy: no account, no beacon — every request stays inside the app's own files.
  expect(outbound).toEqual([]);
  const s = await stored(page);
  expect(s.profile.onboarded).toBe(true);
  expect(s.profile.calibrated).toBe(true);
  const why = page.locator('[data-budget-source]').first();
  await expect(why).toContainText(/3 блока ≈ 5 мин/);
  const areas = (await why.textContent())!.match(/области: ([^.]+)\./)![1].split(',').map((x) => x.trim());
  expect(new Set(areas).size).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('training: trial round, scored blocks, short result; progress survives reload', async ({ page }) => {
  const errors = await openFresh(page);
  await calibrateNewUser(page);
  await startToday(page);
  await expect(page.locator('[data-session-phase="intro"]')).toBeVisible();
  await expect(page.locator('[data-trial="1"]')).toBeVisible();
  await playThrough(page);
  await expect(page.getByText('Итог').first()).toBeVisible();
  const before = await stored(page);
  const normal = before.sessions.filter((x: any) => x.mode === 'normal');
  expect(normal.length).toBe(1);
  await page.reload();
  await tick(page, 1500);
  const after = await stored(page);
  expect(after.sessions.length).toBe(before.sessions.length);
  await navigate(page, 'progress');
  await expect(page.locator('body')).not.toContainText('Уверенность');
  expect(errors).toEqual([]);
});

test('leaving the tab mid-block: no result and no time spent while hidden', async ({ page }) => {
  await openFresh(page);
  await calibrateNewUser(page);
  await startToday(page);
  await page.locator('#btn-next').click();
  await tick(page, 3500);
  expect(await phase(page)).toBe('play');
  const timerBefore = await page.locator('#session-timer').textContent();
  const setHidden = (h: boolean) => page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, h);
  await setHidden(true);
  await tick(page, 20_000);
  expect(await page.locator('#session-timer').textContent()).toBe(timerBefore);
  expect((await stored(page)).sessions.filter((x: any) => x.mode === 'normal').length).toBe(0);
  await setHidden(false);
  await tick(page, 500);
  expect(await phase(page)).not.toBe('other');
});

test('coming back after a week: history kept, calm plan offered', async ({ page }) => {
  await openFresh(page);
  await calibrateNewUser(page);
  await startToday(page);
  await playThrough(page);
  const before = await stored(page);
  await page.clock.setSystemTime(new Date('2026-11-19T09:00:00+03:00'));
  await page.reload();
  await tick(page, 1500);
  await navigate(page, 'today');
  await expect(page.locator('#btn-start')).toBeVisible();
  const src = await page.locator('[data-budget-source]').first().getAttribute('data-budget-source');
  expect(src).toBe('soft-return');
  await expect(page.locator('[data-budget-source]').first()).toContainText('мягкое возвращение');
  const after = await stored(page);
  expect(after.sessions.length).toBe(before.sessions.length);
  expect(after.daySummaries.length).toBe(before.daySummaries.length);
});
