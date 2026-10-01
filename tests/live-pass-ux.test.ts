import { beforeEach, describe, expect, test } from 'vitest';
import { renderDuel, resolveSignalUrl } from '../src/ui/screens/duel';
import { renderToday } from '../src/ui/screens/today';
import { storage } from '../src/core/storage';
import { addCalendarDays, calendarDayKey, resolveFokusTimeZone } from '../src/core/streak';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
  clear() { this.data = {}; }
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
});

describe('live-pass — onboarding→Today→quest→duel code-path', () => {
  test('resolveSignalUrl works on localhost in jsdom', () => {
    const url = resolveSignalUrl();
    // jsdom typically reports localhost
    if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      expect(url).toBe('ws://localhost:8080');
    } else {
      expect(url === null || /^wss?:\/\//.test(url!)).toBe(true);
    }
  });

  test('Today soft-return still shows quest card (hole fix)', () => {
    const p = storage.getProfile();
    p.onboarded = true;
    p.calibrated = true;
    p.sessionLengthSec = 720;
    p.primaryGoal = 'attention';
    storage.setProfile(p);
    storage.setDomains([
      { domain: 'attention', value: 540, trend: 0, updatedAt: new Date().toISOString() }
    ]);

    const today = calendarDayKey(new Date(), resolveFokusTimeZone().timeZone);
    const twoAgo = addCalendarDays(today, -2);
    storage.addDaySummary({
      date: twoAgo,
      totalScore: 120,
      domainDeltas: { attention: 3 },
      streak: 6,
      skipped: false
    } as any);
    storage.addSession({
      id: 's1',
      startedAt: `${twoAgo}T10:00:00`,
      finishedAt: `${twoAgo}T10:06:00`,
      durationSec: 300,
      items: [{ exerciseId: 'stroop', level: 2, accuracy: 0.9, avgRtMs: 400, score: 80 }]
    } as any);

    const app = document.getElementById('app')!;
    renderToday(app);
    expect(app.querySelector('.habit-chip')?.getAttribute('data-status')).toBe('soft_return');
    expect(app.querySelector('.quests-card')).toBeTruthy();
    expect(app.textContent).toMatch(/квест|Мягкий старт|Погружение|Внимание|Первые шаги|точност/i);
  });

  test('Duel: practice hint when uncalibrated; join validates 4 digits without alert', () => {
    storage.setProfile({ ...storage.getProfile(), calibrated: false, displayName: 'Гость' });
    const alerts: string[] = [];
    const originalAlert = window.alert;
    window.alert = (msg?: any) => { alerts.push(String(msg)); };

    renderDuel(document.getElementById('app')!);
    expect(document.body.textContent).toMatch(/калибровк/i);
    expect((document.querySelector('#btn-practice') as HTMLButtonElement).disabled).toBe(true);

    const join = document.querySelector('#btn-join') as HTMLButtonElement;
    const input = document.querySelector('#input-code') as HTMLInputElement;
    input.value = '12ab';
    join.click();
    const status = document.querySelector('#status-msg') as HTMLElement;
    expect(status.style.display).not.toBe('none');
    expect(status.textContent).toMatch(/4 цифр/i);
    expect(alerts).toHaveLength(0);
    window.alert = originalAlert;
  });

  test('Duel keeps offline practice loop as primary path', () => {
    storage.setProfile({ ...storage.getProfile(), calibrated: true });
    storage.setDomains([
      { domain: 'attention', value: 700, trend: 0, updatedAt: new Date().toISOString() }
    ]);
    renderDuel(document.getElementById('app')!);
    expect(document.querySelector('[data-practice="1"]')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Тренировочная схватка/);
    expect((document.querySelector('#btn-practice') as HTMLButtonElement).disabled).toBe(false);
  });
});
