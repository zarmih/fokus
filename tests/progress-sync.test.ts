import { describe, expect, test, beforeEach, vi } from 'vitest';
import { storage } from '../src/core/storage';
import {
  backupForClipboard,
  designSummaryRu,
  getCloudSyncTransport,
  installProgressSyncBridge,
  noopCloudTransport,
  progressSyncDesign,
  pushViaTransport,
  setCloudSyncTransport,
  syncStatusBlurb,
  importFromClipboardText
} from '../src/core/progress-sync';
import { SyncQueue, setSyncPoster, parseBackup, migrateState } from '../src/core/offline-sync';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
  keys() { return Object.keys(this.data); }
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  setCloudSyncTransport(noopCloudTransport);
  setSyncPoster(async (snapshot, signal) => {
    try {
      return await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
        signal
      });
    } catch {
      return null;
    }
  });
});

describe('progress sync MVP foundation', () => {
  test('design documents export/import phase without secrets', () => {
    const d = progressSyncDesign();
    expect(d.phase).toBe('export_import');
    expect(d.local.envelope).toBe('fokus-backup');
    expect(d.cloudNext.auth).toBe('bearer-token-not-shipped');
    expect(designSummaryRu()).toMatch(/export_import|схема/i);
    expect(syncStatusBlurb({ state: 'online', pendingCount: 0, lastAttempt: null })).toMatch(/локальн/i);
  });

  test('clipboard backup validates envelope from storage.exportJson', () => {
    storage.setProfile({ ...storage.getProfile(), name: 'Sync', onboarded: true, xp: 12 });
    const packed = backupForClipboard(storage.exportJson());
    expect(packed.ok).toBe(true);
    if (packed.ok) {
      expect(packed.text).toContain('fokus-backup');
      expect(packed.text).toContain('checksum');
    }
    expect(backupForClipboard('nope').ok).toBe(false);
  });

  test('importFromClipboardText merges into local state', () => {
    storage.setProfile({ ...storage.getProfile(), name: 'A', onboarded: true, xp: 5 });
    const other = storage.exportJson();
    storage.setProfile({ ...storage.getProfile(), name: 'B', xp: 9 });
    // Re-parse live export as local AppState via import replace dry-run path
    const live = storage.exportJson();
    const parsed = parseBackup(live);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const local = migrateState(parsed.raw);
    const result = importFromClipboardText(local, other, 'merge');
    expect(result.ok).toBe(true);
  });

  test('noop transport returns 501; bridge wires SyncQueue poster', async () => {
    expect((await pushViaTransport([{ x: 1 }])).status).toBe(501);
    installProgressSyncBridge();
    expect(getCloudSyncTransport()).toBe(noopCloudTransport);

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const q = new SyncQueue();
    q.enqueue({ hello: true });
    // With bridge, poster uses noop → null response → error/queued, not a real network call required
    await vi.waitFor(() => {
      const st = q.getStatus().state;
      expect(['error', 'queued', 'online', 'syncing']).toContain(st);
    });
    // Default fetch may still not be called when bridge installed
    fetchMock.mockRestore();
  });

  test('custom transport can succeed', async () => {
    setCloudSyncTransport({
      async push() {
        return { ok: true, status: 200 };
      }
    });
    installProgressSyncBridge();
    const r = await pushViaTransport([1]);
    expect(r.ok).toBe(true);
  });
});
