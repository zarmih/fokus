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

test('service worker notificationclick opens soft-return query', () => {
  const sw = generateServiceWorker(['index.html'], 'softpath01');
  expect(sw).toContain("fokus-soft-return");
  expect(sw).toContain("?return=soft");
  expect(sw).toContain('notificationclick');
});

test('service worker regex syntax is valid', () => {
  const sw = generateServiceWorker(['index.html'], 'syntax01');
  expect(() => new Function(sw)).not.toThrow();
  expect(sw).not.toContain('PRECACHE_URLS');
  expect(sw).not.toContain('fokus-cache-v2');
  expect(sw).toContain('?return=soft');
  expect(sw).toContain("replace(/\\/?$/, '/')");
});
