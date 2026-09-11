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
