import { expect, test, beforeEach } from 'vitest';
import { renderProgress } from '../src/ui/screens/progress';
import { storage } from '../src/core/storage';

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

test('progress index UI explains index honestly without junk metrics', () => {
  storage.setDomains([
    { domain: 'attention', value: 720, trend: 4, updatedAt: 'x' },
    { domain: 'memory', value: 500, trend: -2, updatedAt: 'x' },
    { domain: 'speed', value: 600, trend: 0, updatedAt: 'x' }
  ]);
  storage.setProfile({ ...storage.getProfile(), calibrated: true, onboarded: true });

  renderProgress(document.getElementById('app')!);
  
  const text = document.body.textContent || '';
  expect(text).toMatch(/Fokus Index/);
  expect(text).toMatch(/Индекс отражает текущую тренировочную форму/);
  const fiHero = document.querySelector('.fi-hero');
  expect(fiHero).toBeTruthy();
  const heroText = fiHero?.textContent || '';
  expect(heroText).not.toMatch(/медицинский диагноз|IQ|мозг|интеллект/i);

  const btn = document.getElementById('btn-explain-index') as HTMLButtonElement;
  expect(btn).toBeTruthy();

  const explainer = document.getElementById('fi-explainer') as HTMLElement;
  expect(explainer).toBeTruthy();
  expect(explainer.style.display).toBe('none');
  
  // Test explain hook
  btn.click();
  expect(explainer.style.display).toBe('block');
  expect(btn.getAttribute('aria-expanded')).toBe('true');
  
  const explainText = explainer.textContent || '';
  expect(explainText).toMatch(/Как работает Fokus Index/);
  expect(explainText).toMatch(/текущую тренировочную форму/);
  expect(explainText).not.toMatch(/улучшение мозга|прокачка/i);
  
  btn.click();
  expect(explainer.style.display).toBe('none');
  expect(btn.getAttribute('aria-expanded')).toBe('false');
});

test('progress index UI shows empty state properly', () => {
  // Empty domains
  storage.setDomains([]);
  storage.setProfile({ ...storage.getProfile(), calibrated: true, onboarded: true });

  renderProgress(document.getElementById('app')!);
  
  const text = document.body.textContent || '';
  expect(text).toMatch(/Fokus Index/);
  expect(text).toMatch(/Недостаточно данных/);
  
  const btn = document.getElementById('btn-explain-index') as HTMLButtonElement;
  expect(btn).toBeTruthy();
  const explainer = document.getElementById('fi-explainer') as HTMLElement;
  expect(explainer).toBeTruthy();
});
