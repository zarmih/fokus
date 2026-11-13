import { expect, test, type Page } from '@playwright/test';
import { navigate, openFresh, phase, playThrough, startToday, tick } from './helpers';

test.use({ locale: 'en-US' });

const CYR = /[А-Яа-яЁё]+/g;

/** Cyrillic words visible inside the given regions (the «Русский» language name is allowed). */
async function cyrillicIn(page: Page, selectors: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const sel of selectors) {
    const loc = page.locator(sel);
    for (let i = 0; i < (await loc.count()); i++) {
      if (!(await loc.nth(i).isVisible())) continue;
      const text = await loc.nth(i).innerText();
      for (const w of text.match(CYR) || []) if (w !== 'Русский') found.push(`${sel}: ${w}`);
    }
  }
  return found;
}

test('English device: onboarding, calibration, Today and result have no Russian text', async ({ page }) => {
  const errors = await openFresh(page);
  const seen: string[] = [];
  // Onboarding steps until the calibration session starts.
  for (let i = 0; i < 5; i++) {
    if (await page.locator('[data-session-phase]').count()) break;
    seen.push(...(await cyrillicIn(page, ['#app'])));
    if (await page.locator('#onboard-name').count()) await page.fill('#onboard-name', 'Alex');
    const next = page.locator('#btn-next');
    if (!(await next.count())) break;
    await next.click();
    await tick(page, 500);
  }
  await expect(page.locator('[data-session-phase="intro"]')).toBeVisible();
  seen.push(...(await cyrillicIn(page, ['#app'])));
  await playThrough(page, 3000);
  await tick(page, 1500);
  seen.push(...(await cyrillicIn(page, ['#result-hero', '.result-summary', '.next-action-card', '.probe-summary'])));

  await navigate(page, 'today');
  await expect(page.locator('#btn-start')).toHaveText(/Today's workout/);
  seen.push(...(await cyrillicIn(page, ['.today-head', '.workout-card', 'nav', '#top-sync-indicator'])));

  await startToday(page);
  await expect(page.locator('[data-session-phase="intro"]')).toBeVisible();
  seen.push(...(await cyrillicIn(page, ['#app'])));
  await playThrough(page);
  await tick(page, 1500);
  seen.push(...(await cyrillicIn(page, ['#result-hero', '.result-summary', '.next-action-card'])));
  await expect(page.getByText('Summary').first()).toBeVisible();

  await navigate(page, 'settings');
  const tz = page.locator('[data-tz-current]');
  await expect(tz).toContainText('Time zone');
  seen.push(...(await cyrillicIn(page, ['[data-tz-current]'])));

  expect(seen).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  expect(errors).toEqual([]);
});
