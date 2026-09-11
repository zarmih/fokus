import { expect, test, beforeEach, vi } from 'vitest';

vi.mock('../src/main', () => ({ deferredPrompt: null }));
vi.mock('../src/ui/router', () => ({ navigateTo: vi.fn() }));

import { renderSettings } from '../src/ui/screens/settings';
import { storage } from '../src/core/storage';

beforeEach(() => {
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
});

test('settings expose mute, volume slider and haptics toggle', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);

  const sound = document.getElementById('sound-toggle') as HTMLInputElement;
  const volume = document.getElementById('sound-volume') as HTMLInputElement;
  const haptics = document.getElementById('haptics-toggle') as HTMLInputElement;
  expect(sound).toBeTruthy();
  expect(volume).toBeTruthy();
  expect(haptics).toBeTruthy();
  expect(sound.checked).toBe(true);
  expect(volume.disabled).toBe(false);
  expect(volume.value).toBe('100');
  expect(haptics.checked).toBe(true);
});

test('volume slider writes soundVolume and mute disables the slider', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);

  const volume = document.getElementById('sound-volume') as HTMLInputElement;
  volume.value = '40';
  volume.dispatchEvent(new Event('input'));
  expect(storage.getProfile().soundVolume).toBeCloseTo(0.4);

  const sound = document.getElementById('sound-toggle') as HTMLInputElement;
  sound.checked = false;
  sound.dispatchEvent(new Event('change'));
  expect(storage.getProfile().soundOn).toBe(false);
  expect(volume.disabled).toBe(true);
});

test('haptics toggle persists', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);
  const haptics = document.getElementById('haptics-toggle') as HTMLInputElement;
  haptics.checked = false;
  haptics.dispatchEvent(new Event('change'));
  expect(storage.getProfile().hapticsOn).toBe(false);
});
