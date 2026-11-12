import { describe, expect, test } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '../src/exercises/registry';
import { CORE_EXERCISE_IDS } from '../src/core/core-catalog';
import { EXERCISE_ICON_IDS, exerciseIconSrc } from '../src/ui/exercise-icon';
import { GoNoGoEngine } from '../src/exercises/go-no-go/engine';
import { summarizeSession } from '../src/core/session-summary';
import type { Session, SessionItem } from '../src/core/types';

const ART = join(__dirname, '..', 'public', 'art');

describe('exercise icons', () => {
  test('the icon list matches public/art', () => {
    const files = readdirSync(ART).filter((f) => /^icon-.*\.svg$/.test(f) && !f.startsWith('icon-domain-'));
    expect([...EXERCISE_ICON_IDS].sort()).toEqual(files.map((f) => f.slice(5, -4)).sort());
  });

  test('every catalog exercise resolves to an existing file; every core exercise has its own icon', () => {
    for (const r of registry) {
      const src = exerciseIconSrc(r.manifest.id, r.manifest.domain, '/');
      expect(existsSync(join(ART, src.replace('/art/', ''))), `${r.manifest.id} → ${src}`).toBe(true);
    }
    for (const id of CORE_EXERCISE_IDS) expect(EXERCISE_ICON_IDS.has(id), id).toBe(true);
  });
});

describe('go-no-go', () => {
  test('a block with no presses is unscorable instead of rewarding inaction', () => {
    const e = new GoNoGoEngine(10, 0.4);
    for (let i = 0; i < 10; i++) e.recordAction(i % 2 === 0, false, 1000);
    expect(e.getScore().rounds).toBe(0);
    const p = new GoNoGoEngine(4, 0.5);
    p.recordAction(true, true, 400);
    p.recordAction(false, false, 1000);
    p.recordAction(true, false, 1000);
    p.recordAction(false, true, 300);
    expect(p.getScore()).toMatchObject({ rounds: 4, accuracy: 0.5, avgRtMs: 400 });
  });

  test('go and no-go differ by symbol and shape, not only colour', async () => {
    const { renderGoNoGo } = await import('../src/exercises/go-no-go/view');
    const { vi } = await import('vitest');
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="x"></div>';
    const cleanup = renderGoNoGo(document.getElementById('x')!, 3, () => {}, () => false);
    const seen = new Map<string, string>();
    for (let i = 0; i < 60 && seen.size < 2; i++) {
      await vi.advanceTimersByTimeAsync(1400);
      const el = document.getElementById('stimulus')!;
      if (el.classList.contains('go')) seen.set('go', el.textContent || '');
      if (el.classList.contains('nogo')) seen.set('nogo', el.textContent || '');
    }
    (cleanup as any)?.();
    vi.useRealTimers();
    expect(seen.get('go')).toBe('▶');
    expect(seen.get('nogo')).toBe('✕');
  });
});

describe('instructions of the core set', () => {
  const m = (id: string) => registry.find((r) => r.manifest.id === id)!.manifest;
  test('say what to press and by which rule', () => {
    expect(m('stroop').instruction).toMatch(/цвет.*букв/i);
    expect(m('switch-rule').instruction).toMatch(/чётное.*больше/);
    expect(m('pulley').instruction).toMatch(/сумм/);
    expect(m('odd-one').instruction).toMatch(/оттенк|цвет/);
    expect(m('go-no-go').instruction).toMatch(/▶.*✕/);
    for (const id of ['stroop', 'switch-rule', 'pulley', 'odd-one', 'go-no-go']) expect(m(id).instruction.length).toBeGreaterThan(60);
  });
});

describe('session summary: one observation, one next step', () => {
  const DAY = 86_400_000;
  const NOW = Date.parse('2026-11-12T12:00:00Z');
  const it = (id: string, acc: number): SessionItem => ({ exerciseId: id, level: 3, difficultyBefore: 3, accuracy: acc, avgRtMs: 900, score: 10, rounds: 8, mode: 'standard' });
  const ses = (d: number, items: SessionItem[]): Session => ({ id: `s${d}`, startedAt: new Date(NOW - d * DAY).toISOString(), finishedAt: null, durationSec: 300, items, mode: 'normal' });
  const nameOf = (id: string) => id.toUpperCase();

  test('first session → best block fact, never a trend', () => {
    const s = ses(0, [it('odd-one', 0.7), it('stroop', 0.9)]);
    const r = summarizeSession({ session: s, sessions: [s], nameOf, nextDurationSec: 300, nowMs: NOW });
    expect(r.kind).toBe('best-block');
    expect(r.observation).toContain('STROOP');
    expect(r.nextStep).toMatch(/Тренировка на сегодня.*5 мин/);
  });

  test('comparable improvement → named as better for that exercise only', () => {
    const hist = [0.6, 0.6, 0.6, 0.6, 0.6, 0.85, 0.85, 0.85, 0.85, 0.85].map((a, i) => ses(10 - i, [it("odd-one", a)]));
    const r = summarizeSession({ session: hist[hist.length - 1], sessions: hist, nameOf, nextDurationSec: 480, nowMs: NOW });
    expect(r.kind).toBe('better');
    expect(r.observation).toMatch(/ODD-ONE.*похожей сложности/);
  });

  test('calibration → next step points to the first training', () => {
    const s = ses(0, [it('odd-one', 0.7)]);
    const r = summarizeSession({ session: s, sessions: [], nameOf, nextDurationSec: 300, calibration: true, nowMs: NOW });
    expect(r.nextStep).toMatch(/первая тренировка/);
  });
});

describe('Result screen', () => {
  test('opens with a short summary: one observation, one next step; details are folded', async () => {
    const { renderResult } = await import('../src/ui/screens/result');
    const { storage } = await import('../src/core/storage');
    storage.reset();
    document.body.innerHTML = '<div id="app"></div>';
    const now = new Date().toISOString();
    const session: Session = { id: 'r1', startedAt: now, finishedAt: now, durationSec: 300, mode: 'normal', items: [
      { exerciseId: 'odd-one', level: 3, accuracy: 0.8, avgRtMs: 900, score: 20, rounds: 8 },
      { exerciseId: 'stroop', level: 3, accuracy: 0.9, avgRtMs: 800, score: 25, rounds: 9 }
    ] };
    renderResult(document.getElementById('app')!, { session });
    const sum = document.querySelector('.result-summary')!;
    expect(sum).toBeTruthy();
    expect(sum.querySelectorAll('.result-observation')).toHaveLength(1);
    expect(sum.querySelectorAll('.result-next-step')).toHaveLength(1);
    expect(sum.textContent).toContain('Чернила');
    const details = document.querySelector('details.result-details') as HTMLDetailsElement;
    expect(details).toBeTruthy();
    expect(details.open).toBe(false);
    // Summary precedes the details in reading order.
    expect(sum.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
