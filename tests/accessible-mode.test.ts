import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCESSIBLE_VARIANTS, getExerciseMode, modeFor, oddOneAngleDeg, setExerciseMode } from '../src/exercises/lib/exercise-mode';
import { exerciseTrend } from '../src/core/analytics/methodology';
import { renderOddOne } from '../src/exercises/odd-one/view';
import type { Session } from '../src/core/types';

const calls = vi.hoisted(() => [] as any[]);
vi.mock('../src/ui/router', () => ({ navigateTo: vi.fn() }));
vi.mock('../src/exercises/load-exercise', async () => {
  const m = await import('../src/exercises/lib/exercise-mode');
  return {
    loadExercise: vi.fn(async (id: string) => ({
      manifest: { id, name: id, domain: 'attention', skills: ['selective_attention'], instruction: 'x' },
      render: (_el: HTMLElement, _level: number, onEnd: (r: any) => void) => { calls.push({ onEnd, mode: m.getExerciseMode() }); return () => {}; }
    }))
  };
});

describe('accessible mode', () => {
  afterEach(() => setExerciseMode('standard'));

  it('applies only to exercises with an accessible variant and only when preferred', () => {
    expect(ACCESSIBLE_VARIANTS.has('odd-one')).toBe(true);
    expect(modeFor('odd-one', true)).toBe('accessible');
    expect(modeFor('odd-one', false)).toBe('standard');
    expect(modeFor('grid-memory', true)).toBe('standard');
  });

  it('odd-one accessible variant: one rotated arrow, no hue cue; harder level → smaller angle', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="h"></div>';
    setExerciseMode('accessible');
    const cleanup = renderOddOne(document.getElementById('h')!, 5, () => {}, () => false);
    const arrows = [...document.querySelectorAll<HTMLElement>('.oo-arrow')];
    expect(arrows.length).toBeGreaterThan(4);
    const rotated = arrows.filter((a) => !/rotate\(0deg\)/.test(a.style.transform));
    expect(rotated).toHaveLength(1);
    expect(document.querySelector('.oo-btn')!.getAttribute('style') || '').not.toMatch(/hsl|--h/);
    cleanup();
    vi.useRealTimers();
    expect(oddOneAngleDeg(60)).toBeGreaterThan(oddOneAngleDeg(10));
    expect(oddOneAngleDeg(2)).toBeGreaterThanOrEqual(8);
  });

  it('personal trends never mix standard and accessible blocks', () => {
    const now = Date.parse('2026-11-12T12:00:00Z');
    const s: Session[] = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`, startedAt: new Date(now - (10 - i) * 86_400_000).toISOString(), finishedAt: null, durationSec: 300, mode: 'normal',
      items: [{ exerciseId: 'odd-one', level: 3, difficultyBefore: 3, accuracy: i < 5 ? 0.9 : 0.5, avgRtMs: 900, score: 1, rounds: 8, mode: i < 5 ? 'standard' : 'accessible' }]
    }));
    const t = exerciseTrend({ sessions: s, exerciseId: 'odd-one', nowMs: now });
    expect(t.mode).toBe('accessible');
    expect(t.observations).toBe(5);
    expect(t.verdict).toBe('insufficient'); // the drop is a mode change, not "worse"
  });
});

describe('session records the mode', () => {
  beforeEach(() => { calls.length = 0; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('odd-one in accessible mode is played and stored as accessible; others stay standard', async () => {
    const { storage } = await import('../src/core/storage');
    const { renderSession } = await import('../src/ui/screens/session');
    storage.reset();
    const p = storage.getProfile();
    p.onboarded = true; p.calibrated = true; p.accessibleMode = true;
    storage.setProfile(p);
    storage.setExerciseStates(['odd-one', 'grid-memory'].map((exerciseId) => ({ exerciseId, level: 2, difficulty: 2, performance: 0.5, lastPlayedAt: '2026-11-01T00:00:00Z', lastAccuracy: 0.7, attempts: 3 } as any)));
    document.body.innerHTML = '<div id="a11y-status"></div><div id="app"></div>';
    renderSession(document.getElementById('app')!, { mode: 'normal', items: [{ exerciseId: 'odd-one' }, { exerciseId: 'grid-memory' }], durationSec: 300 });
    expect(document.querySelector('[data-mode="accessible"]')).toBeTruthy();
    for (let i = 0; i < 2; i++) {
      document.getElementById('btn-next')!.click();
      await vi.advanceTimersByTimeAsync(2200);
      calls[i].onEnd({ accuracy: 0.8, avgRtMs: 700, rounds: 8 });
      await vi.advanceTimersByTimeAsync(3000);
    }
    expect(calls.map((c) => c.mode)).toEqual(['accessible', 'standard']);
    const saved = storage.getSessions().slice(-1)[0];
    expect(saved.items.map((i) => i.mode)).toEqual(['accessible', 'standard']);
    expect(getExerciseMode()).toBe('standard');
  });
});
