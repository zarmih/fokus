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
