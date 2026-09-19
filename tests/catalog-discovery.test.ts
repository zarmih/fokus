import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { renderTrainers } from '../src/ui/screens/trainers';
import { storage } from '../src/core/storage';

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

  test('renders search and filters', () => {
    renderTrainers(container);
    const search = container.querySelector('.catalog-search') as HTMLInputElement;
    const selects = container.querySelectorAll('.catalog-select');
    expect(search).toBeTruthy();
    expect(selects.length).toBeGreaterThanOrEqual(4);
  });

  test('search filters exercises and preserves focus/DOM by toggling is-hidden', () => {
    renderTrainers(container);
    const search = container.querySelector('.catalog-search') as HTMLInputElement;
    
    // We expect initial render to show some cards in the active wrap
    let activeWrap = container.querySelector('.catalog-group-wrap:not(.is-hidden)') as HTMLElement;
    let cards = activeWrap.querySelectorAll('.trainer-card');
    const initialVisible = Array.from(cards).filter(c => !c.parentElement!.classList.contains('is-hidden')).length;
    expect(initialVisible).toBeGreaterThan(0);
    
    // Type something that matches nothing
    search.value = 'zzzzzzzzzzzzzzzz';
    search.dispatchEvent(new Event('input'));
    
    cards = activeWrap.querySelectorAll('.trainer-card');
    const visibleAfterSearch = Array.from(cards).filter(c => !c.parentElement!.classList.contains('is-hidden')).length;
    expect(visibleAfterSearch).toBe(0);

    const empty = container.querySelector('.catalog-empty') as HTMLElement;
    expect(empty.classList.contains('is-hidden')).toBe(false);

    // Reset
    const reset = container.querySelector('.catalog-reset') as HTMLButtonElement;
    reset.click();
    expect(search.value).toBe('');
    
    cards = activeWrap.querySelectorAll('.trainer-card');
    const visibleAfterReset = Array.from(cards).filter(c => !c.parentElement!.classList.contains('is-hidden')).length;
    expect(visibleAfterReset).toBe(initialVisible);
  });

  test('groups exercises correctly', () => {
    renderTrainers(container);
    const groupSelect = container.querySelector('[data-filter="group"]') as HTMLSelectElement;
    
    // Default is domain
    expect(groupSelect.value).toBe('domain');
    let activeWrap = container.querySelector('.catalog-group-wrap-domain') as HTMLElement;
    expect(activeWrap.classList.contains('is-hidden')).toBe(false);

    // Switch to format
    groupSelect.value = 'format';
    groupSelect.dispatchEvent(new Event('change'));
    
    activeWrap = container.querySelector('.catalog-group-wrap-format') as HTMLElement;
    expect(activeWrap.classList.contains('is-hidden')).toBe(false);
    
    const domainWrap = container.querySelector('.catalog-group-wrap-domain') as HTMLElement;
    expect(domainWrap.classList.contains('is-hidden')).toBe(true);
  });
});
