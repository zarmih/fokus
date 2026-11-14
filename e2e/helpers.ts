import { expect, type Page } from '@playwright/test';

export const START = new Date('2026-11-12T09:00:00+03:00');

export type Errors = string[];

/** Fresh app at a fixed Moscow morning; collects page errors (SW registration noise excluded). */
export async function openFresh(page: Page, opts: { clock?: boolean } = {}): Promise<Errors> {
  const errors: Errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/SW reg failed|service ?worker/i.test(m.text())) errors.push(m.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (opts.clock !== false) await page.clock.install({ time: START });
  await page.goto('./');
  await tick(page, 1500);
  await page.waitForSelector('#app *');
  return errors;
}

export async function tick(page: Page, ms: number) {
  try {
    await page.clock.runFor(ms);
  } catch {
    await page.waitForTimeout(Math.min(ms, 1000));
  }
}

export async function onboard(page: Page, name = 'Тест') {
  for (let i = 0; i < 4; i++) {
    if (await page.locator('[data-session-phase]').count()) break;
    if (await page.locator('#onboard-name').count()) {
      await page.fill('#onboard-name', name);
      const next = page.locator('#btn-next');
      if (await next.count()) await next.click();
      await tick(page, 500);
      break;
    }
    const next = page.locator('#btn-next');
    if (!(await next.count())) break;
    await next.click();
    await tick(page, 500);
  }
}

export async function phase(page: Page): Promise<string> {
  return page.evaluate(() => document.querySelector('[data-session-phase]')?.getAttribute('data-session-phase') || 'other');
}

/** Plays whatever session is on screen with arbitrary answers until it leaves the session screen. */
export async function playThrough(page: Page, maxSteps = 4000): Promise<void> {
  let other = 0;
  for (let i = 0; i < maxSteps; i++) {
    const ph = await phase(page);
    if (ph === 'intro') {
      await page.locator('#btn-next').click().catch(() => {});
      await tick(page, 3500);
      continue;
    }
    if (ph === 'countdown' || ph === 'feedback') {
      await tick(page, 500);
      continue;
    }
    if (ph === 'other') {
      if (++other > 12) return;
      await tick(page, 500);
      continue;
    }
    other = 0;
    const btns = page.locator('#game-container button:not([disabled]), #game-container [role="button"], #game-container .grid-cell, #game-container [data-idx], #game-container [data-index]');
    const n = await btns.count();
    if (n) await btns.nth(i % n).click({ timeout: 300, force: true }).catch(() => {});
    await tick(page, 400);
    const go = page.locator('#btn-fatigue-go');
    if (await go.count()) await go.click().catch(() => {});
  }
  throw new Error('session did not finish');
}

export async function navigate(page: Page, screenId: string) {
  await page.evaluate((id) => window.dispatchEvent(new CustomEvent('navigate', { detail: { screenId: id } })), screenId);
  await tick(page, 1500);
}

export async function calibrateNewUser(page: Page) {
  await onboard(page);
  await playThrough(page, 3000);
  await tick(page, 1500);
  await navigate(page, 'today');
  await expect(page.locator('#btn-start')).toBeVisible();
}

export async function startToday(page: Page) {
  await page.locator('#btn-start').click();
  await tick(page, 800);
  const skip = page.locator('#btn-ls-skip');
  if (await skip.count()) await skip.click();
  await tick(page, 800);
}

export async function stored(page: Page): Promise<any> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('fokus.v1') || '{}'));
}
