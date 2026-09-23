export let deferredPrompt: any = null;
const listeners = new Set<(prompt: any) => void>();

export function onInstallPrompt(cb: (prompt: any) => void) {
  listeners.add(cb);
  if (deferredPrompt) cb(deferredPrompt);
  return () => listeners.delete(cb);
}

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((cb) => cb(deferredPrompt));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}
