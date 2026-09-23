import { expect, test, beforeEach, vi } from 'vitest';
import { renderResult } from '../src/ui/screens/result';
import { storage } from '../src/core/storage';
import { registry } from '../src/exercises/registry';
import type { Session, SessionItem } from '../src/core/types';

beforeEach(() => {
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
});

test('renderResult Mastery Progression UI v1 - basic provenance', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      {
        exerciseId: 'grid-memory',
        level: 3,
        accuracy: 0.9,
        avgRtMs: 1200,
        score: 45,
        performance: 450,
        masteryBefore: 20,
        masteryAfter: 25,
        difficultyBefore: 3.0,
        difficultyAfter: 3.2,
        confidenceAfter: 80,
        progressionState: 'up'
      }
    ]
  };

  renderResult(container, { session });
  
  const html = container.innerHTML;
  
  // Data provenance
  expect(html).toContain('Матрица'); // Result=Registry
  expect(html).toContain('Форма 450');
  expect(html).toContain('25'); // masteryAfter
  expect(html).toContain('(+5)'); // mastery delta
  expect(html).toContain('3.2'); // difficultyAfter
  expect(html).toContain('(+0.2)'); // difficulty delta
  expect(html).toContain('80%'); // confidence
  expect(html).toContain('📈 Растёт'); // progression boundaries up
  
  // Next-step provenance (engine v2 reasons, with legacy-heuristic fallback)
  expect(html).toContain('Дальше:');
  expect(html).toMatch(/Интервал|Слот|стимул|области|цели|Сбалансированная|навыка|Забытый|Рабочий темп|Короткая разминка/);
});

test('renderResult - mastery delta zero / plateau / low confidence', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-2',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      {
        exerciseId: 'math-sprint',
        level: 5,
        accuracy: 0.8,
        avgRtMs: 1500,
        score: 30,
        performance: 300,
        masteryBefore: 40,
        masteryAfter: 40,
        difficultyBefore: 5.0,
        difficultyAfter: 5.0,
        confidenceAfter: 10, // Low confidence
        progressionState: 'plateau'
      }
    ]
  };

  renderResult(container, { session });
  
  const html = container.innerHTML;
  expect(html).toContain('(=)'); // Zero delta
  expect(html).toContain('🔄 Калибровка'); // forced calibrating state due to low confidence
  expect(html).toContain('10%'); // Low confidence
});

test('renderResult - mastery delta negative / down', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-3',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      {
        exerciseId: 'stroop',
        level: 4,
        accuracy: 0.5,
        avgRtMs: 2000,
        score: 10,
        performance: 100,
        masteryBefore: 50,
        masteryAfter: 45,
        difficultyBefore: 4.5,
        difficultyAfter: 4.0,
        confidenceAfter: 100,
        progressionState: 'down'
      }
    ]
  };

  renderResult(container, { session });
  
  const html = container.innerHTML;
  expect(html).toContain('(-5)'); // negative mastery
  expect(html).toContain('(-0.5)'); // negative difficulty
  expect(html).toContain('📉 Падает'); // down
});

test('renderResult - legacy / empty state (stale snapshot fallback)', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-legacy',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      {
        exerciseId: 'sequence',
        level: 2,
        accuracy: 0.8,
        avgRtMs: 1000,
        score: 25
      } as SessionItem
    ]
  };

  renderResult(container, { session });
  
  const html = container.innerHTML;
  // Should compute default Fallbacks safely
  expect(html).toContain('Форма 250'); // score * 10
  expect(html).toContain('Н/Д'); // No fake precision
  expect(html).toContain('(=)');
  expect(html).toContain('🔄 Калибровка'); // Calibrating for legacy
});

test('renderResult - V6 Next Action - Weak result (suggests repeat/rest)', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-weak',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      { exerciseId: 'stroop', level: 2, accuracy: 0.4, avgRtMs: 2000, score: 10 } as SessionItem,
      { exerciseId: 'grid-memory', level: 2, accuracy: 0.4, avgRtMs: 2000, score: 10 } as SessionItem,
      { exerciseId: 'math-sprint', level: 2, accuracy: 0.4, avgRtMs: 2000, score: 10 } as SessionItem,
    ]
  };

  renderResult(container, { session });
  const html = container.innerHTML;
  expect(html).toContain('Сделать перерыв');
  expect(html).toContain('Точность просела, мозгу нужен отдых');
  expect(html).toContain('Повторить (ещё раз)');
});

test('renderResult - V6 Next Action - Early exit (short session)', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-short',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 60,
    items: [
      { exerciseId: 'stroop', level: 2, accuracy: 0.9, avgRtMs: 1000, score: 30 } as SessionItem
    ]
  };

  renderResult(container, { session });
  const html = container.innerHTML;
  expect(html).toContain('Дальше:');
  expect(html).toContain('Короткая разминка, можно ещё');
  expect(html).toContain('Вернуться позже');
});

test('renderResult - V6 Next Action - Success', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-success',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      { exerciseId: 'stroop', level: 2, accuracy: 0.9, avgRtMs: 1000, score: 30 } as SessionItem,
      { exerciseId: 'grid-memory', level: 2, accuracy: 0.9, avgRtMs: 1000, score: 30 } as SessionItem,
      { exerciseId: 'math-sprint', level: 2, accuracy: 0.9, avgRtMs: 1000, score: 30 } as SessionItem,
    ]
  };

  renderResult(container, { session });
  const html = container.innerHTML;
  expect(html).toContain('Дальше:');
});

test('renderResult - V6 Next Action - No Data', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-empty',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 0,
    items: []
  };

  renderResult(container, { session });
  const html = container.innerHTML;
  expect(html).toContain('Программа');
  expect(html).toContain('Нет данных о тренировке');
  expect(html).not.toContain('Как прошла тренировка?'); // No feedback on empty session
});

test('renderResult - V6 Feedback Loop interactions', () => {
  const container = document.getElementById('app')!;
  const session: Session = {
    id: 'test-session-feedback',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [
      { exerciseId: 'stroop', level: 2, accuracy: 0.8, avgRtMs: 1000, score: 30 } as SessionItem
    ]
  };

  renderResult(container, { session });
  
  const buttons = container.querySelectorAll('.btn-feedback');
  expect(buttons.length).toBe(3);
  
  const easyBtn = Array.from(buttons).find(b => (b as HTMLElement).dataset.val === 'easy') as HTMLButtonElement;
  expect(easyBtn).toBeDefined();
  
  easyBtn.click();
  
  const p = storage.getProfile();
  expect((p as any).lastFeedback.val).toBe('easy');
  expect((p as any).lastFeedback.date).toBeDefined();
  
  const thanks = container.querySelector('#feedback-thanks') as HTMLElement;
  expect(thanks.style.display).toBe('block');
  
  buttons.forEach(b => {
    expect((b as HTMLElement).style.display).toBe('none');
  });
});
