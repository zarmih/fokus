import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { CORE_EXERCISES, CORE_EXERCISE_IDS, isCoreExercise } from '../src/core/core-catalog';
import { EXERCISE_TIPS, EXERCISE_TIPS_EN, domainSessionTip } from '../src/core/exercise-content';
import { getQuietCoachTip, getDailySpark } from '../src/core/coach';
import { setLocale, getLocale } from '../src/core/i18n';
import { renderToday } from '../src/ui/screens/today';
import { storage } from '../src/core/storage';
import { buildContinuitySnapshot } from '../src/core/continuity';
import { assessRetention } from '../src/core/retention';
import type { Session, Profile } from '../src/core/types';

const CYRILLIC_REGEX = /[А-Яа-яЁё]/;

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

describe('English Core Coach Content', () => {
  const originalLocale = getLocale();

  beforeEach(() => {
    (storage as any).backend = new MockStorage();
    storage.reset();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    setLocale(originalLocale);
  });

  test('all 15 core exercises are covered in CORE_EXERCISES', () => {
    expect(CORE_EXERCISE_IDS.length).toBe(15);
    const expectedIds = [
      'odd-one', 'go-no-go', 'tide-gate',
      'grid-memory', 'sequence', 'anchor-pair',
      'math-sprint', 'slip-mark', 'cut-bar',
      'stroop', 'switch-rule', 'helix-flip',
      'pattern-next', 'shape-equation', 'pulley'
    ];
    for (const id of expectedIds) {
      expect(isCoreExercise(id)).toBe(true);
      expect(CORE_EXERCISE_IDS).toContain(id);
    }
  });

  test('all 15 core exercises have calm, non-empty English tips without Cyrillic', () => {
    setLocale('en');
    for (const [domain, ids] of Object.entries(CORE_EXERCISES)) {
      for (const id of ids) {
        const tipEn = EXERCISE_TIPS_EN[id];
        expect(tipEn, `Missing English tip for core exercise: ${id}`).toBeDefined();
        expect(typeof tipEn).toBe('string');
        expect(tipEn.trim().length).toBeGreaterThan(15);
        expect(tipEn).not.toMatch(CYRILLIC_REGEX);
        // Calm product voice: no FOMO, no brain-training tropes
        expect(tipEn).not.toMatch(/IQ|lumosity|wikium|neuro|hack|genius|supercharge|last chance/i);

        // Verify domainSessionTip picks up the English tip when locale is 'en'
        const sessionTipEn = domainSessionTip(domain as any, 1, id);
        expect(sessionTipEn).toBeDefined();
        expect(sessionTipEn.length).toBeGreaterThan(0);
        expect(sessionTipEn).not.toMatch(CYRILLIC_REGEX);
      }
    }
  });

  test('Russian coach tips for core exercises remain intact and contain Cyrillic', () => {
    setLocale('ru');
    for (const [domain, ids] of Object.entries(CORE_EXERCISES)) {
      for (const id of ids) {
        const tipRu = EXERCISE_TIPS[id];
        expect(tipRu, `Missing Russian tip for core exercise: ${id}`).toBeDefined();
        expect(typeof tipRu).toBe('string');
        expect(tipRu.trim().length).toBeGreaterThan(15);
        expect(tipRu).toMatch(CYRILLIC_REGEX);

        // Verify domainSessionTip picks up the Russian tip by default
        const sessionTipRu = domainSessionTip(domain as any, 1, id);
        expect(sessionTipRu).toBeDefined();
        expect(sessionTipRu).toMatch(CYRILLIC_REGEX);
      }
    }
  });

  test('getQuietCoachTip returns English copy without Cyrillic when locale is en', () => {
    setLocale('en');

    const snapActive = buildContinuitySnapshot();
    const retActive = assessRetention({
      daySummaries: [],
      sessions: [],
      domains: [],
      playedToday: false,
      streak: 1
    });

    // In first week calibration
    const tipFirstWeek = getQuietCoachTip({
      continuity: snapActive,
      retention: retActive,
      inFirstWeek: true,
      playedToday: false
    });
    expect(tipFirstWeek).toBeDefined();
    expect(tipFirstWeek?.length).toBeGreaterThan(0);
    expect(tipFirstWeek).not.toMatch(CYRILLIC_REGEX);

    // Active ritual restart
    const snapRitual = {
      ...snapActive,
      ritual: { ...snapActive.ritual, active: true }
    };
    const tipRitual = getQuietCoachTip({
      continuity: snapRitual,
      retention: retActive,
      playedToday: false
    });
    expect(tipRitual).toBeDefined();
    expect(tipRitual).not.toMatch(CYRILLIC_REGEX);

    // Retention gap recovery scenario
    const retGap = {
      ...retActive,
      gapDays: 2,
      band: 'watch' as const
    };
    const tipRecovery = getQuietCoachTip({
      continuity: snapActive,
      retention: retGap,
      playedToday: false
    });
    expect(tipRecovery).toBeDefined();
    expect(tipRecovery).not.toMatch(CYRILLIC_REGEX);

    // In Russian, returns Russian copy
    setLocale('ru');
    const tipRu = getQuietCoachTip({
      continuity: snapRitual,
      retention: retActive,
      playedToday: false
    });
    expect(tipRu).toMatch(CYRILLIC_REGEX);
  });

  test('getDailySpark produces non-empty English copy without Cyrillic for uncalibrated user', () => {
    setLocale('en');
    const spark = getDailySpark({
      domains: [],
      skills: [],
      states: [],
      daySummaries: [],
      sessions: [],
      calibrated: false,
      playedToday: false,
      streak: 0
    });

    expect(spark.tone).toBe('start');
    expect(spark.title).toBeDefined();
    expect(spark.title.length).toBeGreaterThan(0);
    expect(spark.title).not.toMatch(CYRILLIC_REGEX);

    expect(spark.body).toBeDefined();
    expect(spark.body.length).toBeGreaterThan(0);
    expect(spark.body).not.toMatch(CYRILLIC_REGEX);
    expect(spark.body).toMatch(/calibrat/i);

    if (spark.quietTip) {
      expect(spark.quietTip).not.toMatch(CYRILLIC_REGEX);
    }
  });

  test('getDailySpark produces non-empty English copy without Cyrillic when session played today', () => {
    setLocale('en');
    const spark = getDailySpark({
      domains: [],
      skills: [],
      states: [],
      daySummaries: [],
      sessions: [],
      calibrated: true,
      playedToday: true,
      streak: 4
    });

    expect(spark.tone).toBe('habit');
    expect(spark.title).toBeDefined();
    expect(spark.title.length).toBeGreaterThan(0);
    expect(spark.title).not.toMatch(CYRILLIC_REGEX);

    expect(spark.body).toBeDefined();
    expect(spark.body.length).toBeGreaterThan(0);
    expect(spark.body).not.toMatch(CYRILLIC_REGEX);
    expect(spark.body).toMatch(/rest|tomorrow/i);
  });

  test('getDailySpark produces non-empty English copy without Cyrillic for core plan items', () => {
    setLocale('en');
    const spark = getDailySpark({
      domains: [
        { domain: 'attention', value: 700, trend: 0, updatedAt: '2026-11-13T10:00:00Z' },
        { domain: 'memory', value: 680, trend: 0, updatedAt: '2026-11-13T10:00:00Z' }
      ],
      skills: [],
      states: [],
      daySummaries: [],
      sessions: [],
      calibrated: true,
      playedToday: false,
      streak: 3,
      planItems: [
        { exerciseId: 'tide-gate', reason: 'Focus on attention', domain: 'attention' },
        { exerciseId: 'anchor-pair', reason: 'Reinforce memory', domain: 'memory' }
      ]
    });

    expect(spark.title).toBeDefined();
    expect(spark.title.length).toBeGreaterThan(0);
    expect(spark.title).not.toMatch(CYRILLIC_REGEX);

    expect(spark.body).toBeDefined();
    expect(spark.body.length).toBeGreaterThan(0);
    expect(spark.body).not.toMatch(CYRILLIC_REGEX);

    if (spark.quietTip) {
      expect(spark.quietTip).not.toMatch(CYRILLIC_REGEX);
    }
  });

  test('Today screen un-hides English coach prose for core exercises without Cyrillic', () => {
    setLocale('en');
    const p = storage.getProfile();
    p.onboarded = true;
    p.calibrated = true;
    p.primaryGoal = 'attention';
    storage.setProfile(p);

    const app = document.getElementById('app')!;
    renderToday(app);

    // Workout coach insight must NOT be empty in English for core exercises
    const coachInsight = app.querySelector('.workout-coach-insight');
    expect(coachInsight, 'Coach insight element should exist').toBeTruthy();
    expect(coachInsight!.textContent?.trim().length).toBeGreaterThan(0);
    expect(coachInsight!.textContent).not.toMatch(CYRILLIC_REGEX);

    // Workout kicker must be present in English
    const kicker = app.querySelector('.workout-kicker');
    expect(kicker, 'Kicker should exist').toBeTruthy();
    expect(kicker!.textContent?.trim().length).toBeGreaterThan(0);
    expect(kicker!.textContent).not.toMatch(CYRILLIC_REGEX);

    // Quiet tip if rendered must be localized without Cyrillic
    const quietTip = app.querySelector('.coach-quiet-tip');
    if (quietTip) {
      expect(quietTip.textContent).not.toMatch(CYRILLIC_REGEX);
    }

    // Daily quests card must be localized without Cyrillic
    const questsCard = app.querySelector('.quests-card');
    if (questsCard) {
      expect(questsCard.textContent).not.toMatch(CYRILLIC_REGEX);
    }

    // Habit continuity card / hint if rendered must have no Cyrillic
    const continuityHint = app.querySelector('.continuity-hint');
    if (continuityHint) {
      expect(continuityHint.textContent).not.toMatch(CYRILLIC_REGEX);
    }
  });

  test('Today screen in Russian retains Russian coach copy by default', () => {
    setLocale('ru');
    const p = storage.getProfile();
    p.onboarded = true;
    p.calibrated = true;
    storage.setProfile(p);

    const app = document.getElementById('app')!;
    renderToday(app);

    const coachInsight = app.querySelector('.workout-coach-insight');
    expect(coachInsight).toBeTruthy();
    expect(coachInsight!.textContent).toMatch(CYRILLIC_REGEX);

    const kicker = app.querySelector('.workout-kicker');
    expect(kicker).toBeTruthy();
    expect(kicker!.textContent).toMatch(CYRILLIC_REGEX);
  });
});
