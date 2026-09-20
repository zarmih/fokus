import { expect, test, beforeEach } from 'vitest';
import { storage } from '../src/core/storage';
import { renderProgress } from '../src/ui/screens/progress';
import { renderSettings } from '../src/ui/screens/settings';
import { addCalendarDays, calendarDayKey, resolveFokusTimeZone } from '../src/core/streak';
import { renderContinuityHint } from '../src/ui/components/habit-continuity';

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

test('continuity hint: soft_return shows actionable next step in Russian', () => {
  const snap = {
    streak: { status: 'soft_return', current: 0, longest: 5, openMisses: 2, daysSinceLastPlay: 2, playedToday: false, lastPlayedDay: '2026-09-08' },
    weekly: { score: 0, gapCount: 1, eligibleDays: 7, completedDays: 5, sufficient: true },
    ritual: { openMisses: 2, familiarDomains: ['memory', 'attention'], targetDurationSec: 180, isGentle: true },
    timeZoneSource: 'explicit',
    timeZone: 'Europe/Moscow'
  } as any;
  const html = renderContinuityHint(snap, 'today');
  expect(html).toMatch(/Пауза 2 дня — это нормально/);
  expect(html).toMatch(/Ваш следующий шаг: короткий блок: Память и Внимание/);
  expect(html).toMatch(/чтобы легко вернуться в ритм/);
});

test('continuity hint: fresh_start shows actionable next step', () => {
  const snap = {
    streak: { status: 'fresh_start', current: 0 },
    weekly: { sufficient: false },
    ritual: { openMisses: 5, familiarDomains: [] },
    timeZoneSource: 'explicit'
  } as any;
  const html = renderContinuityHint(snap, 'today');
  expect(html).toMatch(/Новый заход/);
  expect(html).toMatch(/Следующий шаг: пройдите сегодняшнюю сессию/);
});

test('continuity hint: returned status protects truthful streak semantics', () => {
  const snap = {
    streak: { status: 'returned', current: 4 },
    weekly: { sufficient: false },
    ritual: { openMisses: 0, familiarDomains: [] },
    timeZoneSource: 'explicit'
  } as any;
  const html = renderContinuityHint(snap, 'today');
  expect(html).toMatch(/С возвращением! Серия снова 4/);
  expect(html).toMatch(/честный отсчёт, без купленной заморозки/);
});

test('continuity hint: active streak shows correct open state', () => {
  const snap = {
    streak: { status: 'open', current: 6 },
    weekly: { sufficient: false },
    ritual: { openMisses: 0, familiarDomains: [] },
    timeZoneSource: 'explicit'
  } as any;
  const html = renderContinuityHint(snap, 'today');
  expect(html).toMatch(/Серия 6 дней пока жива/);
  expect(html).toMatch(/сегодняшний ритуал её продолжит/);
});

