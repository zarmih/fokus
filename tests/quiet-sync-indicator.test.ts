import { describe, expect, test, beforeEach, vi } from 'vitest';
import { renderShell, syncIndicatorView } from '../src/ui/shell';
import { syncQueue, type SyncStatus } from '../src/core/offline-sync';
import { storage } from '../src/core/storage';

function status(partial: Partial<SyncStatus> & Pick<SyncStatus, 'state'>): SyncStatus {
  return {
    pendingCount: 0,
    lastAttempt: null,
    ...partial
  };
}

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

describe('syncIndicatorView (quiet local-save header)', () => {
  test('offline is always visible with Офлайн', () => {
    const view = syncIndicatorView(status({ state: 'offline', pendingCount: 0 }));
    expect(view.visible).toBe(true);
    expect(view.className).toContain('visible');
    expect(view.className).toContain('offline');
    expect(view.html).toContain('Офлайн');
    expect(view.html).not.toContain('Сохранено локально');
  });

  test('queued with pendingCount=0 is hidden (no local-save flash)', () => {
    const view = syncIndicatorView(status({ state: 'queued', pendingCount: 0 }));
    expect(view.visible).toBe(false);
    expect(view.className).toBe('sync-indicator');
    expect(view.html).toBe('');
  });

  test('queued with pendingCount>0 shows Сохранено локально', () => {
    const view = syncIndicatorView(status({ state: 'queued', pendingCount: 2 }));
    expect(view.visible).toBe(true);
    expect(view.className).toContain('visible');
    expect(view.className).toContain('queued');
    expect(view.html).toContain('Сохранено локально');
  });

  test('error with pendingCount=0 is hidden', () => {
    const view = syncIndicatorView(status({ state: 'error', pendingCount: 0 }));
    expect(view.visible).toBe(false);
    expect(view.html).toBe('');
  });

  test('error with pendingCount>0 shows Сохранено локально', () => {
    const view = syncIndicatorView(status({ state: 'error', pendingCount: 1 }));
    expect(view.visible).toBe(true);
    expect(view.html).toContain('Сохранено локально');
  });

  test('syncing is visible', () => {
    const view = syncIndicatorView(status({ state: 'syncing', pendingCount: 1 }));
    expect(view.visible).toBe(true);
    expect(view.html).toContain('Синхронизация');
  });

  test('online with pendingCount=0 is hidden (no Синхронизировано flash)', () => {
    const view = syncIndicatorView(status({ state: 'online', pendingCount: 0 }));
    expect(view.visible).toBe(false);
    expect(view.html).toBe('');
    expect(view.html).not.toContain('Синхронизировано');
  });

  test('unknown is hidden', () => {
    const view = syncIndicatorView(status({ state: 'unknown', pendingCount: 0 }));
    expect(view.visible).toBe(false);
    expect(view.html).toBe('');
  });
});

describe('#top-sync-indicator a11y (status live region)', () => {
  beforeEach(() => {
    (storage as any).backend = new MockStorage();
    storage.reset();
    document.body.innerHTML = '';
    vi.spyOn(syncQueue, 'getStatus').mockReturnValue(status({ state: 'online', pendingCount: 0 }));
  });

  test('renderShell exposes role=status, polite live, atomic', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    renderShell(root, { active: 'today' });

    const indicator = root.querySelector('#top-sync-indicator') as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.getAttribute('aria-live')).toBe('polite');
    expect(indicator.getAttribute('aria-atomic')).toBe('true');
  });

  test('hidden after update sets aria-hidden=true; offline clears it and shows Офлайн', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    renderShell(root, { active: 'today' });

    const indicator = root.querySelector('#top-sync-indicator') as HTMLElement;

    // Initial getStatus is online → quiet hidden
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.innerHTML).toBe('');
    expect(indicator.className).toBe('sync-indicator');

    syncQueue.dispatchEvent(
      new CustomEvent<SyncStatus>('change', { detail: status({ state: 'offline', pendingCount: 0 }) })
    );
    expect(indicator.hasAttribute('aria-hidden')).toBe(false);
    expect(indicator.textContent).toContain('Офлайн');
    expect(indicator.className).toContain('offline');
    expect(indicator.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.querySelector('svg')?.getAttribute('focusable')).toBe('false');

    syncQueue.dispatchEvent(
      new CustomEvent<SyncStatus>('change', { detail: status({ state: 'queued', pendingCount: 0 }) })
    );
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.innerHTML).toBe('');
    expect(indicator.className).toBe('sync-indicator');
  });
});
