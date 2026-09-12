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

test('progress shows honest empty state without enough rhythm data', () => {
  renderProgress(document.getElementById('app')!);
  expect(document.body.textContent).not.toMatch(/churn/i);
  expect(document.body.textContent).toMatch(/Анализ ритма будет доступен после нескольких регулярных сессий/i);
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
