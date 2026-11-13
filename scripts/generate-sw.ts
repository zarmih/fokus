import { CORE_EXERCISE_IDS } from '../src/core/core-catalog';

/**
 * Exercises that must work offline right after the first visit: the 14-day core program plus every
 * calibration probe (src/core/calibration.ts PREFERRED_PROBE — a unit test keeps the lists in sync).
 * The rest of the catalog is runtime-cached the first time it is played online.
 */
export const CALIBRATION_PROBE_IDS = [
  'grid-memory', 'corsi', 'n-back', 'dot-span', 'odd-one', 'posner', 'go-no-go', 'schulte',
  'pattern-next', 'pulley', 'reaction-strike', 'math-sprint', 'stroop', 'switch-rule'
] as const;
export const OFFLINE_EXERCISE_IDS: ReadonlySet<string> = new Set([...CORE_EXERCISE_IDS, ...CALIBRATION_PROBE_IDS]);

const EX_CHUNK = /^assets\/ex-(.+)-[A-Za-z0-9_-]{8}\.js$/;
const EX_ICON = /^art\/icon-(.+)\.svg$/;

/** Shell, core + calibration exercises and the shared exercise lib. Other exercise chunks/icons are runtime-cached. */
export function shouldPrecache(relPath: string): boolean {
  if (relPath.endsWith('.map')) return false;
  const chunk = relPath.match(EX_CHUNK);
  if (chunk) return chunk[1] === 'lib' || OFFLINE_EXERCISE_IDS.has(chunk[1]);
  if (relPath.startsWith('assets/ex-')) return false;
  const icon = relPath.match(EX_ICON);
  if (icon) return icon[1].startsWith('domain-') || OFFLINE_EXERCISE_IDS.has(icon[1]);
  if (relPath.startsWith('art/tiles/')) return false;
  if (relPath === 'art/screenshot.jpg') return false;
  return true;
}

export function generateServiceWorker(assets: string[], version: string): string {
  const list = JSON.stringify(assets);
  return `/* Fokus precache ${version} */
const CACHE = ${JSON.stringify('fokus-' + version)};
const ASSETS = ${list};

function toUrl(path) {
  return new URL(path, self.registration.scope).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(toUrl));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k.startsWith('fokus-')).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        const shell = await caches.match(toUrl('index.html'), { ignoreVary: true });
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req, { ignoreVary: true })) || (await caches.match(toUrl('index.html'), { ignoreVary: true })) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreVary: true });
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const soft = event.notification && event.notification.tag === 'fokus-soft-return';
  // soft-return open path: scope + ?return=soft (see softReturnOpenUrl)
  const target = soft
    ? self.registration.scope.replace(/\\/?$/, '/') + '?return=soft'
    : self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          try { client.postMessage({ type: 'fokus-reminder', softReturn: !!soft }); } catch (_) {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
`;
}
