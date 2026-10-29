import { expect, test, beforeEach } from 'vitest';
import { renderTrainers } from '../src/ui/screens/trainers';
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

test('catalog filter chips: roving tabindex and ArrowRight', () => {
  const app = document.getElementById('app')!;
  renderTrainers(app);
  const chips = [...app.querySelectorAll('.filter-chip')] as HTMLButtonElement[];
  expect(chips.length).toBeGreaterThan(2);

  const all = chips.find((c) => c.dataset.dom === 'all')!;
  expect(all.getAttribute('aria-pressed')).toBe('true');
  expect(all.tabIndex).toBe(0);
  for (const c of chips) {
    if (c !== all) expect(c.tabIndex).toBe(-1);
  }

  all.focus();
  all.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const next = chips[chips.indexOf(all) + 1];
  expect(next.getAttribute('aria-pressed')).toBe('true');
  expect(next.tabIndex).toBe(0);
  expect(all.getAttribute('aria-pressed')).toBe('false');
});
