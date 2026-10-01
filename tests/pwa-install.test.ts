import { expect, test, beforeEach, vi } from 'vitest';
import { initInstallPrompt, onInstallPrompt, promptInstall, deferredPrompt, isInstalled } from '../src/pwa-install';

beforeEach(() => {
  (window as any).matchMedia = vi.fn().mockImplementation((q) => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
});

test('onInstallPrompt exposes state and listens for changes', () => {
  let p: any = null, inst: boolean = false;
  const off = onInstallPrompt((prompt, installed) => {
    p = prompt;
    inst = installed;
  });
  
  expect(inst).toBe(false);
  expect(p).toBe(null);
  
  off();
});

test('initInstallPrompt sets up listeners and handles beforeinstallprompt', () => {
  let listeners: Record<string, EventListener> = {};
  window.addEventListener = vi.fn().mockImplementation((event, cb) => {
    listeners[event] = cb;
  });

  initInstallPrompt();

  expect(window.addEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  expect(window.addEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function));

  let p: any = null;
  const off = onInstallPrompt((prompt) => { p = prompt; });

  const preventDefault = vi.fn();
  listeners['beforeinstallprompt']({ preventDefault, type: 'beforeinstallprompt' } as any);

  expect(preventDefault).toHaveBeenCalled();
  expect(p).toBeTruthy();

  listeners['appinstalled']({ type: 'appinstalled' } as any);
  expect(p).toBeNull();
  
  off();
});

test('promptInstall triggers prompt and returns outcome', async () => {
  let listeners: Record<string, EventListener> = {};
  window.addEventListener = vi.fn().mockImplementation((event, cb) => {
    listeners[event] = cb;
  });
  initInstallPrompt();

  const promptMock = vi.fn();
  listeners['beforeinstallprompt']({
    preventDefault: vi.fn(),
    prompt: promptMock,
    userChoice: Promise.resolve({ outcome: 'accepted' }),
    type: 'beforeinstallprompt'
  } as any);

  const res = await promptInstall();
  expect(promptMock).toHaveBeenCalled();
  expect(res).toBe(true);

  // already used, deferredPrompt is null
  const res2 = await promptInstall();
  expect(res2).toBe(false);
});

test('getInstallPathKind and manual hint without BIP', async () => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    configurable: true
  });
  const { getInstallPathKind, getManualInstallHint, __resetSoftReturnBoot, consumeSoftReturnQuery } = await import('../src/pwa-install');
  expect(getInstallPathKind()).toBe('ios_manual');
  const hint = getManualInstallHint(true);
  expect(hint.show).toBe(true);
  expect(hint.body).toMatch(/Safari/i);

  __resetSoftReturnBoot();
  // jsdom location may be readonly — soft path covered in pwa-paths.test
  expect(typeof consumeSoftReturnQuery).toBe('function');
});
