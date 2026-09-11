import { expect, test } from 'vitest';
import { generateServiceWorker, shouldPrecache } from '../scripts/generate-sw';

test('precache skips exercise chunks and per-game art', () => {
  expect(shouldPrecache('index.html')).toBe(true);
  expect(shouldPrecache('assets/index-abc.js')).toBe(true);
  expect(shouldPrecache('assets/ex-stroop-abc.js')).toBe(false);
  expect(shouldPrecache('art/icon-stroop.svg')).toBe(false);
  expect(shouldPrecache('art/tiles/star.svg')).toBe(false);
  expect(shouldPrecache('art/screenshot.jpg')).toBe(false);
  expect(shouldPrecache('art/logo-fokus.svg')).toBe(true);
});

test('service worker precaches hashed assets and keeps a shell fallback', () => {
  const sw = generateServiceWorker(['index.html', 'assets/index-abc.js', 'art/logo-fokus.svg'], 'deadbeef12');
  expect(sw).toContain('fokus-deadbeef12');
  expect(sw).toContain('index.html');
  expect(sw).toContain('assets/index-abc.js');
  expect(sw).toContain("req.mode === 'navigate'");
  expect(sw).toContain('skipWaiting');
  expect(sw).toContain('clients.claim');
});
