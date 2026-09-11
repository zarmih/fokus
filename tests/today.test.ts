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
  expect(app.querySelector('.rhythm-chip')?.getAttribute('role')).toBe('status');
  expect(app.querySelector('[data-skip]')).toBeTruthy();
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
  expect(app.textContent).toMatch(/Перенос в жизнь/);
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
});
