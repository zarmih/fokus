import { afterEach, describe, expect, test, vi } from 'vitest';

describe('privacy: saving never calls the network by default', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('a save before any sync transport is installed sends no request', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.resetModules();
    const { storage } = await import('../src/core/storage');
    const { syncQueue } = await import('../src/core/offline-sync');
    storage.reset();
    const p = storage.getProfile();
    storage.setProfile({ ...p, name: 'Privacy' });
    await syncQueue.sync();
    await new Promise((r) => setTimeout(r, 0));
    expect(storage.getProfile().name).toBe('Privacy');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('the default progress-sync bridge also stays offline', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.resetModules();
    const { installProgressSyncBridge } = await import('../src/core/progress-sync');
    const { SyncQueue } = await import('../src/core/offline-sync');
    installProgressSyncBridge();
    const q = new SyncQueue();
    q.enqueue({ type: 'save', rev: 1 });
    await q.sync();
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
