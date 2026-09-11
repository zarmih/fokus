import { expect, test, beforeEach } from 'vitest';
import { renderToday } from '../src/ui/screens/today';
import { renderProgress } from '../src/ui/screens/progress';
import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';
import { renderTransferCard } from '../src/ui/components/transfer-card';
import { buildTransferSurface } from '../src/core/transfer-insights';
import type { Session } from '../src/core/types';

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

function seedPlayedWeek() {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  storage.setProfile(p);
  storage.setDomains([
    { domain: 'memory', value: 360, trend: -4, updatedAt: '2026-09-10T00:00:00Z' },
    { domain: 'attention', value: 780, trend: 6, updatedAt: '2026-09-10T00:00:00Z' },
    { domain: 'speed', value: 620, trend: 1, updatedAt: '2026-09-10T00:00:00Z' }
  ]);
  const session: Session = {
    id: 's1',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      { exerciseId: 'grid-memory', level: 2, accuracy: 0.6, avgRtMs: 1400, score: 20 },
      { exerciseId: 'n-back', level: 2, accuracy: 0.58, avgRtMs: 1500, score: 18 }
    ]
  };
  storage.addSession(session);
  storage.addSession({
    ...session,
    id: 's0',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    finishedAt: new Date(Date.now() - 86400000).toISOString()
  });
  storage.addDaySummary({
    date: new Date(Date.now() - 86400000).toISOString(),
    totalScore: 70,
    domainDeltas: { attention: 30, memory: 4 },
    streak: 1,
    skipped: false
  });
  storage.addDaySummary({
    date: new Date().toISOString(),
    totalScore: 40,
    domainDeltas: { attention: 28, memory: 3 },
    streak: 2,
    skipped: false
  });
}

test('today shows one transfer insight card and a life-skill tip', () => {
  seedPlayedWeek();
  const app = document.getElementById('app')!;
  renderToday(app);
  const card = app.querySelector('.transfer-card');
  expect(card).toBeTruthy();
  expect(card?.getAttribute('aria-labelledby')).toBe('transfer-card-title');
  expect(app.querySelectorAll('.transfer-card').length).toBe(1);
  expect(app.textContent).toMatch(/Где это встречается/);
  expect(app.textContent).not.toMatch(/повышает IQ|станет гением/i);
});

test('stats screen shows the week transfer card', () => {
  seedPlayedWeek();
  const app = document.getElementById('app')!;
  renderProgress(app);
  expect(app.querySelector('.transfer-card')).toBeTruthy();
  expect(app.textContent).toMatch(/Навык в жизни|Где это встречается/);
});

test('settings guide lists honest non-claims and everyday situations', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  const card = app.querySelector('.transfer-card--guide');
  expect(card).toBeTruthy();
  expect(app.textContent).toMatch(/Что тренируем — и чего не обещаем/);
  expect(app.textContent).toMatch(/не оценка интеллекта/i);
  expect(app.textContent).toMatch(/Память/);
  expect(app.textContent).toMatch(/Внимание/);
  expect(app.textContent).toMatch(/Гибкость/);
});

test('transfer card markup is labelled and does not require motion', () => {
  const surface = buildTransferSurface({
    sessions: [],
    daySummaries: [],
    domains: [],
    now: new Date('2026-09-10T12:00:00Z')
  });
  const html = renderTransferCard(surface);
  expect(html).toContain('aria-labelledby="transfer-card-title"');
  expect(html).toContain('transfer-card');
  expect(html).not.toContain('animation:');
  expect(html).toMatch(/Пока рано судить/);
});
