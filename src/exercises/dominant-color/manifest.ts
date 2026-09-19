import type { ExerciseManifest } from '../types';

export const dominantColorManifest: ExerciseManifest = {
  id: 'dominant-color',
  name: 'Преобладающий цвет',
  domain: 'attention',
  skills: ['visual_scanning', 'processing_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Выберите цвет, которого больше всего на экране.',
  levels: {
    1: { grid: 3, colors: 2, targetMs: 3500, deadlineMs: 6000 },
    2: { grid: 3, colors: 2, targetMs: 3000, deadlineMs: 5000 },
    3: { grid: 4, colors: 2, targetMs: 2800, deadlineMs: 4500 },
    4: { grid: 4, colors: 3, targetMs: 2500, deadlineMs: 4000 },
    5: { grid: 4, colors: 3, targetMs: 2200, deadlineMs: 3500 },
    6: { grid: 5, colors: 3, targetMs: 2000, deadlineMs: 3000 },
    7: { grid: 5, colors: 3, targetMs: 1800, deadlineMs: 2800 },
    8: { grid: 5, colors: 4, targetMs: 1600, deadlineMs: 2500 },
    9: { grid: 6, colors: 3, targetMs: 1500, deadlineMs: 2300 },
    10: { grid: 6, colors: 4, targetMs: 1400, deadlineMs: 2000 },
    11: { grid: 6, colors: 4, targetMs: 1300, deadlineMs: 1800 },
    12: { grid: 6, colors: 4, targetMs: 1200, deadlineMs: 1600 },
    13: { grid: 6, colors: 5, targetMs: 1100, deadlineMs: 1500 },
    14: { grid: 7, colors: 4, targetMs: 1000, deadlineMs: 1400 },
    15: { grid: 7, colors: 5, targetMs: 900, deadlineMs: 1300 },
    16: { grid: 7, colors: 5, targetMs: 800, deadlineMs: 1200 },
    17: { grid: 8, colors: 4, targetMs: 750, deadlineMs: 1100 },
    18: { grid: 8, colors: 5, targetMs: 700, deadlineMs: 1000 },
    19: { grid: 8, colors: 6, targetMs: 650, deadlineMs: 900 },
    20: { grid: 8, colors: 6, targetMs: 600, deadlineMs: 800 }
  }
};

export function getDominantColorParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return dominantColorManifest.levels![lvl as keyof typeof dominantColorManifest.levels];
}
