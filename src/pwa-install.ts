import {
  detectInstallPath,
  manualInstallCopy,
  parseSoftReturnSearch,
  type InstallPathKind
} from './core/pwa-paths';

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

export function getInstallPathKind(): InstallPathKind {
  if (typeof window === 'undefined') return 'unsupported';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let standaloneMq = false;
  try {
    standaloneMq = window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    /* ignore */
  }
  return detectInstallPath({
    isInstalled,
    hasDeferredPrompt: !!deferredPrompt,
    userAgent: ua,
    standaloneMq
  });
}

export function getManualInstallHint(softReturnActive: boolean) {
  return manualInstallCopy(getInstallPathKind(), softReturnActive);
}

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;

  const mq = window.matchMedia('(display-mode: standalone)');
  isInstalled = mq.matches || !!(navigator as any).standalone;

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

/** Soft-return deep link from SW notification — sticky for this page load. */
let softReturnBoot = false;

export function consumeSoftReturnQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const parsed = parseSoftReturnSearch(window.location.search || '');
  if (parsed.softReturn) {
    softReturnBoot = true;
    try {
      const url = window.location.pathname + parsed.cleanUrl + window.location.hash;
      window.history.replaceState({}, '', url);
    } catch {
      /* ignore */
    }
  }
  return softReturnBoot;
}

export function isSoftReturnBoot(): boolean {
  return softReturnBoot;
}

/** Test helper — reset boot flag between cases. */
export function __resetSoftReturnBoot() {
  softReturnBoot = false;
}
