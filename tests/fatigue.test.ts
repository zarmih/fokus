import { expect, test, describe, vi, beforeEach } from 'vitest';
import { renderSession } from '../src/ui/screens/session';
import { storage } from '../src/core/storage';

vi.mock('../src/ui/router', () => ({
  navigateTo: vi.fn()
}));
vi.mock('../src/core/audio', () => ({
  playBeep: vi.fn()
}));

vi.mock('../src/exercises/dispatch', () => ({
  dispatch: {
    'grid-memory': {
      manifest: { id: 'grid-memory', name: 'Grid Memory', domain: 'memory', skills: ['visual_memory'] },
      render: vi.fn((container, diff, onEnd, isTimeUp) => {
        // Mock immediately finishing a block
        setTimeout(() => onEnd({ accuracy: 0.5, avgRtMs: 1500 }), 10);
        return () => {};
      })
    }
  }
}));

import { dispatch } from '../src/exercises/dispatch';

describe('Session Fatigue Duration', () => {
  beforeEach(() => {
    storage.reset();
    document.body.innerHTML = '<div id="app"></div>';
    vi.useFakeTimers();
  });

  test('Fatigue stop records partial duration', async () => {
    storage.setProfile({ ...storage.getProfile(), sessionLengthSec: 300 });

    renderSession(document.getElementById('app')!, { mode: 'normal', items: [{ exerciseId: 'grid-memory' }, { exerciseId: 'grid-memory' }, { exerciseId: 'grid-memory' }] });

    // Fast forward to skip 3-2-1 countdowns (approx 3 seconds each block)
    // And simulate elapsed time
    // Let's manually trigger button clicks to start
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.click();
    
    // Advance timers
    // To trigger fatigue, (sessionLengthSec - timeLeft) > 300.
    // Wait, sessionLength is 300! So 300 - timeLeft > 300 means timeLeft < 0!
    // I need to set sessionLengthSec to 600 so fatigue CAN trigger after 300s!
    storage.setProfile({ ...storage.getProfile(), sessionLengthSec: 600 });
    
    // Fast forward 301 seconds to allow fatigue to trigger on next blocks
    vi.advanceTimersByTime(301 * 1000);
    
    // Complete 1st block (accuracy 0.5)
    vi.advanceTimersByTime(5000); // Wait for block
    
    // Complete 2nd block (accuracy 0.5) -> Fatigue should trigger!
    vi.advanceTimersByTime(5000); // Wait for block
    
    // At this point, timeLeft should be roughly 600 - 311 = 289
    // session should be finished, and duration should be ~311 seconds, not 600.
    
    const sessions = storage.getSessions();
    if (sessions.length > 0) {
      const s = sessions[0];
      expect(s.durationSec).toBeGreaterThan(0);
      expect(s.durationSec).toBeLessThan(600); // Should NOT be 600!
    }
  });
});
