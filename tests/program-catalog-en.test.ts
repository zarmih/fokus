import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { setLocale, getLocale } from '../src/core/i18n';
import { storage } from '../src/core/storage';
import { renderProgram } from '../src/ui/screens/program';
import { renderTrainers } from '../src/ui/screens/trainers';
import { buildFirstWeekPlan } from '../src/core/onboarding';
import { calendarDayKey, resolveFokusTimeZone } from '../src/core/streak';
import type { DaySummary } from '../src/core/types';

const CYRILLIC = /[А-Яа-яЁё]/;

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

describe('Program and Trainers screens EN translation (Task D)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    (storage as any).backend = new MockStorage();
    storage.reset();
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app')!;
  });

  afterEach(() => {
    setLocale('ru');
  });

  test('Program screen in EN (initial / uncalibrated state) has no Cyrillic', () => {
    setLocale('en');
    const p = storage.getProfile();
    p.calibrated = false;
    p.onboarded = true;
    storage.setProfile(p);

    renderProgram(container);

    const html = container.innerHTML;
    const text = container.textContent || '';

    expect(html).not.toMatch(CYRILLIC);
    expect(text).not.toMatch(CYRILLIC);
    expect(text).toContain('Level calibration');
    expect(text).toContain('Clear next step');
    expect(text).toContain('Start calibration');
    expect(text).toContain('Catalog');
  });

  test('Program screen in EN (populated calibrated state) has no Cyrillic', () => {
    setLocale('en');
    const p = storage.getProfile();
    p.calibrated = true;
    p.onboarded = true;
    p.firstWeekPlan = buildFirstWeekPlan({ startDate: '2026-09-01', primaryGoal: 'memory', sessionLengthSec: 900 });
    storage.setProfile(p);

    const now = '2026-09-05T10:00:00.000Z';
    const summaries: DaySummary[] = [
      { date: '2026-09-01', totalScore: 100, domainDeltas: { memory: 5, attention: 3 }, streak: 1, skipped: false },
      { date: '2026-09-02', totalScore: 120, domainDeltas: { memory: 4, attention: 4 }, streak: 2, skipped: false },
      { date: '2026-09-03', totalScore: 110, domainDeltas: { memory: 6, logic: 2 }, streak: 3, skipped: false },
      { date: '2026-09-04', totalScore: 130, domainDeltas: { memory: 5, speed: 5 }, streak: 4, skipped: false }
    ];
    summaries.forEach((ds) => storage.addDaySummary(ds));
    storage.setSessions([
      {
        id: 's1',
        startedAt: now,
        finishedAt: now,
        durationSec: 300,
        items: [
          { exerciseId: 'grid-memory', level: 3, accuracy: 0.9, avgRtMs: 650, score: 95 },
          { exerciseId: 'stroop', level: 2, accuracy: 0.85, avgRtMs: 700, score: 85 }
        ]
      }
    ]);
    storage.setDomains([
      { domain: 'attention', value: 650, trend: 1, updatedAt: now },
      { domain: 'memory', value: 720, trend: 1, updatedAt: now },
      { domain: 'speed', value: 600, trend: 0, updatedAt: now },
      { domain: 'flexibility', value: 580, trend: 0, updatedAt: now },
      { domain: 'logic', value: 610, trend: 0, updatedAt: now }
    ]);

    renderProgram(container);

    const html = container.innerHTML;
    const text = container.textContent || '';

    expect(html).not.toMatch(CYRILLIC);
    expect(text).not.toMatch(CYRILLIC);
    expect(text).toContain('Phase');
    expect(text).toContain('Your rhythm');
    expect(text).toContain('Ability vector');
    expect(text).toContain('Daily workout');
    expect(text).toContain('Streak (days)');
  });

  test('Program screen in EN (played today state) has no Cyrillic', () => {
    setLocale('en');
    const p = storage.getProfile();
    p.calibrated = true;
    p.onboarded = true;
    storage.setProfile(p);

    const tz = resolveFokusTimeZone().timeZone;
    const todayStr = calendarDayKey(new Date(), tz);
    [
      { date: todayStr, totalScore: 150, domainDeltas: { memory: 10 }, streak: 1, skipped: false }
    ].forEach((ds) => storage.addDaySummary(ds));

    renderProgram(container);

    const html = container.innerHTML;
    const text = container.textContent || '';

    expect(html).not.toMatch(CYRILLIC);
    expect(text).not.toMatch(CYRILLIC);
    expect(text).toContain('Workout complete');
    expect(text).toContain('Done for today');
    expect(text).toContain('One more session');
  });

  test('Trainers screen in EN has no Cyrillic in DOM or text', () => {
    setLocale('en');
    renderTrainers(container);

    const html = container.innerHTML;
    const text = container.textContent || '';

    expect(html).not.toMatch(CYRILLIC);
    expect(text).not.toMatch(CYRILLIC);

    // Title and count label
    expect(text).toContain('Trainers');
    expect(text).toContain('Free practice');

    // Filter chips
    const chips = Array.from(container.querySelectorAll('.filter-chip')).map((c) => c.textContent || '');
    expect(chips.some((t) => t.includes('All'))).toBe(true);
    expect(chips.some((t) => t.includes('Core program'))).toBe(true);
    expect(chips.some((t) => t.includes('Attention'))).toBe(true);
    expect(chips.some((t) => t.includes('Memory'))).toBe(true);

    // Search placeholder and aria-label
    const searchInput = container.querySelector<HTMLInputElement>('#catalog-search')!;
    expect(searchInput.placeholder).toBe('Search by name or skill...');
    expect(searchInput.getAttribute('aria-label')).toBe('Search exercises');

    // Exercise cards Title Case conversion for non-core exercises
    const cardNames = Array.from(container.querySelectorAll('.trainer-name')).map((el) => el.textContent || '');
    expect(cardNames.length).toBeGreaterThan(15);
    for (const name of cardNames) {
      expect(name).not.toMatch(CYRILLIC);
      expect(name.length).toBeGreaterThan(0);
    }

    // All aria-labels on cards
    const cards = Array.from(container.querySelectorAll<HTMLElement>('.trainer-card'));
    for (const card of cards) {
      const aria = card.getAttribute('aria-label') || '';
      expect(aria).not.toMatch(CYRILLIC);
      const search = card.getAttribute('data-search') || '';
      expect(search).not.toMatch(CYRILLIC);
    }
  });

  test('Trainers screen in EN empty search state has no Cyrillic', () => {
    setLocale('en');
    renderTrainers(container);

    const searchInput = container.querySelector<HTMLInputElement>('#catalog-search')!;
    searchInput.value = 'xyznonexistentquery';
    searchInput.dispatchEvent(new Event('input'));

    const emptyState = container.querySelector<HTMLElement>('#catalog-empty-state')!;
    expect(emptyState.style.display).not.toBe('none');

    const html = container.innerHTML;
    const text = container.textContent || '';

    expect(html).not.toMatch(CYRILLIC);
    expect(text).not.toMatch(CYRILLIC);
    expect(text).toContain('Nothing found');
    expect(text).toContain('Clear search');
  });

  test('Russian locale remains default and unchanged', () => {
    expect(getLocale()).toBe('ru');

    // Program screen in RU
    const p = storage.getProfile();
    p.calibrated = false;
    storage.setProfile(p);
    renderProgram(container);

    expect(container.textContent).toContain('Калибровка уровня');
    expect(container.textContent).toContain('Начать калибровку');

    // Trainers screen in RU
    container.innerHTML = '';
    renderTrainers(container);

    expect(container.textContent).toContain('Каталог');
    expect(container.textContent).toContain('Свободная практика');
    const chips = Array.from(container.querySelectorAll('.filter-chip')).map((c) => c.textContent || '');
    expect(chips.some((t) => t.includes('Все'))).toBe(true);
    expect(chips.some((t) => t.includes('Основная программа'))).toBe(true);
  });
});
