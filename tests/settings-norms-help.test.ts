import { expect, test, beforeEach } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';
import {
  MIN_NORM_SAMPLES,
  normsDisclaimerRu,
  settingsNormsHelpRu,
  settingsNormsHelpTitleRu
} from '../src/core/local-norms';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
  keys() { return Object.keys(this.data); }
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
});

test('settingsNormsHelpRu is honest about local percentiles', () => {
  const body = settingsNormsHelpRu();
  expect(settingsNormsHelpTitleRu()).toBe('Личные нормы');
  expect(body).toMatch(/перцентил/i);
  expect(body).toMatch(/медиана/i);
  expect(body).toContain(String(MIN_NORM_SAMPLES));
  expect(body).toContain(normsDisclaimerRu());
  expect(body.toLowerCase()).toMatch(/не среднее|не сравнение|не оценка интеллекта/);
  expect(body.toLowerCase()).not.toMatch(/iq\b|диагноз|средний человек|населен/);
});

test('settings screen contains personal-norms help key phrases', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);

  const card = app.querySelector('[data-settings-norms-help="1"]');
  expect(card).toBeTruthy();
  expect(card?.textContent).toMatch(/Личные нормы/);
  expect(card?.textContent).toMatch(/перцентил/i);
  expect(card?.textContent).toMatch(/медиана/i);
  expect(card?.textContent).toContain(normsDisclaimerRu());
  expect(card?.textContent).toMatch(/только по вашей истории на этом устройстве/i);
  expect(card?.textContent).toMatch(/Не среднее «по миру»|не сравнение с другими/i);
  expect(app.textContent).toMatch(/Приватность/);
});
