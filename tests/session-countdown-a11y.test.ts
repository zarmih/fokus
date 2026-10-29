import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderSession,
  COUNTDOWN_START_ANNOUNCEMENT,
  COUNTDOWN_GO_ANNOUNCEMENT
} from '../src/ui/screens/session';
import { storage } from '../src/core/storage';

vi.mock('../src/ui/router', () => ({ navigateTo: vi.fn() }));
vi.mock('../src/core/audio', () => ({
  playBeep: vi.fn(),
  playCue: vi.fn(),
  playTick: vi.fn(),
  playHit: vi.fn(),
  playMiss: vi.fn(),
  playCombo: vi.fn(),
  unlockAudio: vi.fn()
}));
vi.mock('../src/exercises/load-exercise', () => ({
  loadExercise: vi.fn(async () => ({
    manifest: { id: 'grid-memory', name: 'Grid Memory', domain: 'memory', skills: ['visual_memory'] },
    render: vi.fn(() => () => {})
  }))
}));

const status = () => document.getElementById('a11y-status')!;

describe('session start countdown a11y', () => {
  beforeEach(() => {
    storage.reset();
    document.body.innerHTML =
      '<div id="a11y-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div><div id="app"></div>';
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('digits are visual-only and the countdown is announced once, politely', async () => {
    renderSession(document.getElementById('app')!, { mode: 'practice', items: [{ exerciseId: 'grid-memory' }] });
    document.getElementById('btn-next')!.click();

    const overlay = document.querySelector('.count-overlay') as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.textContent).toBe('3');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.hasAttribute('role')).toBe(false);
    expect(overlay.hasAttribute('aria-live')).toBe(false);
    expect(document.querySelector('#app [aria-live="assertive"]')).toBeNull();

    await vi.advanceTimersByTimeAsync(20);
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(status().textContent).toBe(COUNTDOWN_START_ANNOUNCEMENT);

    // Next tick updates visible digit only; the live region is not re-written per second.
    await vi.advanceTimersByTimeAsync(700);
    expect(overlay.textContent).toBe('2');
    expect(status().textContent).toBe(COUNTDOWN_START_ANNOUNCEMENT);
  });

  test('announces "Начали" once when the block starts', async () => {
    renderSession(document.getElementById('app')!, { mode: 'practice', items: [{ exerciseId: 'grid-memory' }] });
    document.getElementById('btn-next')!.click();
    await vi.advanceTimersByTimeAsync(2200);
    expect(document.querySelector('.count-overlay')).toBeNull();
    expect(status().textContent).toBe(COUNTDOWN_GO_ANNOUNCEMENT);
    expect(status().getAttribute('aria-live')).toBe('polite');
  });

  test('announcement copy', () => {
    expect(COUNTDOWN_START_ANNOUNCEMENT).toBe('Сейчас начнём');
    expect(COUNTDOWN_GO_ANNOUNCEMENT).toBe('Начали');
  });
});
