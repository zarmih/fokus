/* Overwritten on production build by vite-plugin fokus-sw, but logic appended if supported. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('sync', (event) => {
  if (event.tag === 'fokus-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_NOW' });
        }
      })
    );
  }
});
