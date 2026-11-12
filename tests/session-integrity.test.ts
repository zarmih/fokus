import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blockBudgetSec, isScorableBlock, shouldTick, interruptAbortsBlock, MIN_BLOCK_SEC, MAX_BLOCK_SEC } from '../src/core/session-timing';

const calls: { onEnd: (r: any) => void; isTimeUp: () => boolean; cleaned: boolean; level: number }[] = [];

vi.mock('../src/ui/router', () => ({ navigateTo: vi.fn() }));
vi.mock('../src/core/audio', () => ({
  playBeep: vi.fn(), playCue: vi.fn(), playTick: vi.fn(), playHit: vi.fn(), playMiss: vi.fn(),
  playCombo: vi.fn(), unlockAudio: vi.fn(), nextCombo: vi.fn(() => 0), comboAtMilestone: vi.fn(() => false)
}));
vi.mock('../src/exercises/load-exercise', () => ({
  loadExercise: vi.fn(async (id: string) => ({
    manifest: { id, name: id, domain: 'attention', skills: ['selective_attention'], instruction: 'x' },
    render: (_el: HTMLElement, level: number, onEnd: (r: any) => void, isTimeUp: () => boolean) => {
      const rec = { onEnd, isTimeUp, cleaned: false, level };
      calls.push(rec);
      return () => { rec.cleaned = true; };
    }
  }))
}));

import { renderSession } from '../src/ui/screens/session';
import { loadExercise } from '../src/exercises/load-exercise';
import { storage } from '../src/core/storage';

describe('session timing rules', () => {
  it('splits what is left fairly between remaining blocks, within bounds', () => {
    expect(blockBudgetSec({ mode: 'normal', timeLeftSec: 300, remainingBlocks: 3 })).toBe(100);
    expect(blockBudgetSec({ mode: 'normal', timeLeftSec: 720, remainingBlocks: 5 })).toBe(144);
    expect(blockBudgetSec({ mode: 'normal', timeLeftSec: 600, remainingBlocks: 1 })).toBe(MAX_BLOCK_SEC);
    expect(blockBudgetSec({ mode: 'normal', timeLeftSec: 100, remainingBlocks: 4 })).toBe(MIN_BLOCK_SEC);
    expect(blockBudgetSec({ mode: 'normal', timeLeftSec: 30, remainingBlocks: 2 })).toBe(30);
    expect(blockBudgetSec({ mode: 'calibration', timeLeftSec: 90, remainingBlocks: 5, probeBlockSec: 18 })).toBe(18);
    expect(blockBudgetSec({ mode: 'practice', timeLeftSec: 300, remainingBlocks: 1 })).toBe(300);
  });

  it('a budget never exceeds what is left and sums to at most the session budget', () => {
    for (const budget of [300, 480, 720, 900]) {
      for (const blocks of [3, 4, 5]) {
        let left = budget;
        for (let i = 0; i < blocks; i++) {
          const b = blockBudgetSec({ mode: 'normal', timeLeftSec: left, remainingBlocks: blocks - i });
          expect(b).toBeLessThanOrEqual(left);
          left -= b;
        }
        expect(left).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('clock ticks only while playing a visible, unpaused block', () => {
    expect(shouldTick('play', false, false)).toBe(true);
    for (const phase of ['intro', 'countdown', 'feedback', 'paused', undefined]) expect(shouldTick(phase, false, false)).toBe(false);
    expect(shouldTick('play', true, false)).toBe(false);
    expect(shouldTick('play', false, true)).toBe(false);
    expect(interruptAbortsBlock('play')).toBe(true);
    expect(interruptAbortsBlock('countdown')).toBe(true);
    expect(interruptAbortsBlock('intro')).toBe(false);
  });

  it('only blocks with at least one trial and sane numbers are scorable', () => {
    expect(isScorableBlock({ accuracy: 0.5, avgRtMs: 700, rounds: 8 })).toBe(true);
    expect(isScorableBlock({ accuracy: 0, avgRtMs: 1000, rounds: 0 })).toBe(false);
    expect(isScorableBlock({ accuracy: NaN, avgRtMs: 1, rounds: 3 })).toBe(false);
    expect(isScorableBlock({ accuracy: 1.2, avgRtMs: 1, rounds: 3 })).toBe(false);
    expect(isScorableBlock(null)).toBe(false);
  });
});

describe('session screen integrity', () => {
  let hidden = false;
  beforeEach(() => {
    calls.length = 0;
    storage.reset();
    const p = storage.getProfile();
    p.onboarded = true; p.calibrated = true; p.sessionLengthSec = 300;
    storage.setProfile(p);
    // Exercises already known (a trial only precedes the first ever scored block).
    storage.setExerciseStates(['stroop', 'odd-one', 'pattern-next'].map((exerciseId) => ({ exerciseId, level: 2, difficulty: 2, performance: 0.5, lastPlayedAt: '2026-11-01T00:00:00Z', lastAccuracy: 0.7, attempts: 3 } as any)));
    storage.setSessions([{ id: 'past', date: '2026-11-01T00:00:00Z', durationSec: 300, items: ['stroop', 'odd-one', 'pattern-next'].map((exerciseId) => ({ exerciseId })) } as any]);
    document.body.innerHTML = '<div id="a11y-status" role="status" aria-live="polite"></div><div id="app"></div>';
    hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const timer = () => document.getElementById('session-timer')!.textContent;
  const start = async () => {
    document.getElementById('btn-next')!.click();
    await vi.advanceTimersByTimeAsync(2200); // 3-2-1 countdown
  };
  const items = () => [{ exerciseId: 'stroop' }, { exerciseId: 'odd-one' }, { exerciseId: 'pattern-next' }];

  it('reading the instruction does not spend the budget', async () => {
    renderSession(document.getElementById('app')!, { mode: 'normal', items: items(), durationSec: 300 });
    await vi.advanceTimersByTimeAsync(15000);
    expect(timer()).toBe('5:00');
    await start();
    await vi.advanceTimersByTimeAsync(10000);
    expect(timer()).toBe('4:50');
  });

  it('each block gets its share of the budget instead of the whole session', async () => {
    renderSession(document.getElementById('app')!, { mode: 'normal', items: items(), durationSec: 300 });
    await start();
    const block = calls[0];
    await vi.advanceTimersByTimeAsync(98000);
    expect(block.isTimeUp()).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    expect(block.isTimeUp()).toBe(true);
  });

  it('hiding the tab aborts the block unscored, freezes the clock, and replays the same exercise', async () => {
    renderSession(document.getElementById('app')!, { mode: 'normal', items: items(), durationSec: 300 });
    await start();
    await vi.advanceTimersByTimeAsync(5000);
    const before = timer();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(calls[0].cleaned).toBe(true);
    const overlay = document.getElementById('pause-overlay')!;
    expect(overlay.dataset.aborted).toBe('1');
    expect(overlay.textContent).toContain('Прерванная попытка не засчитана');

    // A late report from the aborted exercise is ignored.
    calls[0].onEnd({ accuracy: 0.1, avgRtMs: 900, rounds: 12 });
    await vi.advanceTimersByTimeAsync(60000);
    expect(timer()).toBe(before);
    expect(storage.getExerciseStates().find((s) => s.exerciseId === 'stroop')?.lastAccuracy).toBe(0.7); // untouched

    hidden = false;
    (document.getElementById('btn-unpause') as HTMLButtonElement).click();
    expect(document.querySelector('#instruction-card h2')?.textContent).toBe('Чернила'); // same exercise (stroop)
    expect(document.querySelector('.session-block-info')?.textContent).toContain('Блок 1');
    expect(document.getElementById('btn-next')).toBeTruthy();
    await start();
    expect(calls).toHaveLength(2);
    calls[1].onEnd({ accuracy: 0.8, avgRtMs: 600, rounds: 10 });
    const st = storage.getExerciseStates().find((s) => s.exerciseId === 'stroop');
    expect(st?.lastAccuracy).toBeCloseTo(0.8);
  });

  it('manual pause during play also aborts and replays; pause on the instruction screen does not', async () => {
    renderSession(document.getElementById('app')!, { mode: 'normal', items: items(), durationSec: 300 });
    (document.getElementById('btn-pause') as HTMLButtonElement).click();
    expect(document.getElementById('pause-overlay')!.dataset.aborted).toBe('0');
    (document.getElementById('btn-unpause') as HTMLButtonElement).click();
    expect(document.getElementById('pause-overlay')).toBeNull();
    await start();
    (document.getElementById('btn-pause') as HTMLButtonElement).click();
    expect(calls[0].cleaned).toBe(true);
    expect(document.getElementById('pause-overlay')!.dataset.aborted).toBe('1');
  });

  it('a block with no trials records nothing and moves on', async () => {
    renderSession(document.getElementById('app')!, { mode: 'normal', items: items(), durationSec: 300 });
    await start();
    calls[0].onEnd({ accuracy: 0, avgRtMs: 1000, rounds: 0 });
    expect(storage.getExerciseStates().find((s) => s.exerciseId === 'stroop')?.lastAccuracy).toBe(0.7); // untouched
    expect(document.querySelector('.session-block-info')?.textContent).toContain('Блок 2');
  });

  it('plays exactly the planned items in order — no mid-session re-plan', async () => {
    vi.mocked(loadExercise).mockClear();
    renderSession(document.getElementById('app')!, { mode: 'normal', items: items(), durationSec: 300 });
    for (let i = 0; i < 3; i++) {
      await start();
      calls[i].onEnd({ accuracy: 0.8, avgRtMs: 600, rounds: 10 });
      await vi.advanceTimersByTimeAsync(5000);
    }
    const loaded = [...new Set(vi.mocked(loadExercise).mock.calls.map((c) => c[0]))];
    expect(loaded).toEqual(['stroop', 'odd-one', 'pattern-next']);
  });

  it('first time with an exercise: a short unscored trial at level 1 that does not spend the budget, then the scored block', async () => {
    storage.setExerciseStates([]);
    storage.setSessions([]);
    renderSession(document.getElementById('app')!, { mode: 'normal', items: [{ exerciseId: 'go-no-go' }, { exerciseId: 'stroop' }], durationSec: 300 });
    expect(document.querySelector('[data-trial="1"]')).toBeTruthy();
    expect(document.getElementById('btn-next')!.textContent).toBe('Пробный раунд');
    await start();
    expect(calls[0].level).toBe(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(timer()).toBe('5:00'); // trial time is not taken from the session
    expect(calls[0].isTimeUp()).toBe(false);
    await vi.advanceTimersByTimeAsync(6000);
    expect(calls[0].isTimeUp()).toBe(true);
    calls[0].onEnd({ accuracy: 0.2, avgRtMs: 900, rounds: 5 });
    expect(storage.getExerciseStates().find((s) => s.exerciseId === 'go-no-go')).toBeUndefined();
    expect(document.querySelector('[data-trial-done="1"]')).toBeTruthy();
    expect(document.querySelector('.session-block-info')?.textContent).toContain('Блок 1');
    expect(document.getElementById('btn-next')!.textContent).toBe('Начать');
    await start();
    calls[1].onEnd({ accuracy: 0.9, avgRtMs: 500, rounds: 10 });
    expect(storage.getExerciseStates().find((s) => s.exerciseId === 'go-no-go')?.lastAccuracy).toBeCloseTo(0.9);
    // Second exercise was trialled? No — it has no state either, so it gets its own trial.
    await vi.advanceTimersByTimeAsync(3000);
    expect(document.querySelector('[data-trial="1"]')).toBeTruthy();
  });

  it('difficulty states seeded by calibration do not skip the trial; an exercise played in calibration does', async () => {
    storage.setSessions([]);
    storage.setExerciseStates(['go-no-go', 'stroop'].map((exerciseId) => ({ exerciseId, level: 3, difficulty: 3, performance: 0.5, lastPlayedAt: null, lastAccuracy: 0.5, attempts: 1 } as any)));
    const { recordEngineObservation } = await import('../src/core/adaptive-plan');
    recordEngineObservation({ exerciseId: 'stroop', domain: 'flexibility', skills: [], metricModel: 'speed-accuracy', difficulty: 3, accuracy: 0.8, avgRtMs: 700, targetMs: 1500, performance: 600, probe: true } as any);
    renderSession(document.getElementById('app')!, { mode: 'normal', items: [{ exerciseId: 'go-no-go' }], durationSec: 300 });
    expect(document.querySelector('[data-trial="1"]')).toBeTruthy();
    document.getElementById('app')!.innerHTML = '';
    renderSession(document.getElementById('app')!, { mode: 'normal', items: [{ exerciseId: 'stroop' }], durationSec: 300 });
    expect(document.querySelector('[data-trial="1"]')).toBeNull();
  });
});
