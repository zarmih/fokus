import { expect, test, beforeEach } from 'vitest';
import { renderToday } from '../src/ui/screens/today';
import { storage } from '../src/core/storage';
import { addCalendarDays, calendarDayKey, resolveFokusTimeZone } from '../src/core/streak';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
});

test('today shows calibration CTA before first session', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = false;
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Калибровка/);
  expect(app.textContent).toMatch(/Коуч/);
  expect(app.querySelector('#btn-start')).toBeTruthy();
  expect(app.querySelector('.workout-card.fx-enter')).toBeTruthy();
  expect(app.querySelectorAll('.ritual-fill').length).toBeGreaterThan(0);
});

test('today shows a rhythm line after a gap, without churn-panic copy', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  storage.setProfile(p);
  const last = new Date();
  last.setDate(last.getDate() - 4);
  storage.addDaySummary({
    date: last.toISOString(),
    totalScore: 90,
    domainDeltas: { attention: 5 },
    streak: 3,
    skipped: false
  });
  storage.setDomains([
    { domain: 'attention', value: 700, trend: 0, updatedAt: last.toISOString() }
  ]);

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Ритм/);
  expect(app.querySelector('[data-rhythm]')).toBeTruthy();
  expect(app.textContent).not.toMatch(/churn|не пропусти|прокачай мозг/i);
});

test('today shows first-week strip and transfer framing after probe', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.primaryGoal = 'memory';
  p.firstWeekPlan = {
    startDate: new Date().toISOString().slice(0, 10),
    targetSessionSec: 480,
    primaryGoal: 'memory',
    skipPolicy: 'one-forgiven',
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      durationSec: i < 2 ? 300 : 480,
      focusDomains: ['memory'] as const,
      intensity: i < 2 ? 'gentle' as const : 'full' as const,
      label: 'Ритм'
    }))
  };
  p.probeSnapshot = {
    completedAt: new Date().toISOString(),
    durationSec: 72,
    blocks: [],
    domains: [],
    overallTheta: 0,
    overallPrecision: 2,
    disclaimer: 'not-iq'
  };
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Первая неделя/);
  expect(app.textContent).toMatch(/Навёрстывать/);
  expect(app.textContent).toMatch(/Где это встречается/);
  expect(app.textContent).not.toMatch(/IQ-тест|прокачать мозг/i);
});

test('today shows Fokus Index and workout after calibration', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.displayName = 'Михаил';
  p.sessionLengthSec = 300;
  storage.setProfile(p);
  storage.setDomains([
    { domain: 'attention', value: 720, trend: 12, updatedAt: new Date().toISOString() },
    { domain: 'memory', value: 540, trend: -2, updatedAt: new Date().toISOString() }
  ]);

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Михаил/);
  expect(app.textContent).toMatch(/Fokus Index/);
  expect(app.textContent).toMatch(/Тренировка дня/);
  expect(app.textContent).toMatch(/Начать сессию/);
  expect(app.textContent).not.toMatch(/Качество ритуала/);
  expect(app.textContent).not.toMatch(/балл мозга/i);
  expect(app.textContent).toMatch(/Непрерывность/);
  expect(app.querySelector('.habit-chip')).toBeTruthy();
  expect(app.querySelector('.continuity-hint')).toBeTruthy();
});

test('today empty history shows a quiet continuity hint, not a fake freeze', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = false;
  storage.setProfile(p);
  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/ритм привычки|нет серии/i);
  expect(app.textContent).not.toMatch(/заморозить серию|не потеряйте|прокачать IQ|купите заморозку/i);
});

test('today shows quality trend and a shorter recovery ritual after hard sessions', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 720;
  storage.setProfile(p);

  for (let i = 0; i < 4; i++) {
    const t = Date.now() - (4 - i) * 86400000;
    storage.addSession({
      id: `hard-${i}`,
      startedAt: new Date(t).toISOString(),
      finishedAt: new Date(t + 12 * 60 * 1000).toISOString(),
      durationSec: 700,
      plannedDurationSec: 720,
      items: [
        { exerciseId: 'grid-memory', level: 14, accuracy: 0.44, avgRtMs: 1100, score: 20 },
        { exerciseId: 'stroop', level: 13, accuracy: 0.4, avgRtMs: 1500, score: 18 },
        { exerciseId: 'odd-one', level: 12, accuracy: 0.42, avgRtMs: 1700, score: 16 }
      ]
    });
  }

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Качество ритуала/);
  expect(app.textContent).toMatch(/Сегодня легче|Сегодня короче/);
  expect(app.textContent).toMatch(/5 минут/);
  expect(app.textContent).not.toMatch(/IQ/);
  expect(app.querySelector('.quality-card')?.getAttribute('aria-label')).toBeTruthy();
});

test('today shows ability trend chip and ritual why after enough sessions', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 300;
  storage.setProfile(p);
  storage.setDomains([
    { domain: 'attention', value: 820, trend: 10, updatedAt: new Date().toISOString() },
    { domain: 'memory', value: 420, trend: -6, updatedAt: new Date().toISOString() }
  ]);
  const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  storage.addSession({
    id: 's1',
    startedAt: day(4),
    finishedAt: day(4),
    durationSec: 300,
    items: [
      { exerciseId: 'grid-memory', level: 3, accuracy: 0.55, avgRtMs: 1800, score: 20, difficultyBefore: 3 },
      { exerciseId: 'stroop', level: 5, accuracy: 0.9, avgRtMs: 900, score: 60, difficultyBefore: 5 }
    ]
  });
  storage.addSession({
    id: 's2',
    startedAt: day(1),
    finishedAt: day(1),
    durationSec: 300,
    items: [
      { exerciseId: 'grid-memory', level: 3, accuracy: 0.6, avgRtMs: 1700, score: 22, difficultyBefore: 3 },
      { exerciseId: 'stroop', level: 6, accuracy: 0.92, avgRtMs: 850, score: 70, difficultyBefore: 6 }
    ]
  });

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.querySelector('.ability-trend-chip')).toBeTruthy();
  expect(app.querySelector('.ability-trend-chip')?.getAttribute('aria-label')).toMatch(/Тренд способности/);
  expect(app.querySelector('.ritual-why')).toBeTruthy();
  expect(app.textContent).not.toMatch(/IQ/i);
});

test('today 1-day gap offers a shorter familiar return, not a continued streak', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 720;
  storage.setProfile(p);
  storage.setDomains([
    { domain: 'memory', value: 540, trend: 0, updatedAt: new Date().toISOString() }
  ]);

  const today = calendarDayKey(new Date(), resolveFokusTimeZone().timeZone);
  const twoAgo = addCalendarDays(today, -2);
  storage.addDaySummary({
    date: twoAgo,
    totalScore: 120,
    domainDeltas: { memory: 3 },
    streak: 6,
    skipped: false
  });
  storage.addSession({
    id: 's1',
    startedAt: `${twoAgo}T10:00:00`,
    finishedAt: `${twoAgo}T10:06:00`,
    durationSec: 300,
    items: [{ exerciseId: 'grid-memory', level: 2, accuracy: 0.9, avgRtMs: 400, score: 80 }]
  });

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Мягкий возврат/);
  expect(app.textContent).toMatch(/5 минут/);
  expect(app.textContent).not.toMatch(/Тренировка дня/);
  expect(app.querySelector('.habit-chip')?.getAttribute('data-status')).toBe('soft_return');
  expect(app.textContent).not.toMatch(/не потеряйте|купить заморозку/i);
});

test('today shows a re-probe due hint for an idle trainer without rewriting weekly copy', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 300;
  storage.setProfile(p);
  storage.setDomains([
    { domain: 'memory', value: 640, trend: 0, updatedAt: new Date().toISOString() },
    { domain: 'attention', value: 700, trend: 0, updatedAt: new Date().toISOString() }
  ]);
  const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const item = { exerciseId: 'grid-memory', level: 6, accuracy: 0.93, avgRtMs: 750, score: 80, difficultyBefore: 6 };
  storage.addSession({
    id: 'old-1',
    startedAt: day(18),
    finishedAt: day(18),
    durationSec: 300,
    items: [item]
  });
  storage.addSession({
    id: 'old-2',
    startedAt: day(16),
    finishedAt: day(16),
    durationSec: 300,
    items: [item]
  });
  storage.addDaySummary({
    date: day(16).slice(0, 10),
    totalScore: 80,
    domainDeltas: { memory: 2 },
    streak: 2,
    skipped: false
  });

  const app = document.getElementById('app')!;
  renderToday(app);
  const hint = app.querySelector('.reprobe-hint');
  expect(hint).toBeTruthy();
  expect(hint?.getAttribute('data-reprobe')).toBe('due');
  expect(hint?.getAttribute('role')).toBe('status');
  expect(app.textContent).toMatch(/Пора освежить/);
  expect(app.textContent).toMatch(/Матрица/);
  expect(app.textContent).not.toMatch(/IQ|NeuroScore|Wikium|Elevate|Lumosity/i);
  expect(app.textContent).not.toMatch(/Итоги недели|недельный обзор/i);
});
