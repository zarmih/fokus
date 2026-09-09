import { expect, test } from 'vitest';
import { generateServiceWorker } from '../scripts/generate-sw';

test('service worker precaches hashed assets and keeps a shell fallback', () => {
  const sw = generateServiceWorker(['index.html', 'assets/index-abc.js', 'art/logo-fokus.svg'], 'deadbeef12');
  expect(sw).toContain('fokus-deadbeef12');
  expect(sw).toContain('index.html');
  expect(sw).toContain('assets/index-abc.js');
  expect(sw).toContain("req.mode === 'navigate'");
  expect(sw).toContain('skipWaiting');
  expect(sw).toContain('clients.claim');
});
