import { expect, test, beforeEach, afterEach, vi } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';
import { APP_STATE_KEY, REMINDER_LAST_KEY, WIPE_CONFIRM_WORD } from '../src/core/privacy';

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('settings privacy panel lists local stores and default redacted export', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.displayName = 'Михаил';
  p.name = 'Михаил';
  storage.setProfile(p);

  const app = document.getElementById('app')!;
  renderSettings(app);

  expect(app.textContent).toMatch(/Приватность и данные/);
  expect(app.textContent).toMatch(/Нет аккаунта/);
  expect(app.textContent).toMatch(/fokus\.v1/);
  expect(app.textContent).toMatch(/fokus\.reminder\.last/);
  expect(app.textContent).toMatch(/есть персональные данные/);
  expect(app.textContent).toMatch(/имя/);
  expect(app.querySelector('#privacy-panel')).toBeTruthy();
  expect((app.querySelector('#export-redact') as HTMLInputElement).checked).toBe(true);
  expect(app.querySelector('#btn-export')).toBeTruthy();
  expect(app.querySelector('#btn-reset-progress')).toBeTruthy();
  expect(app.querySelector('#btn-reset')).toBeTruthy();
  expect(app.querySelector('[data-key="cache"]')?.textContent).toMatch(/Офлайн-кэш/);
});

test('clear name removes displayName without wiping sessions', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'Ada', displayName: 'Ada', onboarded: true });
  storage.addSession({
    id: 's1',
    startedAt: '2026-09-11T10:00:00.000Z',
    finishedAt: '2026-09-11T10:05:00.000Z',
    durationSec: 300,
    items: []
  });
  const app = document.getElementById('app')!;
  renderSettings(app);
  (app.querySelector('#btn-clear-name') as HTMLButtonElement).click();
  expect(storage.getProfile().name).toBe('User');
  expect(storage.getProfile().displayName).toBeUndefined();
  expect(storage.getSessions()).toHaveLength(1);
  expect(app.textContent).not.toMatch(/Сейчас на устройстве: имя/);
});

test('progress reset is confirmed in-panel and keeps theme', () => {
  storage.setProfile({
    ...storage.getProfile(),
    name: 'Ada',
    displayName: 'Ada',
    theme: 'light',
    onboarded: true,
    xp: 99
  });
  const app = document.getElementById('app')!;
  renderSettings(app);
  const box = app.querySelector('#progress-confirm') as HTMLElement;
  expect(box.hidden).toBe(true);
  (app.querySelector('#btn-reset-progress') as HTMLButtonElement).click();
  expect(box.hidden).toBe(false);
  (app.querySelector('#btn-reset-progress-confirm') as HTMLButtonElement).click();
  expect(storage.getProfile().theme).toBe('light');
  expect(storage.getProfile().name).toBe('User');
  expect(storage.getProfile().xp).toBe(0);
});

test('factory wipe requires the confirmation word and then clears fokus keys', () => {
  try {
    vi.spyOn(window.location, 'reload').mockImplementation(() => undefined);
  } catch {
    /* jsdom location may be frozen */
  }
  storage.setProfile({ ...storage.getProfile(), name: 'Ada', onboarded: true });
  (storage as any).backend.setItem(REMINDER_LAST_KEY, '2026-09-11');
  const app = document.getElementById('app')!;
  renderSettings(app);

  (app.querySelector('#btn-reset') as HTMLButtonElement).click();
  const wipe = app.querySelector('#wipe-confirm') as HTMLElement;
  expect(wipe.hidden).toBe(false);

  (app.querySelector('#btn-wipe-confirm') as HTMLButtonElement).click();
  expect(app.querySelector('#wipe-confirm-hint')?.textContent).toMatch(/УДАЛИТЬ/);
  expect((storage as any).backend.getItem(APP_STATE_KEY)).toBeTruthy();

  (app.querySelector('#wipe-confirm-input') as HTMLInputElement).value = WIPE_CONFIRM_WORD;
  (app.querySelector('#btn-wipe-confirm') as HTMLButtonElement).click();
  expect((storage as any).backend.getItem(APP_STATE_KEY)).toBeNull();
  expect((storage as any).backend.getItem(REMINDER_LAST_KEY)).toBeNull();
});

test('redacted export download uses the private filename', () => {
  storage.setProfile({ ...storage.getProfile(), name: 'Михаил', displayName: 'Михаил', onboarded: true });
  const app = document.getElementById('app')!;
  renderSettings(app);

  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:fokus-test',
    revokeObjectURL: () => {}
  });
  let download = '';
  const proto = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    download = this.download;
  };

  (app.querySelector('#btn-export') as HTMLButtonElement).click();
  HTMLAnchorElement.prototype.click = proto;

  expect(download).toMatch(/^fokus-data-\d{4}-\d{2}-\d{2}\.json$/);
  expect(download).not.toMatch(/full/);
});
