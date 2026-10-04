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
  const secondChip = chips.find(c => c.dataset.dom !== 'all' && c.dataset.dom !== 'discovery');
  if (!secondChip) return;
  
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

test('renderTrainers renders cards with inline SVG and no external HTTP images', () => {
  const container = document.createElement('div');
  renderTrainers(container);

  const cards = Array.from(container.querySelectorAll('.trainer-card')) as HTMLElement[];
  expect(cards.length).toBeGreaterThan(0);

  const svgs: string[] = [];

  for (const card of cards) {
    // Should have inline SVG instead of img icon
    const svg = card.querySelector('svg');
    expect(svg).toBeTruthy();
    
    const svgMarkup = svg!.outerHTML;
    expect(svgMarkup).not.toContain('http://');
    expect(svgMarkup).not.toContain('https://');
    
    // Should not have any <image href="..."> inside SVG
    expect(svgMarkup).not.toContain('<image ');

    // Should not have any bitmap/data URI
    expect(svgMarkup).not.toContain('data:');

    // Should have ground, object, and accent parts
    expect(svgMarkup).toContain('data-part="ground"');
    expect(svgMarkup).toContain('data-part="object"');
    expect(svgMarkup).toContain('data-part="accent"');

    // Should show the exercise name
    const nameEl = card.querySelector('.trainer-name');
    expect(nameEl).toBeTruthy();
    expect(nameEl!.textContent?.trim().length).toBeGreaterThan(0);

    svgs.push(svgMarkup);
  }

  // Two different exercise ids produce different SVG markup
  if (svgs.length >= 2) {
    const firstSvg = svgs[0];
    const differentSvg = svgs.find(s => s !== firstSvg);
    expect(differentSvg).toBeDefined();
  }

  // Check consecutive cards in each domain group
  const groups = Array.from(container.querySelectorAll('.domain-group')) as HTMLElement[];
  for (const group of groups) {
    const groupCards = Array.from(group.querySelectorAll('.trainer-card')) as HTMLElement[];
    for (let i = 0; i < groupCards.length - 1; i++) {
      const svg1 = groupCards[i].querySelector('svg')?.outerHTML;
      const svg2 = groupCards[i + 1].querySelector('svg')?.outerHTML;
      expect(svg1).toBeDefined();
      expect(svg2).toBeDefined();
      expect(svg1).not.toEqual(svg2);
    }
  }
});

