import { expect, test, beforeEach } from 'vitest';
import { renderOnboarding } from '../src/ui/screens/onboarding';
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

test('onboarding collects goal, duration and starts calibration', () => {
  const app = document.getElementById('app')!;
  renderOnboarding(app);

  expect(app.textContent).toMatch(/5 минут/);
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  const memory = [...app.querySelectorAll('.goal-card')].find(el => (el as HTMLElement).dataset.goal === 'memory') as HTMLButtonElement;
  memory.click();
  
  const name = app.querySelector('#onboard-name') as HTMLInputElement;
  name.value = 'Михаил';
  name.dispatchEvent(new Event('input'));
  
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  expect(app.textContent).toMatch(/Первый ритуал/);
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  const p = storage.getProfile();
  expect(p.onboarded).toBe(true);
  expect(p.primaryGoal).toBe('memory');
  expect(p.sessionLengthSec).toBe(300);
  expect(p.displayName).toBe('Михаил');
});
