import { expect, test, beforeEach } from 'vitest';
import { storage } from '../src/core/storage';
import { renderProgress } from '../src/ui/screens/progress';
import { renderSettings } from '../src/ui/screens/settings';
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

test('stats wires one streak chip and one continuity hint', () => {
  const app = document.getElementById('app')!;
  renderProgress(app);
  expect(app.querySelectorAll('.habit-chip').length).toBeGreaterThanOrEqual(1);
  expect(app.querySelector('.continuity-hint')).toBeTruthy();
  expect(app.textContent).toMatch(/Непрерывность/);
  expect(app.textContent).not.toMatch(/прокачать IQ|streak freeze|купите заморозку/i);
});

test('settings explains honest streak, timezone, and no freeze paywall', () => {
  const tz = resolveFokusTimeZone();
  const today = calendarDayKey(new Date(), tz.timeZone);
  storage.addDaySummary({
    date: addCalendarDays(today, -1),
    totalScore: 90,
    domainDeltas: { attention: 1 },
    streak: 4,
    skipped: false
  });

  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.querySelector('.habit-chip')).toBeTruthy();
  expect(app.textContent).toMatch(/Серия и непрерывность/);
  expect(app.textContent).toMatch(/Europe\/Moscow|UTC/);
  expect(app.textContent).toMatch(/заморозк/);
  expect(app.textContent).toMatch(/0 до 1|0–1|от 0 до 1/);
  expect(app.textContent).not.toMatch(/купите заморозку|brain age|Lumosity|Wikium|Elevate|Peak|NeuroNation/i);
});
