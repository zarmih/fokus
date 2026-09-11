import { expect, test, beforeEach } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';

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

test('settings data panel shows offline health and export/import', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.textContent).toMatch(/Приватность и данные|Данные/);
  expect(app.textContent).toMatch(/Локально, без сервера|Офлайн-копия на этом устройстве/);
  expect(app.textContent).toMatch(/Схема 4/);
  expect(app.textContent).toMatch(/Нет аккаунта/);
  expect(document.getElementById('btn-export')).toBeTruthy();
  expect(document.getElementById('btn-import')).toBeTruthy();
  expect(document.getElementById('btn-restore-snap')?.style.display).toBe('none');
});

test('settings preview offers merge and replace for a valid backup', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'Home', onboarded: true, xp: 20 });
  const json = storage.exportJson();

  const app = document.getElementById('app')!;
  renderSettings(app);

  const input = document.getElementById('file-input') as HTMLInputElement;
  const file = new File([json], 'fokus-backup.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change'));

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const preview = document.getElementById('import-preview')!;
      expect(preview.style.display).toBe('block');
      expect(preview.textContent).toMatch(/Home/);
      expect(preview.textContent).toMatch(/Объединить/);
      expect(preview.textContent).toMatch(/Заменить/);
      resolve();
    }, 30);
  });
});

test('settings preview rejects a broken file', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  const input = document.getElementById('file-input') as HTMLInputElement;
  const file = new File(['{"nope": true}'], 'bad.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change'));

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      expect(document.getElementById('import-preview')?.textContent).toMatch(/не резервная копия/i);
      resolve();
    }, 30);
  });
});

test('settings health after a write mentions revision', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'Ada', onboarded: true });
  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.textContent).toMatch(/ревизия/);
  expect(app.textContent).toMatch(/Офлайн-копия/);
});
