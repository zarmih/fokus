import { expect, test, beforeEach } from 'vitest';
import { OFFLINE_BANNER_COPY, renderOfflineBanner } from '../src/ui/components/offline-banner';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
  setOnline(true);
});

test('renderOfflineBanner shows banner when offline and hides when online', () => {
  renderOfflineBanner(document.body);
  const banner = document.body.querySelector('.offline-trust-banner') as HTMLElement;
  expect(banner).toBeTruthy();
  expect(banner.hidden).toBe(true);

  setOnline(false);
  window.dispatchEvent(new Event('offline'));
  expect(banner.hidden).toBe(false);

  setOnline(true);
  window.dispatchEvent(new Event('online'));
  expect(banner.hidden).toBe(true);
});

test('offline banner is a polite status live region with clear Russian copy', () => {
  setOnline(false);
  renderOfflineBanner(document.body);
  const banner = document.body.querySelector('.offline-trust-banner') as HTMLElement;

  expect(banner.getAttribute('role')).toBe('status');
  expect(banner.getAttribute('aria-live')).toBe('polite');
  expect(banner.getAttribute('aria-atomic')).toBe('true');
  expect(banner.hidden).toBe(false);
  expect(banner.textContent).toContain(OFFLINE_BANNER_COPY);
  expect(banner.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  expect(banner.querySelector('svg')?.getAttribute('focusable')).toBe('false');
});

test('banner has no focusables and does not steal focus on show/hide', () => {
  const btn = document.createElement('button');
  btn.id = 'keep-focus';
  btn.textContent = 'Stay';
  document.body.appendChild(btn);
  btn.focus();
  expect(document.activeElement).toBe(btn);

  renderOfflineBanner(document.body);
  const banner = document.body.querySelector('.offline-trust-banner') as HTMLElement;

  const focusableInBanner = banner.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  expect(focusableInBanner.length).toBe(0);
  expect(banner.tabIndex).toBeLessThan(0); // default -1 / not in tab order as non-focusable div

  setOnline(false);
  window.dispatchEvent(new Event('offline'));
  expect(banner.hidden).toBe(false);
  expect(document.activeElement).toBe(btn);

  setOnline(true);
  window.dispatchEvent(new Event('online'));
  expect(banner.hidden).toBe(true);
  expect(document.activeElement).toBe(btn);
});

test('skip-link stays usable when offline banner is present', () => {
  setOnline(false);
  document.body.innerHTML = `
    <div id="app">
      <a class="skip-link" href="#main-content">К содержимому</a>
      <main id="main-content" tabindex="-1"></main>
    </div>
  `;
  renderOfflineBanner(document.body);

  const banner = document.body.querySelector('.offline-trust-banner') as HTMLElement;
  const skip = document.body.querySelector('.skip-link') as HTMLAnchorElement;
  expect(banner.hidden).toBe(false);
  expect(skip).toBeTruthy();

  // Banner must not sit above the skip-link stacking context.
  expect(Number.parseInt(banner.style.zIndex || '0', 10)).toBeLessThan(9999);

  skip.focus();
  expect(document.activeElement).toBe(skip);
  expect(skip.getAttribute('href')).toBe('#main-content');
  // Skip is still the first focusable in #app; banner adds none before it in tab order.
  expect(banner.querySelector('a, button, [href], [tabindex]:not([tabindex="-1"])')).toBeNull();
});
