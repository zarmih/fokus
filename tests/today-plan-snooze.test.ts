import { describe, it, expect } from 'vitest';
import { applySlotSnooze, rerollTodayPlanSlot, type TodayPlanItem } from '../src/core/today-plan';

describe('applySlotSnooze', () => {
  it('removes the id from the list', () => {
    const items: TodayPlanItem[] = [
      { exerciseId: 'one', reason: 'reason1' },
      { exerciseId: 'two', reason: 'reason2' }
    ];
    const res = applySlotSnooze(items, 'one');
    expect(res.applied).toBe(true);
    expect(res.items.length).toBe(1);
    expect(res.items[0].exerciseId).toBe('two');
  });

  it('refuses to empty the plan', () => {
    const items: TodayPlanItem[] = [
      { exerciseId: 'one', reason: 'reason1' }
    ];
    const res = applySlotSnooze(items, 'one');
    expect(res.applied).toBe(false);
    expect(res.items).toBe(items);
  });

  it('unknown id is a no-op', () => {
    const items: TodayPlanItem[] = [
      { exerciseId: 'one', reason: 'reason1' },
      { exerciseId: 'two', reason: 'reason2' }
    ];
    const res = applySlotSnooze(items, 'three');
    expect(res.applied).toBe(false);
    expect(res.items).toBe(items);
  });

  it('does not mutate reroll behavior', () => {
    const items: TodayPlanItem[] = [
      { exerciseId: 'one', reason: 'reason1', domain: 'dom1', nextExerciseId: 'alt1', nextDomain: 'dom1' },
      { exerciseId: 'two', reason: 'reason2', domain: 'dom2' }
    ];
    const res = applySlotSnooze(items, 'two');
    expect(res.applied).toBe(true);
    
    // call rerollTodayPlanSlot once to show it still returns a result
    const rerollRes = rerollTodayPlanSlot(res.items, 0);
    expect(rerollRes.applied).toBe(true);
    expect(rerollRes.items[0].exerciseId).toBe('alt1');
  });
});
