import { expect, test } from 'vitest';
import { CALIBRATION_PROBE_IDS, generateServiceWorker, OFFLINE_EXERCISE_IDS, shouldPrecache } from '../scripts/generate-sw';
import { PREFERRED_PROBE } from '../src/core/calibration';
import { CORE_EXERCISE_IDS } from '../src/core/core-catalog';

test('offline package = core program + every calibration probe + shared lib; the rest is runtime-cached', () => {
  expect(shouldPrecache('index.html')).toBe(true);
  expect(shouldPrecache('assets/index-abc.js')).toBe(true);
  for (const id of [...CORE_EXERCISE_IDS, ...Object.values(PREFERRED_PROBE).flat()]) {
    expect(shouldPrecache(`assets/ex-${id}-Ab1_x-9Z.js`)).toBe(true);
  }
  expect(shouldPrecache('assets/ex-lib-Dw7QAp-2.js')).toBe(true);
  expect(shouldPrecache('assets/ex-mental-rotation-Ab1_x-9Z.js')).toBe(false);
  // 'sequence' is core, 'sequence-reverse' is not: names must not match by prefix.
  expect(shouldPrecache('assets/ex-sequence-reverse-Ab1_x-9Z.js')).toBe(false);
  expect(shouldPrecache('art/icon-stroop.svg')).toBe(true);
  expect(shouldPrecache('art/icon-domain-memory.svg')).toBe(true);
  expect(shouldPrecache('art/icon-mental-rotation.svg')).toBe(false);
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

test('calibration probe list in the SW stays in sync with calibration.ts', () => {
  expect([...CALIBRATION_PROBE_IDS].sort()).toEqual([...new Set(Object.values(PREFERRED_PROBE).flat())].sort());
  expect(OFFLINE_EXERCISE_IDS.size).toBeGreaterThanOrEqual(15);
});

test('cache lookups ignore Vary so content-hashed files are found offline on any host', () => {
  const sw = generateServiceWorker(['index.html'], 'vary01');
  expect(sw.match(/caches\.match\(/g)!.length).toBe(sw.match(/ignoreVary: true/g)!.length);
});
