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
  expect(app.textContent).toMatch(/Перенос в жизнь/);
  expect(app.textContent).not.toMatch(/IQ-тест|прокачать мозг/i);
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function seedFortnight(opts?: { hide?: boolean }) {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.hideLongitudinalCoach = opts?.hide;
  storage.setProfile(p);
  const days = [4, 3, 2, 1, 0].map(daysAgo);
  days.forEach((date, i) => {
    storage.addSession({
      id: `long-${i}`,
      startedAt: `${date}T10:00:00Z`,
      finishedAt: `${date}T10:05:00Z`,
      durationSec: 300,
      items: [{ exerciseId: 'grid-memory', level: 1, accuracy: 0.8, avgRtMs: 900, score: 70 }]
    });
    storage.addDaySummary({
      date: `${date}T10:00:00Z`,
      totalScore: 90,
      domainDeltas: {},
      streak: i + 1,
      skipped: false,
      fokusIndex: 400,
      domainValues: { memory: 400 + (i % 2), attention: 520 + i * 18 }
    });
  });
  storage.setDomains([
    { domain: 'memory', value: 401, trend: 0, updatedAt: `${days[4]}T10:00:00Z` },
    { domain: 'attention', value: 592, trend: 12, updatedAt: `${days[4]}T10:00:00Z` }
  ]);
}

test('today shows the longitudinal coach card after enough sessions', () => {
  seedFortnight();
  const app = document.getElementById('app')!;
  renderToday(app);
  const card = app.querySelector('[data-long-coach]');
  expect(card).toBeTruthy();
  expect(card?.getAttribute('aria-labelledby')).toBe('long-coach-title');
  expect(app.querySelector('#long-coach-title')).toBeTruthy();
  expect(app.querySelector('.long-coach-primary')?.tagName).toBe('H3');
  expect(app.textContent).toMatch(/Коуч · две недели/);
  expect(app.textContent).toMatch(/Память|Фокус двух недель|Форма/);
  expect(app.textContent).not.toMatch(/прокачай|нейрофитнес|IQ-тест/i);
  expect(card?.querySelectorAll('.long-coach-support li').length).toBeLessThanOrEqual(2);
});

test('today stays quiet with a short history and hides the card when toggled', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  storage.setProfile(p);
  storage.addSession({
    id: 'one',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [{ exerciseId: 'grid-memory', level: 1, accuracy: 0.8, avgRtMs: 900, score: 70 }]
  });
  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.querySelector('[data-long-coach]')).toBeNull();

  seedFortnight({ hide: true });
  renderToday(app);
  expect(app.querySelector('[data-long-coach]')).toBeNull();
  expect(app.textContent).toMatch(/Коуч Fokus/);
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
