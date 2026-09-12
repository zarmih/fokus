import { expect, test, beforeEach, vi } from 'vitest';
import { renderWeeklyReview } from '../src/ui/screens/weekly-review';
import { storage } from '../src/core/storage';
import { setLocale } from '../src/core/i18n';
import type { Session, DaySummary, DomainIndex, SkillIndex, ExerciseState } from '../src/core/types';

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
  setLocale('ru');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-06T12:00:00Z'));
});


test('renderWeeklyReview - G18 narrative, domains, streak honesty, local share', () => {
  const container = document.getElementById('app')!;
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-02T10:00:00Z',
    finishedAt: '2026-09-02T10:05:00Z',
    durationSec: 300,
    items: [{
      exerciseId: 'grid-memory', level: 2, accuracy: 0.9, avgRtMs: 900, score: 80,
      masteryBefore: 20, masteryAfter: 24, difficultyBefore: 2, difficultyAfter: 2.1, confidenceAfter: 50
    }]
  });
  storage.addSession({
    id: 's2',
    startedAt: '2026-09-03T10:00:00Z',
    finishedAt: '2026-09-03T10:05:00Z',
    durationSec: 300,
    items: [{
      exerciseId: 'stroop', level: 2, accuracy: 0.8, avgRtMs: 700, score: 70,
      masteryBefore: 20, masteryAfter: 22, difficultyBefore: 2, difficultyAfter: 2, confidenceAfter: 40
    }]
  });
  storage.addSession({
    id: 's3',
    startedAt: '2026-09-04T10:00:00Z',
    finishedAt: '2026-09-04T10:05:00Z',
    durationSec: 300,
    items: [{
      exerciseId: 'grid-memory', level: 2, accuracy: 0.88, avgRtMs: 880, score: 75,
      masteryBefore: 24, masteryAfter: 26, difficultyBefore: 2.1, difficultyAfter: 2.1, confidenceAfter: 55
    }]
  });
  storage.addDaySummary({
    date: '2026-09-02T10:00:00Z', totalScore: 80, domainDeltas: { memory: 6 }, streak: 1, skipped: false
  });
  storage.addDaySummary({
    date: '2026-09-03T10:00:00Z', totalScore: 70, domainDeltas: { attention: 8 }, streak: 2, skipped: false
  });
  storage.addDaySummary({
    date: '2026-09-04T10:00:00Z', totalScore: 75, domainDeltas: { memory: 5 }, streak: 3, skipped: false
  });
  storage.setDomains([
    { domain: 'memory', value: 400, updatedAt: '2026-09-06' },
    { domain: 'attention', value: 720, updatedAt: '2026-09-06' }
  ]);

  renderWeeklyReview(container);
  const html = container.innerHTML;
  expect(container.querySelector('.week-narrative')).toBeTruthy();
  expect(container.querySelector('.week-domains')).toBeTruthy();
  expect(container.querySelector('.week-streak')).toBeTruthy();
  expect(container.querySelector('#btn-week-share')).toBeTruthy();
  expect(html).toContain('Что тренировали');
  expect(html).toContain('Серия без прикрас');
  expect(html).toContain('Память');
  expect(html).toContain('Внимание');
  expect(html).toContain('Сохранить у себя');
  expect(html).toContain('никуда не отправляет');
  expect(container.querySelector('.transfer-card')).toBeTruthy();
  expect(html).not.toMatch(/повышает IQ|прокачает мозг/);
});

test('renderWeeklyReview - empty week still tells an honest empty narrative', () => {
  const container = document.getElementById('app')!;
  renderWeeklyReview(container);
  expect(container.querySelector('[data-voice="empty"]')).toBeTruthy();
  expect(container.querySelector('[data-honesty="empty"]')).toBeTruthy();
  expect(container.querySelector('#btn-week-share')).toBeNull();
  expect(container.innerHTML).toContain('Сессий не было');
});

test('renderWeeklyReview - EN chrome on G18 blocks', () => {
  setLocale('en');
  const container = document.getElementById('app')!;
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-06T10:00:00Z',
    finishedAt: '2026-09-06T10:05:00Z',
    durationSec: 300,
    items: [{
      exerciseId: 'grid-memory', level: 1, accuracy: 0.8, avgRtMs: 1000, score: 40,
      masteryBefore: 10, masteryAfter: 12, difficultyBefore: 1, difficultyAfter: 1, confidenceAfter: 30
    }]
  });
  storage.addDaySummary({
    date: '2026-09-06T10:00:00Z', totalScore: 40, domainDeltas: { memory: 3 }, streak: 1, skipped: false
  });
  renderWeeklyReview(container);
  expect(container.innerHTML).toMatch(/Week in review/);
  expect(container.innerHTML).toMatch(/What you trained/);
  expect(container.innerHTML).toMatch(/Streak, honestly/);
  expect(container.querySelector('#btn-week-share')?.textContent).toMatch(/Download card/);
  setLocale('ru');
});

