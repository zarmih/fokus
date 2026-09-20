import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { renderTrainers } from '../src/ui/screens/trainers';
import { storage } from '../src/core/storage';
import { catalog } from '../src/exercises/catalog';

describe('Catalog Discovery', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    storage.getExerciseStates = () => [];
    storage.getSkills = () => [];
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('renders domain chips with honest counts (no All wall)', () => {
    renderTrainers(container);
    const chips = Array.from(container.querySelectorAll('.filter-chip')) as HTMLElement[];
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.some((c) => c.textContent?.includes('Все'))).toBe(false);
    expect(chips[0].classList.contains('active')).toBe(true);
    expect(container.querySelector('#catalog-count-label')).toBeTruthy();
  });

  test('domain chip toggles groups and updates count', () => {
    renderTrainers(container);
    const chips = Array.from(container.querySelectorAll('.filter-chip')) as HTMLElement[];
    if (chips.length < 2) return;
    const second = chips[1];
    const domainId = second.dataset.dom!;
    const expected = catalog.filter((e) => e.manifest.domain === domainId).length;
    second.click();
    expect(second.classList.contains('active')).toBe(true);
    expect(container.querySelector('#catalog-count-label')?.textContent).toContain(`${expected} упражнений`);
    container.querySelectorAll('.domain-group').forEach((g) => {
      const el = g as HTMLElement;
      expect(el.classList.contains('is-hidden')).toBe(el.dataset.group !== domainId);
    });
  });
});
