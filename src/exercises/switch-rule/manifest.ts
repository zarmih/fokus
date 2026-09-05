import type { ExerciseManifest } from '../types';

export const switchRuleManifest: ExerciseManifest = {
  id: 'switch-rule',
  name: 'Смена правила',
  domain: 'flexibility',
  instruction: 'Смотри на подпись. Да или нет. Правило меняется.',
  levels: {
    1: { switchEvery: 8, deadlineMs: 2000, targetMs: 1500 },
    2: { switchEvery: 8, deadlineMs: 1800, targetMs: 1400 },
    3: { switchEvery: 7, deadlineMs: 1800, targetMs: 1400 },
    4: { switchEvery: 7, deadlineMs: 1600, targetMs: 1300 },
    5: { switchEvery: 6, deadlineMs: 1600, targetMs: 1200 },
    6: { switchEvery: 6, deadlineMs: 1500, targetMs: 1200 },
    7: { switchEvery: 5, deadlineMs: 1500, targetMs: 1100 },
    8: { switchEvery: 5, deadlineMs: 1400, targetMs: 1100 },
    9: { switchEvery: 4, deadlineMs: 1400, targetMs: 1000 },
    10: { switchEvery: 4, deadlineMs: 1300, targetMs: 1000 },
    11: { switchEvery: 4, deadlineMs: 1200, targetMs: 900 },
    12: { switchEvery: 3, deadlineMs: 1200, targetMs: 900 },
    13: { switchEvery: 3, deadlineMs: 1100, targetMs: 800 },
    14: { switchEvery: 3, deadlineMs: 1100, targetMs: 800 },
    15: { switchEvery: 2, deadlineMs: 1100, targetMs: 800 },
    16: { switchEvery: 2, deadlineMs: 1000, targetMs: 700 },
    17: { switchEvery: 2, deadlineMs: 1000, targetMs: 700 },
    18: { switchEvery: 2, deadlineMs: 950, targetMs: 650 },
    19: { switchEvery: 2, deadlineMs: 900, targetMs: 600 },
    20: { switchEvery: 2, deadlineMs: 900, targetMs: 600 }
  }
};

export function getSwitchRuleParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return switchRuleManifest.levels[lvl as keyof typeof switchRuleManifest.levels];
}
