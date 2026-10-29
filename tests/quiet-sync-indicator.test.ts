import { describe, expect, test } from 'vitest';
import { syncIndicatorView } from '../src/ui/shell';
import type { SyncStatus } from '../src/core/offline-sync';

function status(partial: Partial<SyncStatus> & Pick<SyncStatus, 'state'>): SyncStatus {
  return {
    pendingCount: 0,
    lastAttempt: null,
    ...partial
  };
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
