export let deferredPrompt: any = null;
export let isInstalled = false;

const listeners = new Set<(prompt: any, installed: boolean) => void>();

function notify() {
  listeners.forEach((cb) => cb(deferredPrompt, isInstalled));
}

export function onInstallPrompt(cb: (prompt: any, installed: boolean) => void) {
  listeners.add(cb);
  cb(deferredPrompt, isInstalled);
  return () => listeners.delete(cb);
}

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;

  const mq = window.matchMedia('(display-mode: standalone)');
  isInstalled = mq.matches || (navigator as any).standalone;

  mq.addEventListener('change', (e) => {
    isInstalled = e.matches;
    if (isInstalled) deferredPrompt = null;
    notify();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isInstalled = true;
    notify();
  });
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome === 'accepted';
}
