import { expect, test, vi, beforeEach } from 'vitest';
import { renderTrainers } from '../src/ui/screens/trainers';
import { catalog } from '../src/exercises/catalog';
import { storage } from '../src/core/storage';

vi.mock('../src/core/storage', () => ({
  storage: {
    getExerciseStates: vi.fn(() => []),
    getSkills: vi.fn(() => [])
  }
}));

vi.mock('../src/ui/shell', () => ({
  renderShell: vi.fn((container) => {
    const content = document.createElement('div');
    container.appendChild(content);
    return content;
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
  // We can't easily mock the huge catalog here directly since it's used globally in trainers.ts
  // but we can check the rendered output of the real catalog.
});

test('renderTrainers uses honest counts and groups domains including All', () => {
  const container = document.createElement('div');
  renderTrainers(container);

  // Should contain "Все" (All) filter
  const chips = Array.from(container.querySelectorAll('.filter-chip')) as HTMLElement[];
  expect(chips.length).toBeGreaterThan(0);
  const chipTexts = chips.map(c => c.textContent);
  expect(chipTexts.some(t => t?.includes('Все'))).toBe(true);

  // First chip should be active
  expect(chips[0].classList.contains('active')).toBe(true);
  
  // Total count label
  const label = container.querySelector('#catalog-count-label');
  expect(label).toBeTruthy();
  // It should show the count for all domains initially
  const firstDomainCount = catalog.length;
  expect(label?.textContent).toContain(`${firstDomainCount} упражнений`);
});

test('renderTrainers filter click toggles domain groups and updates count', () => {
  const container = document.createElement('div');
  renderTrainers(container);

  const chips = Array.from(container.querySelectorAll('.filter-chip')) as HTMLElement[];
  if (chips.length < 2) return;
  
  const secondChip = chips[1];
  const secondDomainId = secondChip.dataset.dom!;
  const secondDomainCount = catalog.filter(e => e.manifest.domain === secondDomainId).length;
  
  // click second chip
  secondChip.click();

  // now it should be active
  expect(secondChip.classList.contains('active')).toBe(true);
  expect(chips[0].classList.contains('active')).toBe(false);

  // count label should update
  const label = container.querySelector('#catalog-count-label');
  expect(label?.textContent).toContain(`${secondDomainCount} упражнений`);

  // correct group should be visible
  const groups = Array.from(container.querySelectorAll('.domain-group')) as HTMLElement[];
  groups.forEach(g => {
    if (g.dataset.group === secondDomainId) {
      expect(g.classList.contains('is-hidden')).toBe(false);
    } else {
      expect(g.classList.contains('is-hidden')).toBe(true);
    }
  });
});
