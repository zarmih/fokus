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
