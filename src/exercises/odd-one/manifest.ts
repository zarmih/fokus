import type { ExerciseManifest } from '../types';

export const oddOneManifest: ExerciseManifest = {
  id: 'odd-one',
  name: 'Лишний',
  domain: 'attention',
  instruction: 'Найди элемент, который отличается от остальных.',
  levels: {
    1: { grid: 3, deltaHue: 60, targetMs: 5000, deadlineMs: 8000 },
    2: { grid: 3, deltaHue: 40, targetMs: 4000, deadlineMs: 7000 },
    3: { grid: 4, deltaHue: 40, targetMs: 3500, deadlineMs: 6000 },
    4: { grid: 4, deltaHue: 30, targetMs: 3000, deadlineMs: 5000 },
    5: { grid: 4, deltaHue: 20, targetMs: 2500, deadlineMs: 4500 },
    6: { grid: 5, deltaHue: 30, targetMs: 2500, deadlineMs: 4500 },
    7: { grid: 5, deltaHue: 20, targetMs: 2200, deadlineMs: 4000 },
    8: { grid: 5, deltaHue: 15, targetMs: 2000, deadlineMs: 3500 },
    9: { grid: 5, deltaHue: 10, targetMs: 1800, deadlineMs: 3000 },
    10: { grid: 6, deltaHue: 20, targetMs: 1800, deadlineMs: 3000 },
    11: { grid: 6, deltaHue: 15, targetMs: 1600, deadlineMs: 2800 },
    12: { grid: 6, deltaHue: 12, targetMs: 1500, deadlineMs: 2500 },
    13: { grid: 6, deltaHue: 10, targetMs: 1400, deadlineMs: 2200 },
    14: { grid: 6, deltaHue: 8, targetMs: 1300, deadlineMs: 2000 },
    15: { grid: 6, deltaHue: 7, targetMs: 1200, deadlineMs: 1800 },
    16: { grid: 6, deltaHue: 6, targetMs: 1100, deadlineMs: 1600 },
    17: { grid: 6, deltaHue: 5, targetMs: 1000, deadlineMs: 1500 },
    18: { grid: 6, deltaHue: 4, targetMs: 900, deadlineMs: 1400 },
    19: { grid: 6, deltaHue: 3, targetMs: 800, deadlineMs: 1200 },
    20: { grid: 6, deltaHue: 2, targetMs: 700, deadlineMs: 1000 }
  }
};

export function getOddOneParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return oddOneManifest.levels[lvl as keyof typeof oddOneManifest.levels];
}
