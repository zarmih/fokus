import { expect, test, beforeEach } from 'vitest';
import { renderOfflineBanner } from '../src/ui/components/offline-banner';

beforeEach(() => {
  document.body.innerHTML = '';
});

test('renderOfflineBanner shows banner when offline and hides when online', () => {
  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true
  });

  renderOfflineBanner(document.body);
  const banner = document.body.querySelector('.offline-trust-banner') as HTMLElement;
  expect(banner).toBeTruthy();
  expect(banner.style.display).toBe('none');

  // Trigger offline
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    configurable: true
  });
  window.dispatchEvent(new Event('offline'));
  expect(banner.style.display).toBe('block');

  // Trigger online
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true
  });
  window.dispatchEvent(new Event('online'));
  expect(banner.style.display).toBe('none');
});
