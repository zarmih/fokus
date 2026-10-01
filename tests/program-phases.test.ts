import { describe, expect, test } from 'vitest';
import {
  describeProgramPhase,
  phaseForWeek,
  PROGRAM_PHASES
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
});
