import { expect, test, beforeEach } from 'vitest';
import { renderToday } from '../src/ui/screens/today';
import { storage } from '../src/core/storage';

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
});

test('today shows quality trend and a shorter recovery ritual after hard sessions', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 720;
  storage.setProfile(p);

  for (let i = 0; i < 4; i++) {
    const day = String(7 + i).padStart(2, '0');
    storage.addSession({
      id: `hard-${i}`,
      startedAt: `2026-09-${day}T18:00:00.000Z`,
      finishedAt: `2026-09-${day}T18:12:00.000Z`,
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
