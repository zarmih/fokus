import { expect, test, beforeEach } from 'vitest';
import { initInstallPrompt, onInstallPrompt, promptInstall, deferredPrompt, isInstalled } from '../src/pwa-install';

beforeEach(() => {
  (window as any).matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {}
  });
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
