import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';
import { calendarDayKey, configureFokusTimeZones, extractPlayedDays, resolveFokusTimeZone } from '../src/core/streak';
import * as streak from '../src/core/streak';

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
afterEach(() => { configureFokusTimeZones(null); vi.restoreAllMocks(); });

test('existing Moscow user: device zone is offered; switching keeps past days and dates new ones in the new zone', () => {
  vi.spyOn(streak, 'deviceTimeZone').mockReturnValue('America/Los_Angeles');
  const p = storage.getProfile();
  p.onboarded = true;
  p.timeZones = [{ zone: 'Europe/Moscow', fromMs: 0 }];
  storage.setProfile(p);
  storage.addSession({ id: 'old', startedAt: '2026-11-10T22:30:00Z', items: [] } as any); // 01:30 MSK on the 11th
  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.querySelector('[data-tz-current]')!.getAttribute('data-tz-current')).toBe('Europe/Moscow');
  expect(app.textContent).toContain('московское время');
  const btn = app.querySelector<HTMLButtonElement>('#btn-tz-device')!;
  expect(btn.textContent).toContain('Los Angeles');
  btn.click();

  const zones = storage.getProfile().timeZones!;
  expect(zones).toHaveLength(2);
  expect(zones[0]).toEqual({ zone: 'Europe/Moscow', fromMs: 0 });
  expect(zones[1].zone).toBe('America/Los_Angeles');
  expect(resolveFokusTimeZone().timeZone).toBe('America/Los_Angeles');
  const tz = resolveFokusTimeZone().timeZone;
  expect(extractPlayedDays({ sessions: storage.getSessions() as any }, tz)).toEqual(['2026-11-11']);
  expect(calendarDayKey(new Date(zones[1].fromMs + 3600_000), tz)).toBe(calendarDayKey(new Date(zones[1].fromMs + 3600_000), 'America/Los_Angeles'));
  expect(app.querySelector('#btn-tz-device')).toBeNull();
  expect(app.querySelector('#tz-status')!.textContent).toContain('Прошлые дни не пересчитаны');
});

test('the select is labelled and lists the current zone as selected', () => {
  vi.spyOn(streak, 'deviceTimeZone').mockReturnValue('Europe/Moscow');
  const app = document.getElementById('app')!;
  renderSettings(app);
  const sel = app.querySelector<HTMLSelectElement>('#tz-select')!;
  expect(app.querySelector('label[for="tz-select"]')).toBeTruthy();
  expect(sel.value).toBe('Europe/Moscow');
  expect(app.querySelector('#btn-tz-device')).toBeNull();
  sel.value = 'Asia/Tokyo';
  sel.dispatchEvent(new Event('change'));
  expect(storage.getProfile().timeZones!.slice(-1)[0].zone).toBe('Asia/Tokyo');
});
