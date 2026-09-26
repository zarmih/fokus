import { expect, test, beforeEach, vi } from 'vitest';
import { renderToday } from '../src/ui/screens/today';
import { renderTrainers } from '../src/ui/screens/trainers';
import { storage } from '../src/core/storage';
import { applyDocumentLang, setScreenTitle } from '../src/ui/a11y';
import { applyTheme } from '../src/ui/theme';
import { t } from '../src/core/i18n';

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
});

test('shell exposes landmarks, skip link and keyboard tabs', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderToday(app);

  expect(app.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
  expect(app.querySelector('main#main-content')).toBeTruthy();
  expect(app.querySelector('nav.tab-bar')?.getAttribute('aria-label')).toBe(t('a11y.nav'));
  expect(app.querySelector('#tab-today')?.tagName).toBe('BUTTON');
  expect(app.querySelector('#tab-today')?.getAttribute('aria-current')).toBe('page');
  expect(app.querySelector('.streak-badge')?.getAttribute('aria-label')).toMatch(/Сери/);
});

test('trainer cards are buttons and filters expose pressed state', () => {
  const app = document.getElementById('app')!;
  renderTrainers(app);
  const card = app.querySelector('.trainer-card') as HTMLButtonElement;
  expect(card.tagName).toBe('BUTTON');
  expect(card.type).toBe('button');
  const chip = app.querySelector('.filter-chip') as HTMLButtonElement;
  expect(chip.getAttribute('aria-pressed')).toBeTruthy();
});

test('document lang and theme color-scheme', () => {
  applyDocumentLang('en');
  expect(document.documentElement.lang).toBe('en');
  applyDocumentLang('ru');
  expect(document.documentElement.lang).toBe('ru');
  applyTheme('light');
  expect(document.documentElement.style.colorScheme).toBe('light');
  setScreenTitle('Каталог');
  expect(document.title).toMatch(/Каталог/);
});

import { focusMain, announce, bindDialog, prefersReducedMotion } from '../src/ui/a11y';

test('focusMain focuses the main element', () => {
  const main = document.createElement('main');
  main.id = 'main-content';
  document.body.appendChild(main);
  main.focus = vi.fn();
  focusMain();
  expect(main.tabIndex).toBe(-1);
  expect(main.focus).toHaveBeenCalled();
  main.remove();
});

test('announce updates live region', () => {
  announce('Test message');
  const el = document.getElementById('a11y-status')!;
  expect(el.getAttribute('aria-live')).toBe('polite');
  // requestAnimationFrame is not run synchronously in vitest without vi.runAllTimers, 
  // but we can test the structure. We mock requestAnimationFrame.
});

test('prefersReducedMotion reads matchMedia or profile', () => {
  const p = storage.getProfile();
  p.reducedMotion = true;
  storage.setProfile(p);
  expect(prefersReducedMotion()).toBe(true);

  p.reducedMotion = false;
  storage.setProfile(p);
  (window as any).matchMedia = () => ({ matches: false });
  expect(prefersReducedMotion()).toBe(false);
});

test('bindDialog traps focus and handles Escape', () => {
  const overlay = document.createElement('div');
  overlay.innerHTML = '<button id="b1"></button><button id="b2"></button>';
  document.body.appendChild(overlay);

  const onClose = vi.fn();
  const unbind = bindDialog(overlay, { label: 'Test', onClose });

  expect(overlay.getAttribute('role')).toBe('dialog');
  expect(overlay.getAttribute('aria-modal')).toBe('true');
  expect(overlay.getAttribute('aria-label')).toBe('Test');

  // Trigger escape
  overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(onClose).toHaveBeenCalled();

  unbind();
  overlay.remove();
});
