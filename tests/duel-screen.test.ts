import { expect, test, beforeEach } from 'vitest';
import { renderDuel } from '../src/ui/screens/duel';
import { storage } from '../src/core/storage';
import { DUEL_LAST_SUMMARY_KEY, serializeSpectatorSummary } from '../src/core/duelIntel';

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
  localStorage.clear();
});

test('duel screen shows matchmaking ticket without opening WebRTC', () => {
  storage.setProfile({ ...storage.getProfile(), calibrated: true, displayName: 'Михаил' });
  storage.setDomains([
    { domain: 'attention', value: 800, trend: 0, updatedAt: new Date().toISOString() },
    { domain: 'memory', value: 620, trend: 0, updatedAt: new Date().toISOString() }
  ]);
  renderDuel(document.getElementById('app')!);
  expect(document.body.textContent).toMatch(/Билет подбора/);
  expect(document.body.textContent).toMatch(/Ничья при равном счёте/);
  expect(document.body.textContent).toMatch(/Реванш через 15 мин/);
  expect(document.body.textContent).not.toMatch(/нейрофитнес|лига чемпионов|прокачай/i);
  expect(document.querySelector('#btn-host')).toBeTruthy();
});

test('duel screen renders a spectator-safe last bout without RTs', () => {
  localStorage.setItem(DUEL_LAST_SUMMARY_KEY, serializeSpectatorSummary({
    boutId: 'bout-test',
    domain: 'speed',
    durationSec: 54,
    outcome: 'win',
    winnerAlias: 'Михаил',
    fighters: [{ alias: 'Михаил', points: 3 }, { alias: 'Соперник', points: 2 }],
    closeFinish: true,
    fairMatch: null
  }));
  renderDuel(document.getElementById('app')!);
  expect(document.body.textContent).toMatch(/3 : 2/);
  expect(document.body.textContent).toMatch(/близкий финиш/);
  expect(document.body.textContent).not.toMatch(/avgRt|@|webrtc/i);
});
