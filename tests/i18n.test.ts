import { expect, test, beforeEach, afterEach, vi } from 'vitest';
import { dictionaryEntry, dictionaryKeys, hasKey, setLocale, t } from '../src/core/i18n';
import { exerciseInstruction, exerciseName } from '../src/core/labels';
import { registry } from '../src/exercises/registry';
import { renderToday } from '../src/ui/screens/today';
import { renderSettings } from '../src/ui/screens/settings';
import { renderResult } from '../src/ui/screens/result';
import { renderSession } from '../src/ui/screens/session';
import { storage } from '../src/core/storage';
import type { Session } from '../src/core/types';

const CYRILLIC_OK = new Set(['settings.lang', 'settings.lang_ru']);

beforeEach(() => {
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
  setLocale('ru');
});

afterEach(() => {
  setLocale('ru');
  vi.useRealTimers();
});

test('every key has non-empty RU and EN', () => {
  const keys = dictionaryKeys();
  expect(keys.length).toBeGreaterThan(80);
  for (const key of keys) {
    const entry = dictionaryEntry(key);
    expect(entry, key).toBeTruthy();
    expect(entry!.ru.trim(), `${key}.ru`).not.toBe('');
    expect(entry!.en.trim(), `${key}.en`).not.toBe('');
  }
});

test('EN copy has no leftover Cyrillic except language labels', () => {
  for (const key of dictionaryKeys()) {
    if (CYRILLIC_OK.has(key)) continue;
    const entry = dictionaryEntry(key)!;
    expect(entry.en, key).not.toMatch(/[А-Яа-яЁё]/);
  }
});

test('missing keys fall back to the key itself', () => {
  expect(t('does.not.exist')).toBe('does.not.exist');
});

test('interpolation fills named slots', () => {
  setLocale('en');
  expect(t('today.coverage', { n: 3 })).toBe('3 of 5 domains');
  setLocale('ru');
  expect(t('today.coverage', { n: 3 })).toBe('3 из 5 областей');
});

test('catalog exercises have name and instruction keys without registry edits', () => {
  expect(registry.length).toBeGreaterThan(20);
  for (const mod of registry) {
    const id = mod.manifest.id;
    expect(hasKey(`ex.${id}.name`), id).toBe(true);
    expect(hasKey(`ex.${id}.instruction`), id).toBe(true);
    setLocale('ru');
    expect(exerciseName(id, mod.manifest.name)).toBe(mod.manifest.name);
    expect(exerciseInstruction(id, mod.manifest.instruction)).toBe(mod.manifest.instruction);
    setLocale('en');
    expect(exerciseName(id)).not.toMatch(/[А-Яа-яЁё]/);
    expect(exerciseInstruction(id)).not.toMatch(/[А-Яа-яЁё]/);
  }
});

test('today shell and program CTA switch with locale', () => {
  const p = storage.getProfile();
  p.onboarded = true;
  p.calibrated = true;
  p.sessionLengthSec = 300;
  storage.setProfile(p);
  const app = document.getElementById('app')!;

  setLocale('ru');
  renderToday(app);
  expect(app.textContent).toMatch(/Тренировка дня/);
  expect(app.textContent).toMatch(/Начать сессию/);
  expect(app.textContent).toMatch(/Квесты дня/);

  setLocale('en');
  renderToday(app);
  expect(app.textContent).toMatch(/Today’s session/);
  expect(app.textContent).toMatch(/Start session/);
  expect(app.textContent).toMatch(/Daily quests/);
  expect(app.textContent).not.toMatch(/Начать сессию/);
  expect(app.textContent).not.toMatch(/Тренировка дня/);
});

test('settings chrome is English when locale is en', () => {
  setLocale('en');
  const app = document.getElementById('app')!;
  renderSettings(app);
  expect(app.textContent).toMatch(/Settings/);
  expect(app.textContent).toMatch(/Session length/);
  expect(app.textContent).toMatch(/Primary goal/);
  expect(app.textContent).toMatch(/Enable sound cues/);
  expect(app.textContent).toMatch(/Reset profile/);
  expect(app.textContent).not.toMatch(/Настройки/);
  expect(app.textContent).not.toMatch(/Сбросить профиль/);
});

test('result chrome and labels switch with locale', () => {
  const session: Session = {
    id: 'i18n-session',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 300,
    items: [{
      exerciseId: 'grid-memory',
      level: 3,
      accuracy: 0.9,
      avgRtMs: 1200,
      score: 45,
      performance: 450,
      masteryBefore: 20,
      masteryAfter: 25,
      difficultyBefore: 3.0,
      difficultyAfter: 3.2,
      confidenceAfter: 80,
      progressionState: 'up'
    }]
  };
  const app = document.getElementById('app')!;

  setLocale('en');
  renderResult(app, { session });
  expect(app.textContent).toMatch(/Session complete/);
  expect(app.textContent).toMatch(/Grid/);
  expect(app.textContent).toMatch(/Accuracy 90%/);
  expect(app.textContent).toMatch(/Form 450/);
  expect(app.textContent).toMatch(/Mastery/);
  expect(app.textContent).toMatch(/Rising/);
  expect(app.textContent).toMatch(/Next step/);
  expect(app.textContent).toMatch(/Share/);
  expect(app.textContent).not.toMatch(/Тренировка завершена/);
  expect(app.textContent).not.toMatch(/Матрица/);
});

test('session program chrome is English when locale is en', () => {
  setLocale('en');
  vi.useFakeTimers();
  const app = document.getElementById('app')!;
  renderSession(app, { mode: 'practice', items: [{ exerciseId: 'odd-one' }] });
  expect(app.textContent).toMatch(/Back/);
  expect(app.textContent).toMatch(/Pause/);
  expect(app.textContent).toMatch(/Restart/);
  expect(app.textContent).toMatch(/Start/);
  expect(app.textContent).toMatch(/Odd One/);
  expect(app.textContent).toMatch(/Block 1 of 1/);
  expect(app.textContent).not.toMatch(/Назад/);
  expect(app.textContent).not.toMatch(/Лишний/);
});
