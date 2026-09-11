import { expect, test, beforeEach } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';
import { ADAPTIVE_SETTINGS_COPY } from '../src/core/adaptive-depth';

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

test('settings explains adaptive depth without IQ scores', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.textContent).toContain(ADAPTIVE_SETTINGS_COPY.title);
  expect(app.textContent).toContain(ADAPTIVE_SETTINGS_COPY.body);
  expect(app.querySelector('.adaptive-note')).toBeTruthy();
  expect(app.textContent).toMatch(/не IQ/i);
});
