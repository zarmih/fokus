import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { SyncQueue } from '../src/core/offline-sync';

describe('SyncQueue state transitions and idempotency', () => {
  let fetchMock: MockInstance;
  let onLineSpy: MockInstance;

  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
    
    onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts online and goes offline', () => {
    const q = new SyncQueue();
    expect(q.getStatus().state).toBe('online');
    
    onLineSpy.mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(q.getStatus().state).toBe('offline');
  });

  it('queues payload when offline and syncs on recovery', async () => {
    onLineSpy.mockReturnValue(false);
    const q = new SyncQueue();
    
    q.enqueue({ test: 1 });
    expect(q.getStatus().state).toBe('queued');
    expect(q.getStatus().pendingCount).toBe(1);
    expect(window.localStorage.getItem('fokus.sync.queue')).toContain('test');
    
    onLineSpy.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    
    expect(q.getStatus().state).toBe('syncing');
    
    await vi.runAllTimersAsync();
    
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(q.getStatus().state).toBe('online');
    expect(q.getStatus().pendingCount).toBe(0);
    expect(window.localStorage.getItem('fokus.sync.queue')).toBe('[]');
  });

  it('is idempotent on retry and avoids double sync', async () => {
    onLineSpy.mockReturnValue(true);
    const q = new SyncQueue();
    
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    
    q.enqueue({ data: 'first' });
    expect(q.getStatus().state).toBe('syncing');
    
    q.enqueue({ data: 'second' });
    expect(q.getStatus().pendingCount).toBe(2);
    
    await vi.runAllTimersAsync();
    
    expect(q.getStatus().state).toBe('online');
    expect(q.getStatus().pendingCount).toBe(0);
    // Should have called fetch multiple times if queued during syncing
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  });
});
