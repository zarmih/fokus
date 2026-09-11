/** Shell + core assets only. Exercise chunks and per-game icons are runtime-cached. */
export function shouldPrecache(relPath: string): boolean {
  if (relPath.endsWith('.map')) return false;
  if (relPath.startsWith('assets/ex-')) return false;
  if (relPath.startsWith('art/icon-')) return false;
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
        const shell = await caches.match(toUrl('index.html'));
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(toUrl('index.html'))) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
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
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(self.registration.scope);
    })
  );
});
`;
}
