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

test('settings radiogroups use roving tabindex and arrow keys', () => {
  const app = document.getElementById('app')!;
  renderSettings(app);

  const group = app.querySelector('#duration-segmented') as HTMLElement;
  const buttons = [...group.querySelectorAll('button')] as HTMLButtonElement[];
  expect(buttons.length).toBe(4);

  const checked = buttons.find((b) => b.getAttribute('aria-checked') === 'true')!;
  expect(checked.tabIndex).toBe(0);
  for (const b of buttons) {
    if (b !== checked) expect(b.tabIndex).toBe(-1);
  }

  checked.focus();
  checked.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const next = buttons[(buttons.indexOf(checked) + 1) % buttons.length];
  expect(next.getAttribute('aria-checked')).toBe('true');
  expect(next.tabIndex).toBe(0);
  expect(storage.getProfile().sessionLengthSec).toBe(parseInt(next.dataset.val || '0', 10));
});
