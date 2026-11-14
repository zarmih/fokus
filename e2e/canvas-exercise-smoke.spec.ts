import { expect, test, type Page, type Locator } from '@playwright/test';
import { START, tick, phase, type Errors } from './helpers';

/**
 * Open a fresh page with error collectors and un-reduced motion
 * so canvas animations and stage particles are rendered.
 */
async function openFreshCanvas(page: Page): Promise<Errors> {
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
  await tick(page, 1500);
  await page.waitForSelector('#app *');
  return errors;
}

/**
 * Pixel sample check: verifies whether any sampled pixel has non-zero alpha and non-zero RGB color.
 */
async function assertCanvasNonBlank(canvasLocator: Locator): Promise<boolean> {
  return canvasLocator.evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const { width, height } = canvas;
    if (width === 0 || height === 0) return false;
    const imgData = ctx.getImageData(0, 0, width, height).data;
    for (let i = 0; i < imgData.length; i += 4) {
      if (imgData[i + 3] > 0 && (imgData[i] > 0 || imgData[i + 1] > 0 || imgData[i + 2] > 0)) {
        return true;
      }
    }
    return false;
  });
}

test.describe('Canvas Exercise Smoke Tests', () => {
  test('candidate core exercises: verify which render a <canvas> element into DOM', async ({ page }) => {
    const errors = await openFreshCanvas(page);

    // Candidates mentioned in prompt:
    // - helix-flip: renders <canvas class="play-fx"> (stage-based)
    // - pulley: renders <canvas class="play-fx"> (stage-based backdrop)
    // - cut-bar: pure DOM, no canvas
    // - tide-gate: pure DOM, no canvas
    // - slip-mark: pure DOM, no canvas
    const candidateAudit = [
      { id: 'helix-flip', hasCanvas: true },
      { id: 'pulley', hasCanvas: true },
      { id: 'cut-bar', hasCanvas: false },
      { id: 'tide-gate', hasCanvas: false },
      { id: 'slip-mark', hasCanvas: false }
    ];

    for (const item of candidateAudit) {
      await page.evaluate((exerciseId) => {
        window.dispatchEvent(new CustomEvent('navigate', {
          detail: { screenId: 'session', params: { mode: 'practice', items: [{ exerciseId }] } }
        }));
      }, item.id);

      const nextBtn = page.locator('#btn-next');
      await nextBtn.waitFor({ state: 'visible' });
      await nextBtn.click();
      await tick(page, 3500);
      expect(await phase(page)).toBe('play');

      const count = await page.locator('#game-container canvas').count();
      if (item.hasCanvas) {
        expect(count, `Expected ${item.id} to render a canvas`).toBeGreaterThan(0);
      } else {
        expect(count, `Expected ${item.id} not to render a canvas`).toBe(0);
      }
    }

    expect(errors).toEqual([]);
  });

  test('helix-flip: trial round renders attached non-blank canvas with zero console errors', async ({ page }) => {
    const errors = await openFreshCanvas(page);

    // 1. Navigate to helix-flip in practice mode
    await page.evaluate((id) => {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { screenId: 'session', params: { mode: 'practice', items: [{ exerciseId: id }] } }
      }));
    }, 'helix-flip');

    // 2. Wait for #btn-next (intro screen), click to enter trial round
    const nextBtn = page.locator('#btn-next');
    await nextBtn.waitFor({ state: 'visible' });
    await nextBtn.click();

    // 3. Advance through the countdown timer to enter play phase
    await tick(page, 3500);
    expect(await phase(page)).toBe('play');

    // 4. Locate <canvas> element, assert present and attached
    const canvasLocator = page.locator('#game-container canvas, canvas.play-fx, canvas').first();
    await expect(canvasLocator).toBeAttached();
    await expect(canvasLocator).toBeVisible();

    // 5. Play trial round: perform interaction
    const choiceBtn = page.locator('#game-container #btn-yes, #game-container #btn-no').first();
    await choiceBtn.waitFor({ state: 'visible' });
    await page.evaluate(() => {
      const btn = (document.querySelector('#btn-yes') || document.querySelector('#btn-no')) as HTMLElement;
      btn?.click();
    });

    // 6. Let animation/ticks run
    await tick(page, 50);

    // 7. Assert canvas is non-blank via pixel sample
    const isNonBlank = await assertCanvasNonBlank(canvasLocator);
    expect(isNonBlank).toBe(true);

    // 8. Assert zero console/page errors collected
    expect(errors).toEqual([]);
  });

  test('switch-rule: trial round renders attached non-blank canvas with zero console errors', async ({ page }) => {
    const errors = await openFreshCanvas(page);

    // 1. Navigate to switch-rule in practice mode
    await page.evaluate((id) => {
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { screenId: 'session', params: { mode: 'practice', items: [{ exerciseId: id }] } }
      }));
    }, 'switch-rule');

    // 2. Wait for #btn-next (intro screen), click to enter trial round
    const nextBtn = page.locator('#btn-next');
    await nextBtn.waitFor({ state: 'visible' });
    await nextBtn.click();

    // 3. Advance countdown into play phase
    await tick(page, 3500);
    expect(await phase(page)).toBe('play');

    // 4. Locate <canvas> element, assert present and attached
    const canvasLocator = page.locator('#game-container canvas, canvas.play-fx, canvas').first();
    await expect(canvasLocator).toBeAttached();
    await expect(canvasLocator).toBeVisible();

    // 5. Play trial round: perform interaction
    const choiceBtn = page.locator('#game-container .sr-btn').first();
    await choiceBtn.waitFor({ state: 'visible' });
    await page.evaluate(() => {
      const btn = document.querySelector('#game-container .sr-btn') as HTMLElement;
      btn?.click();
    });

    // 6. Let animation/ticks run
    await tick(page, 50);

    // 7. Assert canvas is non-blank via pixel sample
    const isNonBlank = await assertCanvasNonBlank(canvasLocator);
    expect(isNonBlank).toBe(true);

    // 8. Assert zero console/page errors collected
    expect(errors).toEqual([]);
  });
});
