import { expect, test } from 'vitest';
import { weeklyReviewMoscowWindow } from '../src/ui/screens/weekly-review';

test('weeklyReviewMoscowWindow: UTC evening maps to next Moscow civil day', () => {
  // 2026-10-28 21:30 UTC = 2026-10-29 00:30 Europe/Moscow
  const now = new Date('2026-10-28T21:30:00.000Z');
  const win = weeklyReviewMoscowWindow(now);

  expect(win.toKey).toBe('2026-10-29');
  expect(win.fromKey).toBe('2026-10-22');
  expect(win.periodLabel).toMatch(/22/);
  expect(win.periodLabel).toMatch(/29/);
  expect(win.periodLabel).toContain('—');
});

test('weeklyReviewMoscowWindow: still previous Moscow day before midnight', () => {
  // 2026-10-28 20:30 UTC = 2026-10-28 23:30 Europe/Moscow
  const beforeMidnight = new Date('2026-10-28T20:30:00.000Z');
  const win = weeklyReviewMoscowWindow(beforeMidnight);

  expect(win.toKey).toBe('2026-10-28');
  expect(win.fromKey).toBe('2026-10-21');
});

test('weeklyReviewMoscowWindow: afternoon UTC same Moscow calendar day', () => {
  const now = new Date('2026-09-06T12:00:00.000Z');
  const win = weeklyReviewMoscowWindow(now);

  expect(win.toKey).toBe('2026-09-06');
  expect(win.fromKey).toBe('2026-08-30');
});
