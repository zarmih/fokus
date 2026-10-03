import { expect, test, beforeEach, describe, vi, afterEach } from 'vitest';
import { questCalendarDay, getDailyQuests, updateQuestProgress, mondayOfMoscowWeek, getWeeklyGoal, updateWeeklyGoalProgress } from '../src/core/quests';
import { storage } from '../src/core/storage';
import { buildFirstWeekPlan } from '../src/core/onboarding';
import type { Quest } from '../src/core/quests';

describe('Quest Day and Gentle Days', () => {
  beforeEach(() => {
    storage.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('questCalendarDay uses Moscow day, not UTC', () => {
    // 2026-10-03T22:30:00.000Z is 2026-10-04 01:30 in Moscow
    expect(questCalendarDay(new Date('2026-10-03T22:30:00.000Z'))).toBe('2026-10-04');
    // 2026-10-03T20:30:00.000Z is 2026-10-03 23:30 in Moscow
    expect(questCalendarDay(new Date('2026-10-03T20:30:00.000Z'))).toBe('2026-10-03');
  });

  test('getDailyQuests stores Moscow civil day in profile.questsDate', () => {
    vi.setSystemTime(new Date('2026-10-03T22:30:00.000Z'));
    getDailyQuests();
    expect(storage.getProfile().questsDate).toBe('2026-10-04');
  });

  test('session progress strictly uses Moscow civil day boundaries', () => {
    // Freeze at a time where UTC date differs from Moscow date
    vi.setSystemTime(new Date('2026-10-03T22:30:00.000Z')); // 2026-10-04 in MSK
    
    // Generate quests to initialize questsDate
    getDailyQuests();
    
    // Force a blocks quest to ensure our assertion isn't flaky
    const p = storage.getProfile();
    p.quests = [
      {
        id: 'test_blocks',
        title: 'Test',
        description: 'Test',
        type: 'blocks',
        difficulty: 'easy',
        target: 10,
        progress: 0,
        completed: false,
        claimed: false,
        xpReward: 50
      } as Quest
    ];
    storage.setProfile(p);
    
    // Session started on the same Moscow day ('2026-10-04')
    storage.addSession({
      id: 's1',
      startedAt: '2026-10-03T22:30:00.000Z', // 2026-10-04 01:30 MSK
      finishedAt: '2026-10-03T22:35:00.000Z',
      durationSec: 300,
      items: [{ exerciseId: 'odd-one', accuracy: 1, score: 10, level: 1, avgRtMs: 500 }]
    });
    
    // Trigger sync
    updateQuestProgress('blocks', 0);
    
    let blocksQuest = storage.getProfile().quests?.find(q => q.id === 'test_blocks');
    expect(blocksQuest?.progress).toBe(1);

    // Session started on the previous Moscow day ('2026-10-03')
    storage.addSession({
      id: 's2',
      startedAt: '2026-10-03T20:00:00.000Z', // 2026-10-03 23:00 MSK
      finishedAt: '2026-10-03T20:05:00.000Z',
      durationSec: 300,
      items: [{ exerciseId: 'odd-one', accuracy: 1, score: 10, level: 1, avgRtMs: 500 }]
    });

    // Trigger sync
    updateQuestProgress('blocks', 0);
    
    blocksQuest = storage.getProfile().quests?.find(q => q.id === 'test_blocks');
    expect(blocksQuest?.progress).toBe(1); // Should not increase
  });

  test('gentle days use rest_kept quest on any gentle intensity day', () => {
    const plan = buildFirstWeekPlan({ primaryGoal: 'attention', sessionLengthSec: 480, startDate: '2026-10-01' });
    
    expect(plan.days[0].intensity).toBe('gentle'); // day 1
    expect(plan.days[1].intensity).toBe('gentle'); // day 2
    expect(plan.days[2].intensity).toBe('gentle'); // day 3
    expect(plan.days[3].intensity).toBe('gentle'); // day 4
    expect(plan.days[4].intensity).toBe('steady'); // day 5
    expect(plan.days[5].intensity).toBe('full');   // day 6

    const checkDay = (isoTime: string, expectRestKept: boolean) => {
      storage.reset();
      const p = storage.getProfile();
      p.firstWeekPlan = plan;
      storage.setProfile(p);
      
      vi.setSystemTime(new Date(isoTime));
      const quests = getDailyQuests();
      const hasRestKept = quests.some(q => q.id === 'rest_kept');
      expect(hasRestKept).toBe(expectRestKept);
    };

    checkDay('2026-10-01T12:00:00.000Z', true); // day 1
    checkDay('2026-10-02T12:00:00.000Z', true); // day 2
    checkDay('2026-10-03T12:00:00.000Z', true); // day 3
    checkDay('2026-10-04T12:00:00.000Z', true); // day 4
    checkDay('2026-10-05T12:00:00.000Z', false); // day 5
    checkDay('2026-10-06T12:00:00.000Z', false); // day 6
  });
});

describe('Weekly Quest Goals (Moscow Week)', () => {
  beforeEach(() => {
    storage.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('mondayOfMoscowWeek returns Monday for Moscow time, crossing UTC days correctly', () => {
    // 2026-10-04 is a Sunday. Late UTC Sunday is already Monday in Moscow.
    // 2026-10-04T22:30:00.000Z is 2026-10-05 01:30 MSK (Monday)
    // The previous week started on 2026-09-28. The new week starts on 2026-10-05.
    vi.setSystemTime(new Date('2026-10-04T22:30:00.000Z'));
    expect(mondayOfMoscowWeek()).toBe('2026-10-05');
    
    // A bit earlier, 2026-10-04T19:00:00.000Z is 2026-10-04 22:00 MSK (Sunday)
    // Week should still be 2026-09-28
    vi.setSystemTime(new Date('2026-10-04T19:00:00.000Z'));
    expect(mondayOfMoscowWeek()).toBe('2026-09-28');
  });

  test('getWeeklyGoal and updateWeeklyGoalProgress agree on same Moscow weekStart', () => {
    // Set time to a boundary: Sunday night UTC, Monday morning MSK.
    vi.setSystemTime(new Date('2026-10-04T23:00:00.000Z')); // 2026-10-05 02:00 MSK (Monday)
    
    const goal = getWeeklyGoal();
    expect(goal.startIso).toBe('2026-10-05');
    expect(goal.progress).toBe(0);

    // Update progress
    updateWeeklyGoalProgress(goal.domain, 5);
    
    const updated = getWeeklyGoal();
    expect(updated.startIso).toBe('2026-10-05');
    expect(updated.progress).toBe(5);
  });
});
