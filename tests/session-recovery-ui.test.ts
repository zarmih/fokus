import { expect, test, beforeEach } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
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

test('settings explain quality without a fake brain score and default recovery on', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.textContent).toMatch(/Качество сессии и восстановление/);
  expect(app.textContent).toMatch(/не IQ/i);
  expect(app.textContent).toMatch(/не «балл мозга»|не балл мозга/i);
  const toggle = app.querySelector('#recovery-toggle') as HTMLInputElement;
  expect(toggle).toBeTruthy();
  expect(toggle.checked).toBe(true);

  toggle.checked = false;
  toggle.dispatchEvent(new Event('change'));
  expect(storage.getProfile().recoveryHints).toBe(false);
});

test('stats show quality breakdown after a session', () => {
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-10T10:00:00.000Z',
    finishedAt: '2026-09-10T10:05:00.000Z',
    durationSec: 300,
    plannedDurationSec: 300,
    items: [
      { exerciseId: 'grid-memory', level: 5, accuracy: 0.88, avgRtMs: 400, score: 50 },
      { exerciseId: 'stroop', level: 5, accuracy: 0.86, avgRtMs: 410, score: 48 },
      { exerciseId: 'odd-one', level: 5, accuracy: 0.9, avgRtMs: 420, score: 52 }
    ]
  });

  const app = document.getElementById('app')!;
  renderProgress(app);
  expect(app.textContent).toMatch(/Качество ритуала/);
  expect(app.textContent).toMatch(/Точность/);
  expect(app.textContent).toMatch(/Стабильность реакции/);
  expect(app.textContent).toMatch(/вес 30%/);
  expect(app.textContent).toMatch(/не способностей/);
});
