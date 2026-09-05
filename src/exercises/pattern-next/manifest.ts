import type { ExerciseManifest } from '../types';

export const patternNextManifest: ExerciseManifest = {
  id: 'pattern-next',
  name: 'Ряд',
  domain: 'logic',
  instruction: 'Выбери, что идёт дальше в ряду.',
  levels: {
    1: { ruleType: 'ADD_1', distractors: 3, targetMs: 8000, deadlineMs: 15000 },
    2: { ruleType: 'ADD_2', distractors: 3, targetMs: 7000, deadlineMs: 14000 },
    3: { ruleType: 'SUB_1', distractors: 3, targetMs: 6500, deadlineMs: 13000 },
    4: { ruleType: 'SUB_2', distractors: 3, targetMs: 6000, deadlineMs: 12000 },
    5: { ruleType: 'ADD_3', distractors: 3, targetMs: 6000, deadlineMs: 11000 },
    6: { ruleType: 'ADD_1', distractors: 4, targetMs: 5500, deadlineMs: 10000 },
    7: { ruleType: 'ADD_2', distractors: 4, targetMs: 5000, deadlineMs: 10000 },
    8: { ruleType: 'ALT_1_2', distractors: 3, targetMs: 5500, deadlineMs: 10000 },
    9: { ruleType: 'ALT_1_2', distractors: 4, targetMs: 5000, deadlineMs: 9500 },
    10: { ruleType: 'ALT_2_3', distractors: 3, targetMs: 5000, deadlineMs: 9000 },
    11: { ruleType: 'ALT_2_3', distractors: 4, targetMs: 4500, deadlineMs: 8500 },
    12: { ruleType: 'MUL_2', distractors: 3, targetMs: 4500, deadlineMs: 8000 },
    13: { ruleType: 'MUL_2', distractors: 4, targetMs: 4000, deadlineMs: 7500 },
    14: { ruleType: 'ALT_1_MINUS_2', distractors: 3, targetMs: 4500, deadlineMs: 7500 },
    15: { ruleType: 'ALT_1_MINUS_2', distractors: 4, targetMs: 4000, deadlineMs: 7000 },
    16: { ruleType: 'MUL_3', distractors: 3, targetMs: 4500, deadlineMs: 7000 },
    17: { ruleType: 'MUL_3', distractors: 4, targetMs: 4000, deadlineMs: 6500 },
    18: { ruleType: 'SQUARE', distractors: 3, targetMs: 4000, deadlineMs: 6000 },
    19: { ruleType: 'SQUARE', distractors: 4, targetMs: 3500, deadlineMs: 5500 },
    20: { ruleType: 'FIBONACCI', distractors: 3, targetMs: 3500, deadlineMs: 5000 }
  }
};

export function getPatternNextParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return patternNextManifest.levels[lvl as keyof typeof patternNextManifest.levels];
}
