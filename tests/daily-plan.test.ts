import { beforeEach, describe, expect, test, vi } from 'vitest';
import { storage } from '../src/core/storage';
import { planToday, resolveDailyBudget, PRIMARY_CTA } from '../src/core/daily-plan';
import { CORE_EXERCISES, CORE_EXERCISE_IDS, CORE_PROGRAM_DAYS, isCoreExercise, nonCoreExclusions } from '../src/core/core-catalog';
import { targetBlockCount } from '../src/core/engine/scheduler';
import { recordEngineObservation, markEngineCalibrated } from '../src/core/adaptive-plan';
import { registry } from '../src/exercises/registry';
import { renderToday } from '../src/ui/screens/today';
import { renderProgram } from '../src/ui/screens/program';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

const DAY = 86_400_000;
const domainOf = new Map(registry.map((r) => [r.manifest.id, r.manifest.domain] as const));

function calibratedUser(sessionLengthSec = 480) {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.skipLifestylePrompt = true;
  p.sessionLengthSec = sessionLengthSec;
  storage.setProfile(p);
}

/** Pretend the user played `items` on the day of `nowMs` (what Session persists, minimally). */
function recordDay(items: { exerciseId: string }[], nowMs: number, streak: number) {
  const iso = new Date(nowMs).toISOString();
  for (const it of items) {
    const m = registry.find((r) => r.manifest.id === it.exerciseId)!.manifest;
    recordEngineObservation({
      exerciseId: m.id, domain: m.domain as any, skills: [...m.skills], metricModel: (m.metricModel || 'speed-accuracy') as any,
      difficulty: 2, accuracy: 0.8, avgRtMs: 900, targetMs: 1500, performance: 0.7, rounds: 6
    }, nowMs);
  }
  storage.addSession({
    id: `s-${nowMs}`, startedAt: iso, finishedAt: iso, durationSec: 300,
    items: items.map((it) => ({ exerciseId: it.exerciseId, score: 70, accuracy: 0.8, avgRtMs: 900, rounds: 6, level: 2 } as any))
  });
  storage.addDaySummary({ date: iso, totalScore: 70, domainDeltas: {}, streak, skipped: false });
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
});

describe('core catalog', () => {
  test('15 exercises, 3 per domain, all exist in the registry', () => {
    expect(CORE_EXERCISE_IDS).toHaveLength(15);
    for (const [domain, ids] of Object.entries(CORE_EXERCISES)) {
      expect(ids).toHaveLength(3);
      for (const id of ids) expect(domainOf.get(id)).toBe(domain);
    }
  });

  test('falls back to the whole catalog when the core would cover too few domains', () => {
    const refs = registry.map((r) => ({ id: r.manifest.id, domain: r.manifest.domain }));
    expect(nonCoreExclusions(refs, new Set()).length).toBe(refs.length - 15);
    const resting = new Set([...CORE_EXERCISES.memory, ...CORE_EXERCISES.speed, ...CORE_EXERCISES.logic]);
    expect(nonCoreExclusions(refs, resting)).toEqual([]);
  });
});

describe('resolveDailyBudget', () => {
  test('the tightest cap wins and is named', () => {
    expect(resolveDailyBudget({ profile: 720 })).toEqual({ durationSec: 720, source: 'profile' });
    expect(resolveDailyBudget({ profile: 720, 'soft-return': 300, retention: 480 })).toEqual({ durationSec: 300, source: 'soft-return' });
    expect(resolveDailyBudget({ profile: 480, recovery: 300, 'first-week': 300 })).toEqual({ durationSec: 300, source: 'recovery' });
    expect(resolveDailyBudget({ profile: 300, retention: 600 }).source).toBe('profile');
    expect(resolveDailyBudget({ profile: 300, retention: null, resume: Number.NaN }).durationSec).toBe(300);
  });
});

describe('planToday', () => {
  test.each([300, 480, 720])('respects the %s s budget and the shared block-count rule', (sec) => {
    calibratedUser(sec);
    const plan = planToday();
    expect(plan.durationSec).toBeLessThanOrEqual(sec);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.items.length).toBeLessThanOrEqual(targetBlockCount(plan.durationSec));
    expect(new Set(plan.items.map((i) => i.exerciseId)).size).toBe(plan.items.length);
    expect(plan.why).toMatch(/мин/);
  });

  test('first 14 training days draw only from the core; afterwards the whole catalog is open', () => {
    calibratedUser(720);
    const start = Date.now() - 20 * DAY;
    let core = true;
    for (let d = 0; d < CORE_PROGRAM_DAYS; d++) {
      const now = start + d * DAY;
      const plan = planToday({ nowMs: now });
      expect(plan.programDay).toBe(d + 1);
      expect(plan.inCoreProgram).toBe(true);
      core = core && plan.items.every((i) => isCoreExercise(i.exerciseId));
      recordDay(plan.items, now, d + 1);
    }
    expect(core).toBe(true);
    const after = planToday({ nowMs: start + CORE_PROGRAM_DAYS * DAY });
    expect(after.programDay).toBe(CORE_PROGRAM_DAYS + 1);
    expect(after.inCoreProgram).toBe(false);
  });

  test('all five domains are covered within three consecutive days', () => {
    calibratedUser(300);
    markEngineCalibrated(Date.now() - 4 * DAY);
    const seen = new Set<string>();
    for (let d = 0; d < 3; d++) {
      const now = Date.now() - (3 - d) * DAY;
      const plan = planToday({ nowMs: now });
      plan.items.forEach((i) => seen.add(domainOf.get(i.exerciseId)!));
      if (process.env.DBG) console.log(d, plan.items.map((i) => i.exerciseId + ":" + i.slot).join(" "));
      recordDay(plan.items, now, d + 1);
    }
    expect([...seen].sort()).toEqual(['attention', 'flexibility', 'logic', 'memory', 'speed']);
  });
});

describe('one plan: shown on Today == explained on Program == played in Session', () => {
  function captureNavigate() {
    const calls: any[] = [];
    const h = (e: Event) => calls.push((e as CustomEvent).detail);
    window.addEventListener('navigate', h);
    return { calls, stop: () => window.removeEventListener('navigate', h) };
  }

  test('Today: chips, the started session and planToday() agree; one primary CTA', () => {
    calibratedUser(480);
    const expected = planToday();
    const app = document.getElementById('app')!;
    renderToday(app);
    const shown = [...app.querySelectorAll<HTMLElement>('.workout-chip[data-exercise-id]')].map((el) => el.dataset.exerciseId);
    expect(shown).toEqual(expected.items.map((i) => i.exerciseId));
    expect(app.querySelector('#btn-start')!.textContent).toContain(PRIMARY_CTA);
    expect(app.querySelector('#btn-full-start')).toBeNull();
    expect(app.querySelector('[data-budget-source]')).toBeTruthy();

    const nav = captureNavigate();
    (app.querySelector('#btn-start') as HTMLButtonElement).click();
    nav.stop();
    const start = nav.calls.find((c) => c.screenId === 'session');
    expect(start.params.items.map((i: any) => i.exerciseId)).toEqual(shown);
    expect(start.params.durationSec).toBe(expected.durationSec);
  });

  test('Program starts the same items and budget as Today', () => {
    calibratedUser(480);
    const expected = planToday();
    const app = document.getElementById('app')!;
    renderProgram(app);
    const btn = app.querySelector('#btn-program-start') as HTMLButtonElement;
    expect(btn.textContent).toContain(PRIMARY_CTA);
    const nav = captureNavigate();
    btn.click();
    nav.stop();
    const start = nav.calls.find((c) => c.screenId === 'session');
    expect(start.params.items.map((i: any) => i.exerciseId)).toEqual(expected.items.map((i) => i.exerciseId));
    expect(start.params.durationSec).toBe(expected.durationSec);
  });
});
