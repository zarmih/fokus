import { expect, test, beforeEach, afterEach } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
import { renderToday } from '../src/ui/screens/today';
import { renderSession } from '../src/ui/screens/session';
import { storage } from '../src/core/storage';
import { buildCheckpoint, setFocusDndLive } from '../src/core/focus-mode';
import { scoreSessionQuality } from '../src/core/sessionQuality';
import type { FocusCheckpoint, SessionItem } from '../src/core/types';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div><div id="a11y-status" class="sr-only" role="status"></div>';
  document.documentElement.classList.remove('focus-mode');
  delete document.documentElement.dataset.focusMode;
  setFocusDndLive(false);
});

afterEach(() => {
  document.documentElement.classList.remove('focus-mode');
  delete document.documentElement.dataset.focusMode;
  setFocusDndLive(false);
});

function block(partial: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: partial.exerciseId || 'stroop',
    level: 4,
    accuracy: 0.84,
    avgRtMs: 420,
    score: 44,
    ...partial
  };
}

function liveCheckpoint(partial: Partial<FocusCheckpoint> = {}): FocusCheckpoint {
  const now = Date.now();
  return buildCheckpoint({
    sessionId: partial.sessionId || 'live-1',
    startedAt: partial.startedAt || new Date(now - 120000).toISOString(),
    savedAt: partial.savedAt || new Date(now - 5000).toISOString(),
    mode: 'normal',
    items: partial.items || [
      { exerciseId: 'stroop' },
      { exerciseId: 'odd-one' }
    ],
    currentIndex: partial.currentIndex ?? 1,
    timeLeft: partial.timeLeft ?? 200,
    sessionBudget: partial.sessionBudget ?? 300,
    results: partial.results ?? [block()],
    domainDeltas: partial.domainDeltas || { attention: 3 }
  });
}

test('settings explain focus mode and persist the three flags', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  const explainer = app.querySelector('.focus-explainer') as HTMLElement;
  expect(explainer).toBeTruthy();
  expect(explainer.textContent).toMatch(/Режим фокуса/);
  expect(explainer.textContent).toMatch(/не лечение внимания/i);
  expect(explainer.textContent).not.toMatch(/прокачать мозг|IQ-тест/i);
  const focus = app.querySelector('#focus-toggle') as HTMLInputElement;
  const ring = app.querySelector('#focus-ring-toggle') as HTMLInputElement;
  const dnd = app.querySelector('#focus-dnd-toggle') as HTMLInputElement;
  expect(focus.checked).toBe(true);
  expect(ring.checked).toBe(true);
  expect(dnd.checked).toBe(true);

  focus.checked = false;
  focus.dispatchEvent(new Event('change'));
  ring.checked = false;
  ring.dispatchEvent(new Event('change'));
  dnd.checked = false;
  dnd.dispatchEvent(new Event('change'));
  const p = storage.getProfile();
  expect(p.focusMode).toBe(false);
  expect(p.focusTimerRing).toBe(false);
  expect(p.focusDnd).toBe(false);
});

test('today offers resume for a fresh checkpoint and discard writes a G8 abandoned session', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.focusCheckpoint = liveCheckpoint();
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.textContent).toMatch(/Сессия прервана/);
  expect(app.textContent).toMatch(/Продолжить с блока 2/);
  expect(app.querySelector('#btn-resume')).toBeTruthy();
  expect(app.querySelector('#btn-start')).toBeNull();

  app.querySelector('#btn-discard')?.dispatchEvent(new Event('click'));
  const sessions = storage.getSessions();
  expect(sessions).toHaveLength(1);
  expect(sessions[0].interrupted).toBe(true);
  expect(sessions[0].endReason).toBe('abandoned');
  expect(sessions[0].finishedAt).toBeNull();
  expect(storage.getProfile().focusCheckpoint).toBeUndefined();
  const q = scoreSessionQuality(sessions[0]);
  expect(q.sample.interrupted).toBe(true);
  expect(app.textContent).toMatch(/Начать сессию|Ещё одна сессия|Калибровка/);
});

test('today converts a stale checkpoint into an abandoned session without a resume card', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.focusCheckpoint = liveCheckpoint({
    savedAt: '2026-09-10T08:00:00.000Z',
    startedAt: '2026-09-10T07:55:00.000Z'
  });
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderToday(app);
  expect(app.querySelector('#btn-resume')).toBeNull();
  expect(storage.getProfile().focusCheckpoint).toBeUndefined();
  const sessions = storage.getSessions();
  expect(sessions).toHaveLength(1);
  expect(sessions[0].endReason).toBe('abandoned');
  expect(app.textContent).toMatch(/Качество ритуала/);
});

test('session in focus mode hides chrome, shows the timer ring and larger exit', () => {
  const app = document.getElementById('app')!;
  renderSession(app, { mode: 'normal', items: [{ exerciseId: 'stroop' }], durationSec: 300 });
  expect(document.documentElement.classList.contains('focus-mode')).toBe(true);
  expect(app.querySelector('.session-header.is-focus')).toBeTruthy();
  expect(app.querySelector('.timer-ring')).toBeTruthy();
  expect(app.querySelector('#btn-back')?.textContent).toBe('Выйти');
  expect(app.querySelector('#btn-restart')).toBeNull();
  expect(app.querySelector('.session-block-info')).toBeNull();
  expect(app.querySelector('.is-focus-session')).toBeTruthy();
});

test('session without focus mode keeps the usual chrome', () => {
  const p = storage.getProfile();
  p.focusMode = false;
  storage.setProfile(p);
  const app = document.getElementById('app')!;
  renderSession(app, { mode: 'normal', items: [{ exerciseId: 'stroop' }], durationSec: 300 });
  expect(document.documentElement.classList.contains('focus-mode')).toBe(false);
  expect(app.querySelector('.timer-ring')).toBeNull();
  expect(app.querySelector('#btn-back')?.textContent).toBe('Назад');
  expect(app.querySelector('#btn-restart')).toBeTruthy();
  expect(app.querySelector('.session-block-info')?.textContent).toMatch(/Блок 1/);
});

test('timer ring can be turned off while focus chrome stays', () => {
  const p = storage.getProfile();
  p.focusTimerRing = false;
  storage.setProfile(p);
  const app = document.getElementById('app')!;
  renderSession(app, { mode: 'normal', items: [{ exerciseId: 'stroop' }], durationSec: 300 });
  expect(document.documentElement.classList.contains('focus-mode')).toBe(true);
  expect(app.querySelector('.timer-ring')).toBeNull();
  expect(app.querySelector('#session-timer')?.textContent).toMatch(/\d:\d\d/);
});

test('hiding the tab pauses a DND session and keeps the checkpoint path', () => {
  const app = document.getElementById('app')!;
  renderSession(app, { mode: 'normal', items: [{ exerciseId: 'stroop' }], durationSec: 300 });
  const prevHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
    || Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(app.textContent).toMatch(/экран скрыт/);
  if (prevHidden) {
    Object.defineProperty(document, 'hidden', prevHidden);
  } else {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  }
});

test('resume restores the saved block and leaving writes a checkpoint, not a finished session', () => {
  const cp = liveCheckpoint();
  const p = storage.getProfile();
  p.focusCheckpoint = cp;
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderSession(app, {
    mode: 'normal',
    items: cp.items.map((it) => ({ exerciseId: it.exerciseId, difficulty: it.difficulty })),
    durationSec: cp.sessionBudget,
    resume: cp
  });
  expect(app.textContent).toMatch(/Продолжить/);
  expect(app.textContent).toMatch(/Лишний/);
  app.querySelector('#btn-back')?.dispatchEvent(new Event('click'));
  expect(storage.getSessions()).toHaveLength(0);
  const saved = storage.getProfile().focusCheckpoint;
  expect(saved?.sessionId).toBe(cp.sessionId);
  expect(saved?.currentIndex).toBe(1);
  expect(saved?.results).toHaveLength(1);
});
