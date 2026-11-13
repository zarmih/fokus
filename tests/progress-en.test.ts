import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renderProgress } from '../src/ui/screens/progress';
import { storage } from '../src/core/storage';
import { setLocale } from '../src/core/i18n';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

const CYR = /[А-Яа-яЁё]/;

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  setLocale('ru');
});

describe('Progress screen in English', () => {
  test('empty state renders completely in English without Cyrillic', () => {
    setLocale('en');
    renderProgress(document.getElementById('app')!);

    const content = document.body.innerHTML;
    // Strip tag names and attributes that might be irrelevant, check full textContent
    const text = document.body.textContent || '';
    expect(text).not.toMatch(CYR);

    // Also assert there is no Cyrillic in aria-label, title, or button texts
    expect(content).not.toMatch(CYR);

    expect(text).toMatch(/Progress/);
    expect(text).toMatch(/Your skill profile and performance analytics/);
    expect(text).toMatch(/Activity \(Week\)/);
    expect(text).toMatch(/Review/);
    expect(text).toMatch(/Recent sessions/);
    expect(text).toMatch(/Skill profile/);
    expect(text).toMatch(/Personal norms/);
  });

  test('populated progress screen with history, domains, skills, achievements and rhythm has no Cyrillic', async () => {
    setLocale('en');

    const days = [];
    const now = new Date('2026-11-13T12:00:00Z');
    for (let i = 10; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      days.push({
        date: d.toISOString(),
        totalScore: 450,
        domainDeltas: { attention: 5, memory: 4, speed: 3 },
        streak: 11 - i,
        skipped: false,
        lifestyle: { sleep: 'high', stress: null }
      });
    }
    days.forEach((d) => storage.addDaySummary(d));

    storage.setDomains([
      { domain: 'attention', value: 750, trend: 5, updatedAt: days[10].date },
      { domain: 'memory', value: 680, trend: -2, updatedAt: days[10].date },
      { domain: 'speed', value: 590, trend: 1, updatedAt: days[10].date },
      { domain: 'flexibility', value: 620, trend: 0, updatedAt: days[10].date },
      { domain: 'logic', value: 710, trend: 3, updatedAt: days[10].date }
    ]);

    storage.setSkills([
      { skill: 'visual_memory', value: 650, confidence: 15, trend: 2, attempts: 12, lastUpdated: days[10].date },
      { skill: 'selective_attention', value: 720, confidence: 8, trend: 0, attempts: 4, lastUpdated: days[10].date }
    ]);

    storage.addHistory({
      date: '2026-11-13T10:30:00Z',
      minutes: 7,
      score: 420,
      accuracy: 0.94,
      domainDeltas: { attention: 4 }
    });
    storage.addHistory({
      date: '2026-11-12T09:15:00Z',
      minutes: 5,
      score: 310,
      accuracy: 0.88,
      domainDeltas: { memory: 3 }
    });

    storage.setSessions([
      {
        id: 's1',
        startedAt: '2026-11-13T10:30:00Z',
        finishedAt: '2026-11-13T10:37:00Z',
        durationSec: 420,
        mode: 'normal',
        items: [
          { exerciseId: 'schulte', level: 1, avgRtMs: 800, score: 100, accuracy: 0.95, rounds: 3 },
          { exerciseId: 'stroop', level: 1, avgRtMs: 700, score: 90, accuracy: 0.9, rounds: 3 },
          { exerciseId: 'n-back', level: 1, avgRtMs: 900, score: 110, accuracy: 0.85, rounds: 3 }
        ]
      },
      {
        id: 's2',
        startedAt: '2026-11-12T09:15:00Z',
        finishedAt: '2026-11-12T09:20:00Z',
        durationSec: 300,
        mode: 'normal',
        items: [
          { exerciseId: 'schulte', level: 1, avgRtMs: 820, score: 95, accuracy: 0.9, rounds: 3 },
          { exerciseId: 'stroop', level: 1, avgRtMs: 720, score: 85, accuracy: 0.88, rounds: 3 }
        ]
      }
    ]);

    storage.setProfile({
      ...storage.getProfile(),
      calibrated: true,
      onboarded: true,
      achievements: ['first_session', 'streak_3'],
      sessionLengthSec: 300
    });

    renderProgress(document.getElementById('app')!);

    // Let any async rendering (e.g. achievements import) settle
    await new Promise((r) => setTimeout(r, 50));

    const content = document.body.innerHTML;
    expect(content).not.toMatch(CYR);

    const text = document.body.textContent || '';
    expect(text).not.toMatch(CYR);

    // Key English labels
    expect(text).toMatch(/Progress/);
    expect(text).toMatch(/Activity \(Week\)/);
    expect(text).toMatch(/Total: \d+ pts/);
    expect(text).toMatch(/Recent sessions/);
    expect(text).toMatch(/Skill profile/);
    expect(text).toMatch(/Attention/);
    expect(text).toMatch(/Memory/);
    expect(text).toMatch(/Personal norms/);
    expect(text).toMatch(/Training rhythm/);
  });

  test('Russian locale stays intact and unchanged by default', () => {
    setLocale('ru');
    renderProgress(document.getElementById('app')!);

    const text = document.body.textContent || '';
    expect(text).toMatch(/Статистика/);
    expect(text).toMatch(/Активность \(Неделя\)/);
    expect(text).toMatch(/Последние сессии/);
    expect(text).toMatch(/Профиль навыков/);
  });
});
