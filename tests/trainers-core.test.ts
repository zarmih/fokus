import { expect, test, vi } from 'vitest';

vi.mock('../src/core/storage', () => ({ storage: { getExerciseStates: vi.fn(() => []), getSkills: vi.fn(() => []) } }));
vi.mock('../src/ui/shell', () => ({
  renderShell: vi.fn((container: HTMLElement) => { const c = document.createElement('div'); container.appendChild(c); return c; })
}));

import { renderTrainers } from '../src/ui/screens/trainers';
import { CORE_EXERCISE_IDS } from '../src/core/core-catalog';

test('core exercises are marked with text (not colour only), listed first in their area, and filterable', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  renderTrainers(root);
  const cards = [...root.querySelectorAll<HTMLElement>('.trainer-card')];
  const marked = cards.filter((c) => c.dataset.core === 'true').map((c) => c.dataset.id).sort();
  expect(marked).toEqual([...CORE_EXERCISE_IDS].sort());
  for (const c of cards) {
    const chip = c.querySelector('[data-core-chip]');
    expect(!!chip).toBe(c.dataset.core === 'true');
    if (chip) {
      expect(chip.textContent).toContain('Основное');
      expect(c.getAttribute('aria-label')).toContain('Основная программа');
    }
  }
  // Within each area group core cards come before the rest.
  for (const g of root.querySelectorAll('.domain-group')) {
    const flags = [...g.querySelectorAll<HTMLElement>('.trainer-card')].map((c) => c.dataset.core === 'true');
    const firstNonCore = flags.indexOf(false);
    if (firstNonCore >= 0) expect(flags.slice(firstNonCore).includes(true)).toBe(false);
  }
  const chip = root.querySelector<HTMLButtonElement>('.filter-chip[data-dom="core"]')!;
  expect(chip.querySelector('.chip-count')!.textContent).toBe(String(CORE_EXERCISE_IDS.length));
  chip.click();
  const visible = cards.filter((c) => c.style.display !== 'none');
  expect(visible.map((c) => c.dataset.id).sort()).toEqual([...CORE_EXERCISE_IDS].sort());
  expect(chip.getAttribute('aria-pressed')).toBe('true');
});
