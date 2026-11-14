import { beforeEach, describe, expect, test, vi, afterEach } from 'vitest';
import { storage } from '../src/core/storage';
import { planToday, resolveDailyBudget, PRIMARY_CTA } from '../src/core/daily-plan';
import { CORE_EXERCISES, CORE_EXERCISE_IDS, CORE_PROGRAM_DAYS, isCoreExercise, nonCoreExclusions } from '../src/core/core-catalog';
import { targetBlockCount, NEW_EXERCISE_REASON, SLOT_REASON } from '../src/core/engine';
import { recordEngineObservation, markEngineCalibrated } from '../src/core/adaptive-plan';
import { registry } from '../src/exercises/registry';
import { renderToday } from '../src/ui/screens/today';
import { renderProgram } from '../src/ui/screens/program';
import { buildFirstWeekPlan } from '../src/core/onboarding';
import { domainLabel } from '../src/core/labels';
import { setLocale } from '../src/core/i18n';
import { planReasonText } from '../src/core/plan-copy';

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

afterEach(() => {
  setLocale('ru');
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

  test('never-played exercises are not given interval elapsed reason; overdue exercises are', () => {
    calibratedUser(300);
    const plan = planToday();
    expect(plan.items.length).toBeGreaterThan(0);
    // Never-played exercise placed in overdue slot must not get the interval elapsed reason
    expect(plan.items[0].reason).not.toBe(SLOT_REASON.overdue);
    expect(plan.items[0].reason).toBe(NEW_EXERCISE_REASON);
    expect(plan.items.every((it) => it.reason !== SLOT_REASON.overdue)).toBe(true);

    // In English
    setLocale('en');
    expect(planReasonText(plan.items[0].reason)).toBe('New exercise — first try');
    expect(planReasonText(plan.items[0].reason)).not.toBe('Interval is up — time to review');
    setLocale('ru');

    // User played playedId 2 days ago, and another exercise yesterday (maintaining streak, no gap)
    const now = Date.now();
    const playedId = plan.items[0].exerciseId;
    recordDay([{ exerciseId: playedId }], now - 2 * DAY, 1);
    recordDay([{ exerciseId: 'grid-memory' }], now - 1 * DAY, 2);

    const nextPlan = planToday({ nowMs: now });
    const overdueItem = nextPlan.items.find((it) => it.exerciseId === playedId);
    expect(overdueItem).toBeDefined();
    expect(overdueItem?.reason).toBe(SLOT_REASON.overdue);

    setLocale('en');
    expect(planReasonText(overdueItem?.reason)).toBe('Interval is up — time to review');
    setLocale('ru');
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

  test('first week after calibration: header focus and «Акцент дня» only name areas the plan trains', () => {
    const now = Date.now();
    for (const goal of ['balance', 'attention', 'speed', 'memory']) {
      (storage as any).backend = new MockStorage();
      storage.reset();
      document.body.innerHTML = '<div id="app"></div>';
      calibratedUser(300);
      const p = storage.getProfile();
      p.primaryGoal = goal as any;
      p.firstWeekPlan = buildFirstWeekPlan({ primaryGoal: goal, sessionLengthSec: 300, startDate: new Date(now).toISOString() });
      storage.setProfile(p);
      // Calibration probes, incl. a non-core speed probe.
      for (const id of ['odd-one', 'grid-memory', 'stroop', 'pattern-next', 'reaction-strike']) {
        const m = registry.find((r) => r.manifest.id === id)!.manifest;
        recordEngineObservation({ exerciseId: id, domain: m.domain as any, skills: [...m.skills], metricModel: (m.metricModel || 'speed-accuracy') as any,
          difficulty: 3, accuracy: 0.7, avgRtMs: 900, targetMs: 1500, performance: 0.6, rounds: 6, probe: true } as any, now - 60_000);
      }
      markEngineCalibrated(now - 30_000);
      const plan = planToday();
      const app = document.getElementById('app')!;
      renderToday(app);
      const chipDomains = new Set([...app.querySelectorAll<HTMLElement>('.workout-chip[data-exercise-id]')].map((el) => domainOf.get(el.dataset.exerciseId!)));
      const doms = plan.items.map((i) => i.domain);
      expect(new Set(doms).size).toBeGreaterThanOrEqual(goal === 'balance' ? doms.length : doms.length - 1);
      const header = app.querySelector<HTMLElement>('[data-plan-focus]');
      if (header) for (const d of header.dataset.planFocus!.split(',').filter(Boolean)) expect(chipDomains.has(d as any)).toBe(true);
      const allowed = new Set([...chipDomains].map((d) => domainLabel(d as string)));
      const text = app.textContent || '';
      for (const m of text.matchAll(/Акцент дня: ([^.]+)\./g)) {
        for (const name of m[1].split(/ \+ | и /)) expect(allowed.has(name.trim())).toBe(true);
      }
    }
  });
});
