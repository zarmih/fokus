import { expect, test, beforeEach, afterEach, vi } from 'vitest';
import {
  PWA_UPDATE_ACTION,
  PWA_UPDATE_DESC,
  PWA_UPDATE_DISMISS,
  PWA_UPDATE_TITLE,
  resetPwaUpdateBannerForTests,
  showPwaUpdateBanner
} from '../src/ui/components/pwa-update-banner';

beforeEach(() => {
  document.body.innerHTML = '';
  resetPwaUpdateBannerForTests();
});

afterEach(() => {
  resetPwaUpdateBannerForTests();
});

async function flushFocus() {
  await Promise.resolve();
  await Promise.resolve();
}

test('showPwaUpdateBanner renders Russian copy and labelled actions', async () => {
  const app = document.createElement('div');
  app.id = 'app';
  document.body.appendChild(app);

  const banner = showPwaUpdateBanner(app, { onUpdate: () => {} })!;
  await flushFocus();

  expect(banner.classList.contains('pwa-update-banner')).toBe(true);
  expect(banner.textContent).toContain(PWA_UPDATE_TITLE);
  expect(banner.textContent).toContain(PWA_UPDATE_DESC);

  const update = banner.querySelector('#btn-pwa-update') as HTMLButtonElement;
  const dismiss = banner.querySelector('#btn-pwa-dismiss') as HTMLButtonElement;
  expect(update.getAttribute('aria-label')).toBe(PWA_UPDATE_ACTION);
  expect(dismiss.getAttribute('aria-label')).toBe(PWA_UPDATE_DISMISS);
  expect(update.textContent).toBe(PWA_UPDATE_ACTION);
  expect(dismiss.textContent).toBe(PWA_UPDATE_DISMISS);
});

test('banner is a non-modal alertdialog with live region and labelled-by links', async () => {
  const app = document.createElement('div');
  document.body.appendChild(app);

  const banner = showPwaUpdateBanner(app, { onUpdate: () => {} })!;
  await flushFocus();

  expect(banner.getAttribute('role')).toBe('alertdialog');
  expect(banner.getAttribute('aria-modal')).toBe('false');
  expect(banner.getAttribute('aria-live')).toBe('polite');
  expect(banner.getAttribute('aria-atomic')).toBe('true');
  expect(banner.getAttribute('aria-labelledby')).toBe('pwa-update-title');
  expect(banner.getAttribute('aria-describedby')).toBe('pwa-update-desc');
  expect(banner.querySelector('#pwa-update-title')?.textContent).toBe(PWA_UPDATE_TITLE);
  expect(banner.querySelector('#pwa-update-desc')?.textContent).toBe(PWA_UPDATE_DESC);
});

test('focus moves to update button on show and restores on dismiss', async () => {
  const keep = document.createElement('button');
  keep.id = 'keep-focus';
  keep.textContent = 'Stay';
  document.body.appendChild(keep);
  keep.focus();
  expect(document.activeElement).toBe(keep);

  const app = document.createElement('div');
  document.body.appendChild(app);

  const banner = showPwaUpdateBanner(app, { onUpdate: () => {} })!;
  await flushFocus();

  const update = banner.querySelector('#btn-pwa-update') as HTMLButtonElement;
  expect(document.activeElement).toBe(update);

  (banner.querySelector('#btn-pwa-dismiss') as HTMLButtonElement).click();
  expect(document.body.querySelector('.pwa-update-banner')).toBeNull();
  expect(document.activeElement).toBe(keep);
});

test('Escape dismisses the banner and restores focus', async () => {
  const keep = document.createElement('button');
  keep.textContent = 'Stay';
  document.body.appendChild(keep);
  keep.focus();

  const app = document.createElement('div');
  document.body.appendChild(app);
  const banner = showPwaUpdateBanner(app, { onUpdate: () => {} })!;
  await flushFocus();

  banner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.body.querySelector('.pwa-update-banner')).toBeNull();
  expect(document.activeElement).toBe(keep);
});

test('skip-link stays usable: no focus trap, banner under skip-link z-index', async () => {
  document.body.innerHTML = `
    <div id="app">
      <a class="skip-link" href="#main-content">К содержимому</a>
      <main id="main-content" tabindex="-1"></main>
    </div>
  `;
  const app = document.getElementById('app')!;
  const skip = app.querySelector('.skip-link') as HTMLAnchorElement;
  skip.focus();
  expect(document.activeElement).toBe(skip);

  const banner = showPwaUpdateBanner(app, { onUpdate: () => {} })!;
  await flushFocus();

  // Banner sits below skip-link stacking (skip-link is 9999 in app CSS).
  expect(Number.parseInt(banner.style.zIndex || '0', 10)).toBeLessThan(9999);

  // Non-modal: focus can leave the banner — skip-link remains focusable.
  skip.focus();
  expect(document.activeElement).toBe(skip);
  expect(skip.getAttribute('href')).toBe('#main-content');
  expect(banner.getAttribute('aria-modal')).toBe('false');
});

test('second show is a no-op while banner is open', async () => {
  const app = document.createElement('div');
  document.body.appendChild(app);
  const first = showPwaUpdateBanner(app, { onUpdate: () => {} })!;
  const second = showPwaUpdateBanner(app, { onUpdate: () => {} });
  expect(second).toBe(first);
  expect(app.querySelectorAll('.pwa-update-banner').length).toBe(1);
});

test('update action invokes onUpdate callback', async () => {
  const app = document.createElement('div');
  document.body.appendChild(app);
  const onUpdate = vi.fn();
  const banner = showPwaUpdateBanner(app, { onUpdate })!;
  await flushFocus();
  (banner.querySelector('#btn-pwa-update') as HTMLButtonElement).click();
  expect(onUpdate).toHaveBeenCalledTimes(1);
});
