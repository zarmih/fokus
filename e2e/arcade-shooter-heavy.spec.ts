import { expect, test } from '@playwright/test';
import { START, tick, Errors } from './helpers';

/**
 * Heavy E2E test for Arcade Shooter exercise.
 * Validates full passage from intro through play to result screen.
 */
test.describe('Arcade Shooter Heavy E2E', () => {
  test('full pass: renders, plays, completes, and results', async ({ page }) => {
    const errors: Errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/SW reg failed|service ?worker/i.test(m.text())) {
        errors.push(m.text());
      }
    });

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: START });
    await page.goto('./');

    // 1. Navigate directly to arcade-shooter in practice mode with a short budget (15s)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('navigate', {
          detail: {
            screenId: 'session',
            params: {
              mode: 'practice',
              durationSec: 15,
              items: [{ exerciseId: 'arcade-shooter', difficulty: 1 }]
            }
          }
        })
      );
    });

    // 2. Intro phase -> click next
    await page.locator('[data-session-phase="intro"]').waitFor({ state: 'visible' });
    await page.locator('#btn-next').click();

    // 3. Countdown -> enter play phase
    await tick(page, 3500);
    await expect(page.locator('[data-session-phase="play"]')).toBeVisible();

    // 4. Verify canvas rendering: the exercise canvas inside .play-board
    const canvasLocator = page.locator('.play-board canvas').first();
    await expect(canvasLocator).toBeAttached();
    await expect(canvasLocator).toBeVisible();

    // 5. Emulate pointer interaction
    const box = await canvasLocator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
    }

    // 6. Fast forward clock: trial round (15s) if present + play round (15s)
    // Keep ticking until results or advance buttons are found
    for (let step = 0; step < 40; step++) {
      if (await page.locator('#result-hero, .result-summary').count()) break;
      const nextBtn = page.locator('#btn-next');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }
      await tick(page, 1500);
    }

    // 7. Result screen should now be reached
    await expect(page.locator('#result-hero, .result-summary').first()).toBeVisible({ timeout: 5000 });

    // 8. Assert zero console/page errors collected
    expect(errors).toEqual([]);
  });
});
