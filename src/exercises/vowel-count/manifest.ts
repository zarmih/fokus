import type { ExerciseManifest } from '../types';

export const vowelCountManifest: ExerciseManifest = {
  id: 'vowel-count',
  name: 'Счет гласных',
  domain: 'flexibility',
  skills: ['selective_attention', 'processing_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Сосчитайте количество гласных букв в слове.',
  levels: {
    1: { length: 4, targetMs: 4000, deadlineMs: 7000 },
    2: { length: 4, targetMs: 3500, deadlineMs: 6000 },
    3: { length: 5, targetMs: 3200, deadlineMs: 5500 },
    4: { length: 5, targetMs: 3000, deadlineMs: 5000 },
    5: { length: 5, targetMs: 2800, deadlineMs: 4500 },
    6: { length: 6, targetMs: 2700, deadlineMs: 4500 },
    7: { length: 6, targetMs: 2500, deadlineMs: 4200 },
    8: { length: 6, targetMs: 2300, deadlineMs: 4000 },
    9: { length: 7, targetMs: 2200, deadlineMs: 3800 },
    10: { length: 7, targetMs: 2000, deadlineMs: 3500 },
    11: { length: 7, targetMs: 1900, deadlineMs: 3300 },
    12: { length: 8, targetMs: 1800, deadlineMs: 3000 },
    13: { length: 8, targetMs: 1700, deadlineMs: 2800 },
    14: { length: 8, targetMs: 1600, deadlineMs: 2600 },
    15: { length: 9, targetMs: 1500, deadlineMs: 2500 },
    16: { length: 9, targetMs: 1400, deadlineMs: 2300 },
    17: { length: 9, targetMs: 1300, deadlineMs: 2100 },
    18: { length: 10, targetMs: 1200, deadlineMs: 2000 },
    19: { length: 10, targetMs: 1100, deadlineMs: 1800 },
    20: { length: 10, targetMs: 1000, deadlineMs: 1600 }
  }
};

export function getVowelCountParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return vowelCountManifest.levels![lvl as keyof typeof vowelCountManifest.levels];
}
