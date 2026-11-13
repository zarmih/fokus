import { expect, test } from '@playwright/test';
import { navigate, onboard, openFresh, stored, tick } from './helpers';

test.use({ timezoneId: 'America/New_York' });

test('a new user abroad gets the device zone; Settings shows it and can switch without re-dating', async ({ page }) => {
  await openFresh(page); // 09:00 MSK = 01:00 in New York, same date
  await onboard(page);
  const s = await stored(page);
  expect(s.profile.timeZones).toEqual([{ zone: 'America/New_York', fromMs: 0 }]);
  await navigate(page, 'settings');
  await expect(page.locator('#tz-select')).toHaveValue('America/New_York');
  await expect(page.locator('#btn-tz-device')).toHaveCount(0);
  await page.locator('#tz-select').selectOption('Europe/Moscow');
  await tick(page, 300);
  const after = await stored(page);
  expect(after.profile.timeZones.length).toBe(2);
  expect(after.profile.timeZones[0]).toEqual({ zone: 'America/New_York', fromMs: 0 });
  expect(after.profile.timeZones[1].zone).toBe('Europe/Moscow');
  await expect(page.locator('#tz-status')).toContainText('Прошлые дни не пересчитаны');
});
