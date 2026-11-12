/**
 * Behavioural invariants for every exercise in the registry (not source matching):
 * renders at the lowest and highest level with a seeded RNG, survives 15 s of no input,
 * reports a block at most once, cleanup never scores the block, and nothing keeps ticking afterwards.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { registry } from '../src/exercises/registry';

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function maxLevel(mod: (typeof registry)[number]): number {
  const levels = (mod.manifest as { levels?: Record<string, unknown> }).levels;
  const n = levels ? Object.keys(levels).length : 0;
  return n > 0 ? n : 20;
}

interface RunReport {
  threw: string | null;
  hasCleanup: boolean;
  endsBeforeCleanup: number;
  endsAfterCleanup: number;
  pendingTimers: number;
  docNet: number;
  winNet: number;
}

function runOnce(mod: (typeof registry)[number], level: number, seed: number, idleMs: number): RunReport {
  vi.useFakeTimers({ now: new Date('2026-11-12T09:00:00Z') });
  const rnd = vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
  const docAdd = vi.spyOn(document, 'addEventListener');
  const docRem = vi.spyOn(document, 'removeEventListener');
  const winAdd = vi.spyOn(window, 'addEventListener');
  const winRem = vi.spyOn(window, 'removeEventListener');
  const host = document.createElement('div');
  document.body.innerHTML = '';
  document.body.appendChild(host);
  let ends = 0;
  let threw: string | null = null;
  let cleanup: unknown;
  let endsBeforeCleanup = 0;
  try {
    cleanup = mod.render(host, level, () => { ends++; }, () => false);
    vi.advanceTimersByTime(idleMs);
    endsBeforeCleanup = ends;
    if (typeof cleanup === 'function') (cleanup as () => void)();
    vi.advanceTimersByTime(5000);
  } catch (e) {
    threw = String((e as Error)?.message || e);
  }
  const report: RunReport = {
    threw,
    hasCleanup: typeof cleanup === 'function',
    endsBeforeCleanup,
    endsAfterCleanup: ends - endsBeforeCleanup,
    pendingTimers: vi.getTimerCount(),
    docNet: docAdd.mock.calls.length - docRem.mock.calls.length,
    winNet: winAdd.mock.calls.length - winRem.mock.calls.length
  };
  rnd.mockRestore(); docAdd.mockRestore(); docRem.mockRestore(); winAdd.mockRestore(); winRem.mockRestore();
  vi.clearAllTimers();
  vi.useRealTimers();
  return report;
}

beforeAll(() => {
  (globalThis as any).speechSynthesis = { speak() {}, cancel() {} };
  (globalThis as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
  HTMLCanvasElement.prototype.getContext = (() => null) as any;
  // Warm up one-time global subsystems (storage, sync queue, audio) so listener counts below are per-render.
  runOnce(registry[0], 1, 1, 100);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('every registry exercise', () => {
  it('has a unique id and a non-empty instruction', () => {
    const ids = registry.map((m) => m.manifest.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of registry) expect(m.manifest.instruction.trim().length).toBeGreaterThan(10);
  });

  for (const mod of registry) {
    const id = mod.manifest.id;
    it(`${id}: low and high level render, idle, cleanup — no throw, no double report, no leftovers`, () => {
      for (const level of [1, maxLevel(mod)]) {
        const r = runOnce(mod, level, 7 + level, 15000);
        expect(r.threw, `${id}@${level}`).toBeNull();
        expect(r.hasCleanup, `${id}@${level} returns cleanup`).toBe(true);
        expect(r.endsBeforeCleanup, `${id}@${level} reports at most once`).toBeLessThanOrEqual(1);
        expect(r.endsAfterCleanup, `${id}@${level} cleanup must not score the block`).toBe(0);
        expect(r.pendingTimers, `${id}@${level} timers after cleanup`).toBe(0);
        expect(r.docNet, `${id}@${level} document listeners after cleanup`).toBeLessThanOrEqual(0);
        expect(r.winNet, `${id}@${level} window listeners after cleanup`).toBeLessThanOrEqual(0);
      }
    });
  }

  it('previously freezing generators finish at every level (avatar-names, word-pairs, shape-count, dot-span)', () => {
    for (const id of ['avatar-names', 'word-pairs', 'shape-count', 'dot-span']) {
      const mod = registry.find((m) => m.manifest.id === id)!;
      for (const level of [1, 2, 3, 6, 10, 15, 20, 30]) {
        for (const seed of [1, 2, 3]) {
          const r = runOnce(mod, level, seed * 31 + level, 12000);
          expect(r.threw, `${id}@${level}`).toBeNull();
        }
      }
    }
  });
});
