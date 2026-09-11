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

test('renderWeeklyReview - empty week', () => {
  const container = document.getElementById('app')!;
  renderWeeklyReview(container);
  const html = container.innerHTML;
  
  expect(html).toContain('Недостаточно данных');
  expect(html).not.toContain('Что изменилось');
  // No fake precision
  expect(html).not.toContain('Уровень освоения');
});

test('renderWeeklyReview - insufficient evidence (1 session)', () => {
  const container = document.getElementById('app')!;
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-05T10:00:00Z',
    finishedAt: '2026-09-05T10:05:00Z',
    durationSec: 300,
    items: [
      {
        exerciseId: 'grid-memory',
        level: 1,
        accuracy: 0.8,
        avgRtMs: 1200,
        score: 50,
        masteryBefore: 10,
        masteryAfter: 15,
        difficultyBefore: 1.0,
        difficultyAfter: 1.2,
        confidenceAfter: 10 // Low confidence
      }
    ]
  });
  
  storage.addDaySummary({
    date: '2026-09-05T10:00:00Z',
    totalScore: 50,
    domainDeltas: {},
    streak: 1,
    skipped: false
  });

  renderWeeklyReview(container);
  const html = container.innerHTML;
  
  expect(html).toContain('1</div>'); // 1 day
  expect(html).toContain('Пока недостаточно подтверждённых изменений.'); // Honest message
  expect(html).not.toContain('вырос на 5'); // Delta not shown due to low conf
});

test('renderWeeklyReview - real aggregation, mastery and difficulty delta', () => {
  const container = document.getElementById('app')!;
  
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-02T10:00:00Z',
    finishedAt: '2026-09-02T10:05:00Z',
    durationSec: 300,
    items: [
      {
        exerciseId: 'math-sprint',
        level: 3,
        accuracy: 0.9,
        avgRtMs: 1000,
        score: 100,
        masteryBefore: 40,
        masteryAfter: 50,
        difficultyBefore: 3.0,
        difficultyAfter: 3.1,
        confidenceAfter: 80
      },
      {
        exerciseId: 'grid-memory',
        level: 1,
        accuracy: 0.9,
        avgRtMs: 1000,
        score: 100,
        masteryBefore: 10,
        masteryAfter: 12,
        difficultyBefore: 1.0,
        difficultyAfter: 1.5,
        confidenceAfter: 80
      }
    ]
  });
  
  storage.addDaySummary({
    date: '2026-09-02T10:00:00Z',
    totalScore: 200,
    domainDeltas: {},
    streak: 1,
    skipped: false
  });

  renderWeeklyReview(container);
  const html = container.innerHTML;
  
  expect(html).toContain('Арифметика');
  expect(html).toContain('вырос на 10'); // mDelta for math-sprint
  expect(html).toContain('повысил сложность');
  expect(html).toContain('Матрица');
  expect(html).toContain('на 0.5'); // dDelta for grid-memory
});

test('renderWeeklyReview - rolling time boundaries', () => {
  const container = document.getElementById('app')!;
  
  // Outside of 7-day window
  storage.addSession({
    id: 's0',
    startedAt: '2026-08-25T10:00:00Z',
    finishedAt: '2026-08-25T10:05:00Z',
    durationSec: 300,
    items: [{
      exerciseId: 'stroop', level: 2, accuracy: 1, avgRtMs: 1000, score: 50,
      masteryBefore: 20, masteryAfter: 40, difficultyBefore: 2, difficultyAfter: 3, confidenceAfter: 100
    }]
  });
  
  // Inside 7-day window
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-05T10:00:00Z',
    finishedAt: '2026-09-05T10:05:00Z',
    durationSec: 300,
    items: [{
      exerciseId: 'grid-memory', level: 1, accuracy: 1, avgRtMs: 1000, score: 50,
      masteryBefore: 10, masteryAfter: 15, difficultyBefore: 1, difficultyAfter: 1.2, confidenceAfter: 50
    }]
  });

  renderWeeklyReview(container);
  const html = container.innerHTML;
  
  // Should not see Stroop
  expect(html).not.toContain('Струпа');
  // Should see Grid Memory
  expect(html).toContain('вырос на 5');
});

test('renderWeeklyReview - legacy data handling', () => {
  const container = document.getElementById('app')!;
  
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-05T10:00:00Z',
    finishedAt: '2026-09-05T10:05:00Z',
    durationSec: 300,
    items: [
      {
        exerciseId: 'sequence',
        level: 2,
        accuracy: 0.8,
        avgRtMs: 1000,
        score: 25
      } as any // No masteryBefore/After or confidence
    ]
  });
  
  storage.addDaySummary({
    date: '2026-09-05T10:00:00Z',
    totalScore: 25,
    domainDeltas: {},
    streak: 1,
    skipped: false
  });

  renderWeeklyReview(container);
  const html = container.innerHTML;
  
  // Should not crash, should show 1 session, but no fake changes
  expect(html).toContain('1</div>'); // 1 session
  expect(html).toContain('Пока недостаточно подтверждённых изменений');
});

test('renderWeeklyReview - intel panel from 14-day model', () => {
  const container = document.getElementById('app')!;
  const p = storage.getProfile();
  p.calibrated = true;
  storage.setProfile(p);
  storage.setDomains([
    { domain: 'attention', value: 760, updatedAt: '2026-09-06' },
    { domain: 'memory', value: 310, updatedAt: '2026-09-06' }
  ]);

  const dates = [
    '2026-08-30',
    '2026-08-31',
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
    '2026-09-05',
    '2026-09-06'
  ];
  dates.forEach((d, i) => {
    storage.addDaySummary({
      date: `${d}T10:00:00Z`,
      totalScore: 80 + i,
      domainDeltas: { memory: 3 },
      streak: i + 1,
      skipped: false,
      fokusIndex: 400 + i * 4,
      domainValues: { attention: 700, memory: 280 + i * 4 }
    });
    storage.addSession({
      id: `s-${d}`,
      startedAt: `${d}T10:00:00Z`,
      finishedAt: `${d}T10:05:00Z`,
      durationSec: 300,
      items: [{
        exerciseId: 'grid-memory',
        level: 2,
        accuracy: 0.9,
        avgRtMs: 900,
        score: 80,
        masteryBefore: 20,
        masteryAfter: 22,
        difficultyBefore: 2,
        difficultyAfter: 2,
        confidenceAfter: 50
      }]
    });
  });

  renderWeeklyReview(container);
  const html = container.innerHTML;
  expect(html).toContain('Fokus Index');
  expect(html).toContain('14 дней');
  expect(html).toContain('30 дней');
  expect(html).toContain('Коуч недели');
  expect(html).toContain('Память');
  expect(html).toContain('intel-miles');
  expect(html).toContain('рекорд');
  expect(html).toMatch(/Зона роста|Привычка|дней подряд|Ритм/);
  expect(container.querySelector('#intel-win-30')).toBeTruthy();

  (container.querySelector('#intel-win-30') as HTMLButtonElement).click();
  expect(container.querySelector('[data-window="30"]')).toBeTruthy();
  expect(container.innerHTML).toContain('30 дней');
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
  expect(container.innerHTML).toContain('Недостаточно данных');
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

test('renderWeeklyReview - plateau surfaced', () => {
  const container = document.getElementById('app')!;
  
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-05T10:00:00Z',
    finishedAt: '2026-09-05T10:05:00Z',
    durationSec: 300,
    items: [
      {
        exerciseId: 'odd-one',
        level: 3,
        accuracy: 0.8,
        avgRtMs: 1000,
        score: 50,
        masteryBefore: 60,
        masteryAfter: 60, // Delta 0
        difficultyBefore: 3.0,
        difficultyAfter: 3.0,
        confidenceAfter: 80 // High conf
      }
    ]
  });
  
  storage.addDaySummary({
    date: '2026-09-05T10:00:00Z',
    totalScore: 50,
    domainDeltas: {},
    streak: 1,
    skipped: false
  });

  renderWeeklyReview(container);
  const html = container.innerHTML;
  
  expect(html).toContain('стабилен');
});
