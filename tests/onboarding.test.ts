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

  expect(app.textContent).toMatch(/Пять минут/);
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  const memory = [...app.querySelectorAll('.goal-card')].find(el => (el as HTMLElement).dataset.goal === 'memory') as HTMLButtonElement;
  memory.click();
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  const eight = app.querySelector('[data-m="8"]') as HTMLButtonElement;
  eight.click();
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  const name = app.querySelector('#onboard-name') as HTMLInputElement;
  name.value = 'Михаил';
  name.dispatchEvent(new Event('input'));
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  expect(app.textContent).toMatch(/Не медицинское изделие/);
  expect(app.textContent).toMatch(/60–90/);
  expect(app.textContent).toMatch(/Навёрстывать/);
  (app.querySelector('#btn-next') as HTMLButtonElement).click();

  const p = storage.getProfile();
  expect(p.onboarded).toBe(true);
  expect(p.primaryGoal).toBe('memory');
  expect(p.sessionLengthSec).toBe(480);
  expect(p.displayName).toBe('Михаил');
  expect(p.onboardingCompletedAt).toBeTruthy();
  expect(p.firstWeekPlan?.skipPolicy).toBe('one-forgiven');
  expect(p.firstWeekPlan?.days).toHaveLength(7);
  expect(p.firstWeekPlan?.days[0].durationSec).toBe(300);
  expect(p.firstWeekPlan?.days[6].durationSec).toBe(480);
});

test('onboarding dots expose progress for assistive tech', () => {
  const app = document.getElementById('app')!;
  renderOnboarding(app);
  const dots = app.querySelector('.onboard-dots') as HTMLElement;
  expect(dots.getAttribute('role')).toBe('progressbar');
  expect(dots.getAttribute('aria-valuenow')).toBe('1');
});
