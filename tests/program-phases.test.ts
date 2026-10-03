import { describe, expect, test } from 'vitest';
import {
  describeProgramPhase,
  phaseForWeek,
  PROGRAM_PHASES,
  isPhaseMilestoneDay,
  milestoneExerciseId,
  milestoneReason
} from '../src/core/program-phases';

describe('program-phases — 2–4 week goals', () => {
  test('four phases cover weeks 1…∞ without gaps', () => {
    expect(PROGRAM_PHASES).toHaveLength(4);
    expect(phaseForWeek(1).id).toBe('orient');
    expect(phaseForWeek(2).id).toBe('orient');
    expect(phaseForWeek(3).id).toBe('balance');
    expect(phaseForWeek(4).id).toBe('balance');
    expect(phaseForWeek(5).id).toBe('focus');
    expect(phaseForWeek(6).id).toBe('focus');
    expect(phaseForWeek(7).id).toBe('sustain');
    expect(phaseForWeek(20).id).toBe('sustain');
    for (const p of PROGRAM_PHASES) {
      const span = Math.min(p.weekTo, 8) - p.weekFrom + 1;
      expect(span).toBeGreaterThanOrEqual(2);
      expect(span).toBeLessThanOrEqual(4);
      expect(p.goal.length).toBeGreaterThan(20);
      expect(p.title).not.toMatch(/^День\s+\d/i);
    }
  });

  test('describeProgramPhase leads with goal, week/day is secondary', () => {
    const v = describeProgramPhase({ weekIndex: 3, dayInWeek: 2, calibrated: true });
    expect(v.subtitle).toMatch(/Фаза 2/);
    expect(v.subtitle).toMatch(/Баланс/);
    expect(v.goalLine).toMatch(/област/i);
    expect(v.weekDayLine).toMatch(/Неделя 3 · день 2/);
    expect(v.phaseCoach).toContain(v.phase.title);
    expect(v.progressInPhase).toBeGreaterThan(0);
    expect(v.progressInPhase).toBeLessThan(1);
  });

  test('focus phase personalizes goal from primaryGoal', () => {
    const v = describeProgramPhase({
      weekIndex: 5,
      dayInWeek: 1,
      primaryGoal: 'memory',
      calibrated: true
    });
    expect(v.phase.id).toBe('focus');
    expect(v.goalLine).toMatch(/Память/);
  });

  test('uncalibrated overrides goal toward calibration', () => {
    const v = describeProgramPhase({ weekIndex: 1, dayInWeek: 1, calibrated: false });
    expect(v.goalLine).toMatch(/калибровк/i);
  });

  test('milestone calendar and copy', () => {
    // True: week 2 day 7, week 4 day 7, week 6 day 7
    expect(isPhaseMilestoneDay(2, 7)).toBe(true);
    expect(isPhaseMilestoneDay(4, 7)).toBe(true);
    expect(isPhaseMilestoneDay(6, 7)).toBe(true);
    
    // False examples
    expect(isPhaseMilestoneDay(2, 6)).toBe(false);
    expect(isPhaseMilestoneDay(7, 7)).toBe(false);
    expect(isPhaseMilestoneDay(9, 7)).toBe(false);

    // Sustain loop: 8, 10, 12 etc day 7
    expect(isPhaseMilestoneDay(8, 7)).toBe(true);
    expect(isPhaseMilestoneDay(10, 7)).toBe(true);
    expect(isPhaseMilestoneDay(12, 7)).toBe(true);

    // Alternation
    expect(milestoneExerciseId(2)).toBe('tide-gate');
    expect(milestoneExerciseId(4)).toBe('anchor-pair');
    expect(milestoneExerciseId(6)).toBe('tide-gate');
    expect(milestoneExerciseId(8)).toBe('tide-gate');
    expect(milestoneExerciseId(10)).toBe('anchor-pair');
    expect(milestoneExerciseId(12)).toBe('tide-gate');

    const copy = milestoneReason(2);
    expect(copy).not.toMatch(/IQ|босс|wikium|прокачай/i);
    expect(copy).toContain('Прилив у ворот');
    expect(copy).toMatch(/^Веха фазы/);
    
    const copy2 = milestoneReason(4);
    expect(copy2).toContain('Якорная пара');
  });

  test('describeProgramPhase includes narrative and milestone previews', () => {
    // Sparse/uncalibrated
    const uncal = describeProgramPhase({ weekIndex: 1, dayInWeek: 1, calibrated: false });
    expect(uncal.phaseNarrative).toMatch(/калибровка/i);
    
    // Focus phase narrative
    const focus = describeProgramPhase({ weekIndex: 5, dayInWeek: 1, calibrated: true, primaryGoal: 'memory' });
    expect(focus.phaseNarrative).toMatch(/Память/);

    // Milestone previews
    const noPreview = describeProgramPhase({ weekIndex: 1, dayInWeek: 4, calibrated: true }); // No milestone in week 1
    expect(noPreview.milestonePreview).toBeNull();

    const upcoming = describeProgramPhase({ weekIndex: 2, dayInWeek: 5, calibrated: true }); // Week 2 is orient milestone week
    expect(upcoming.milestonePreview).toMatch(/Через 2 дня рубеж/);

    const today = describeProgramPhase({ weekIndex: 2, dayInWeek: 7, calibrated: true });
    expect(today.milestonePreview).toMatch(/Сегодня рубеж/);
  });

  test('describeProgramPhase includes carryLine in the last 2 days of a phase', () => {
    // Not near the end
    const midPhase = describeProgramPhase({ weekIndex: 1, dayInWeek: 4 });
    expect(midPhase.carryLine).toBeNull();

    // Orient end
    const orientEnd = describeProgramPhase({ weekIndex: 2, dayInWeek: 6 });
    expect(orientEnd.carryLine).not.toBeNull();
    expect(orientEnd.carryLine?.length).toBeGreaterThan(0);

    // Balance end
    const balanceEnd = describeProgramPhase({ weekIndex: 4, dayInWeek: 7 });
    expect(balanceEnd.carryLine).not.toBeNull();
    expect(balanceEnd.carryLine?.length).toBeGreaterThan(0);

    // Strings differ
    expect(orientEnd.carryLine).not.toBe(balanceEnd.carryLine);
    
    // Focus end
    const focusEnd = describeProgramPhase({ weekIndex: 6, dayInWeek: 6 });
    expect(focusEnd.carryLine).not.toBeNull();
    
    // Sustain end
    const sustainEnd = describeProgramPhase({ weekIndex: 999, dayInWeek: 7 });
    expect(sustainEnd.carryLine).not.toBeNull();
  });
});
