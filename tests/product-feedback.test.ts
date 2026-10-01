import { describe, expect, test, beforeEach } from 'vitest';
import {
  addFeedbackNote,
  emptyFeedbackStore,
  exportFeedbackPlain,
  feedbackPrivacyBlurb,
  parseFeedbackStore,
  recordAnalyticsEvent,
  setAnalyticsOptIn,
  serializeFeedbackStore
} from '../src/core/product-feedback';
import {
  __resetFeedbackMem,
  loadFeedback,
  submitFeedback,
  setLocalAnalyticsOptIn,
  trackLocal,
  feedbackExportText
} from '../src/core/feedback-io';
import { renderFeedbackPanel, mountFeedbackButton } from '../src/ui/components/feedback-panel';
import { KNOWN_STORES } from '../src/core/privacy';

beforeEach(() => {
  localStorage.clear();
  __resetFeedbackMem();
  document.body.innerHTML = '';
});

describe('product feedback (local, privacy-friendly)', () => {
  test('privacy catalog lists feedback key', () => {
    expect(KNOWN_STORES.some((s) => s.key === 'fokus.feedback.v1')).toBe(true);
  });

  test('notes stay local and export is plain text', () => {
    let store = emptyFeedbackStore();
    store = addFeedbackNote(store, { kind: 'idea', text: '  Больше коротких блоков  ' }, new Date('2026-10-01T12:00:00Z'), () => 0.5);
    expect(store.notes).toHaveLength(1);
    expect(store.notes[0].text).toBe('Больше коротких блоков');
    const plain = exportFeedbackPlain(store);
    expect(plain).toMatch(/локальн/i);
    expect(plain).toContain('Больше коротких блоков');
    expect(feedbackPrivacyBlurb()).toMatch(/отправк/i);
  });

  test('analytics events no-op until opt-in', () => {
    let store = emptyFeedbackStore();
    store = recordAnalyticsEvent(store, 'ritual_started');
    expect(store.analytics.ritualsStarted).toBe(0);
    store = setAnalyticsOptIn(store, true);
    store = recordAnalyticsEvent(store, 'ritual_started');
    store = recordAnalyticsEvent(store, 'ritual_completed');
    expect(store.analytics.ritualsStarted).toBe(1);
    expect(store.analytics.ritualsCompleted).toBe(1);
  });

  test('round-trip serialize / parse', () => {
    const raw = serializeFeedbackStore(
      addFeedbackNote(emptyFeedbackStore(), { kind: 'bug', text: 'кнопка' })
    );
    const parsed = parseFeedbackStore(raw);
    expect(parsed.notes[0].kind).toBe('bug');
    expect(parseFeedbackStore('not-json').notes).toEqual([]);
  });

  test('feedback-io persists to localStorage', () => {
    submitFeedback({ kind: 'praise', text: 'спасибо', screen: 'settings' });
    __resetFeedbackMem();
    const loaded = loadFeedback();
    expect(loaded.notes[0].text).toBe('спасибо');
    setLocalAnalyticsOptIn(true);
    trackLocal('soft_return_open');
    expect(loadFeedback().analytics.softReturnOpens).toBe(1);
    expect(feedbackExportText()).toContain('спасибо');
  });

  test('UI panel saves a note', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    renderFeedbackPanel(host, { screen: 'settings' });
    (host.querySelector('#fb-text') as HTMLTextAreaElement).value = 'тест панели';
    (host.querySelector('#fb-submit') as HTMLButtonElement).click();
    expect(loadFeedback().notes[0].text).toBe('тест панели');
    expect(host.querySelector('#fb-status')?.textContent).toMatch(/Сохранено/);
  });

  test('mountFeedbackButton toggles panel', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    mountFeedbackButton(parent, { screen: 'progress' });
    const btn = parent.querySelector('#btn-open-feedback') as HTMLButtonElement;
    const slot = parent.querySelector('#fokus-feedback-slot') as HTMLElement;
    expect(slot.hidden).toBe(true);
    btn.click();
    expect(slot.hidden).toBe(false);
    expect(slot.querySelector('#fb-title')?.textContent).toMatch(/Обратная связь/);
  });
});
