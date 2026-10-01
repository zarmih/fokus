import { expect, test, beforeEach } from 'vitest';
import { renderProgress } from '../src/ui/screens/progress';
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

test('progress stays quiet without enough rhythm data', () => {
  renderProgress(document.getElementById('app')!);
  expect(document.body.textContent).not.toMatch(/churn/i);
  expect(document.querySelector('.rhythm-card')).toBeNull();
});

test('progress shows rhythm signals after a few sessions', () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString(),
      totalScore: 100,
      domainDeltas: { attention: 4, memory: 2 },
      streak: 7 - i,
      skipped: false
    });
  }
  days.forEach((d) => storage.addDaySummary(d));
  storage.setDomains([
    { domain: 'attention', value: 720, trend: 4, updatedAt: days[6].date },
    { domain: 'memory', value: 500, trend: -2, updatedAt: days[0].date }
  ]);
  storage.setProfile({ ...storage.getProfile(), calibrated: true, onboarded: true });

  renderProgress(document.getElementById('app')!);
  expect(document.querySelector('.rhythm-card')).toBeTruthy();
  expect(document.body.textContent).toMatch(/Ритм тренировок/);
  expect(document.body.textContent).toMatch(/Регулярность/);
  expect(document.body.textContent).not.toMatch(/нейрофитнес|прокачай мозг/i);
});

test('progress rhythm card uses shared today-plan story (same body family as Today/Coach)', () => {
  const days = [];
  for (let i = 8; i >= 2; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString(),
      totalScore: 110,
      domainDeltas: { attention: 5, memory: 1 },
      streak: 1,
      skipped: false
    });
  }
  days.forEach((d) => storage.addDaySummary(d));
  // Last play a few days ago → recovery/retention path, not empty cold start
  const last = days[days.length - 1].date;
  storage.setDomains([
    { domain: 'attention', value: 740, trend: 3, updatedAt: last },
    { domain: 'memory', value: 480, trend: -2, updatedAt: days[0].date },
    { domain: 'speed', value: 600, trend: 0, updatedAt: last },
    { domain: 'flexibility', value: 580, trend: 0, updatedAt: last },
    { domain: 'logic', value: 560, trend: 0, updatedAt: last }
  ]);
  storage.addSession({
    id: 's-gap',
    startedAt: last,
    finishedAt: last,
    durationSec: 300,
    items: [{ exerciseId: 'stroop', level: 2, accuracy: 0.9, avgRtMs: 500, score: 80 }]
  });
  storage.setProfile({ ...storage.getProfile(), calibrated: true, onboarded: true, sessionLengthSec: 600 });

  renderProgress(document.getElementById('app')!);
  const card = document.querySelector('.rhythm-card') as HTMLElement | null;
  expect(card).toBeTruthy();
  expect(card!.getAttribute('data-plan-source')).toBeTruthy();
  expect(card!.getAttribute('data-rhythm')).toBeTruthy();
  expect(document.querySelector('.rhythm-nudge')).toBeTruthy();
  expect(document.querySelector('.rhythm-nudge-title')).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/нейрофитнес|прокачай мозг|не пропусти|IQ-тест/i);
  // Shared story copy is present (title or body from explainTodayPlan)
  const title = document.querySelector('.rhythm-nudge-title')?.textContent || '';
  const body = document.querySelector('.rhythm-nudge')?.textContent || '';
  expect(title.length + body.length).toBeGreaterThan(20);
});
