import { describe, expect, test, beforeEach } from 'vitest';
import {
  SESSION_FEEDBACK_KEY,
  __resetSessionFeedbackMem,
  addSessionFeedback,
  aggregateSessionFeel,
  emptySessionFeedbackStore,
  entryForSession,
  feelLabelRu,
  loadSessionFeedback,
  parseSessionFeedbackStore,
  serializeSessionFeedbackStore,
  submitSessionFeedback
} from '../src/core/session-feedback';
import { mountSessionFeedback, renderSessionFeelAggregateHtml } from '../src/ui/components/session-feedback';
import { KNOWN_STORES } from '../src/core/privacy';

beforeEach(() => {
  localStorage.clear();
  __resetSessionFeedbackMem();
  document.body.innerHTML = '';
});

describe('session-feedback store', () => {
  test('privacy catalog lists session-feedback key', () => {
    expect(KNOWN_STORES.some((s) => s.key === SESSION_FEEDBACK_KEY)).toBe(true);
  });

  test('add + serialize round-trip; one entry per session', () => {
    let store = emptySessionFeedbackStore();
    store = addSessionFeedback(
      store,
      { sessionId: 's1', feel: 'up', note: '  бодро  ' },
      new Date('2026-10-28T10:00:00+03:00'),
      () => 0.5
    );
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].note).toBe('бодро');
    store = addSessionFeedback(
      store,
      { sessionId: 's1', feel: 'down', note: 'усталость' },
      new Date('2026-10-28T11:00:00+03:00'),
      () => 0.2
    );
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].feel).toBe('down');
    const parsed = parseSessionFeedbackStore(serializeSessionFeedbackStore(store));
    expect(parsed.entries[0].feel).toBe('down');
    expect(parseSessionFeedbackStore('nope').entries).toEqual([]);
  });

  test('aggregate 7-day empty and mixed', () => {
    const empty = aggregateSessionFeel(emptySessionFeedbackStore(), 7, new Date('2026-10-29T12:00:00+03:00'));
    expect(empty.empty).toBe(true);
    expect(empty.summaryRu).toMatch(/нет отметок/i);

    let store = emptySessionFeedbackStore();
    const days = [
      ['2026-10-29T09:00:00+03:00', 'up'],
      ['2026-10-28T09:00:00+03:00', 'down'],
      ['2026-10-27T09:00:00+03:00', 'down'],
      ['2026-10-20T09:00:00+03:00', 'up'] // outside 7d window
    ] as const;
    days.forEach(([iso, feel], i) => {
      store = addSessionFeedback(
        store,
        { sessionId: `s${i}`, feel: feel as 'up' | 'down', note: '' },
        new Date(iso),
        () => 0.1 * (i + 1)
      );
    });
    const agg = aggregateSessionFeel(store, 7, new Date('2026-10-29T12:00:00+03:00'), 'Europe/Moscow');
    expect(agg.total).toBe(3);
    expect(agg.up).toBe(1);
    expect(agg.down).toBe(2);
    expect(agg.empty).toBe(false);
    expect(agg.summaryRu).toMatch(/сложно/i);
  });

  test('io persists to localStorage', () => {
    submitSessionFeedback({ sessionId: 'abc', feel: 'neutral', note: 'ок' });
    __resetSessionFeedbackMem();
    const loaded = loadSessionFeedback();
    expect(entryForSession(loaded, 'abc')?.feel).toBe('neutral');
    expect(feelLabelRu('neutral')).toMatch(/нормально/i);
  });
});

describe('session-feedback UI', () => {
  test('result mount saves feel + note', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let saved: string | null = null;
    mountSessionFeedback(host, {
      sessionId: 'sess-1',
      onSaved: (feel) => {
        saved = feel;
      }
    });
    const down = host.querySelector('[data-feel="down"]') as HTMLButtonElement;
    down.click();
    (host.querySelector('#sf-note') as HTMLTextAreaElement).value = 'тяжеловато';
    (host.querySelector('#sf-save') as HTMLButtonElement).click();
    expect(saved).toBe('down');
    expect(entryForSession(loadSessionFeedback(), 'sess-1')?.note).toBe('тяжеловато');
    expect(host.textContent).toMatch(/Сохранено/i);
  });

  test('progress aggregate empty state is honest', () => {
    const html = renderSessionFeelAggregateHtml(7);
    expect(html).toMatch(/session-feel-aggregate/);
    expect(html).toMatch(/нет отметок/i);
    expect(html).not.toMatch(/IQ|Шульте|Струп|Wikium/i);
  });
});
