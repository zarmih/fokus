export let deferredPrompt: any = null;
type Listener = () => void;
const listeners: Listener[] = [];

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach(l => l());
  });
}

export function onInstallPrompt(cb: Listener) {
  if (deferredPrompt) cb();
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
