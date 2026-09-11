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
