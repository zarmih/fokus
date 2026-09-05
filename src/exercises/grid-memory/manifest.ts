import type { ExerciseManifest } from '../types';

export const gridMemoryManifest: ExerciseManifest = {
  id: 'grid-memory',
  name: 'Матрица',
  domain: 'memory',
  instruction: 'Запомни подсвеченные клетки и отметь их. Порядок не важен.',
  levels: {
    1: { grid: 3, cells: 3, showMs: 1200, targetMs: 8000 },
    2: { grid: 3, cells: 4, showMs: 1200, targetMs: 8000 },
    3: { grid: 4, cells: 4, showMs: 1000, targetMs: 7000 },
    4: { grid: 4, cells: 5, showMs: 1000, targetMs: 7000 },
    5: { grid: 4, cells: 6, showMs: 900, targetMs: 6500 },
    6: { grid: 5, cells: 6, showMs: 900, targetMs: 6500 },
    7: { grid: 5, cells: 7, showMs: 800, targetMs: 6000 },
    8: { grid: 5, cells: 8, showMs: 800, targetMs: 6000 },
    9: { grid: 6, cells: 8, showMs: 700, targetMs: 5500 },
    10: { grid: 6, cells: 9, showMs: 700, targetMs: 5500 },
    11: { grid: 6, cells: 10, showMs: 600, targetMs: 5000 },
    12: { grid: 6, cells: 11, showMs: 600, targetMs: 5000 },
    13: { grid: 7, cells: 11, showMs: 600, targetMs: 4500 },
    14: { grid: 7, cells: 12, showMs: 500, targetMs: 4500 },
    15: { grid: 7, cells: 13, showMs: 500, targetMs: 4500 },
    16: { grid: 8, cells: 13, showMs: 500, targetMs: 4000 },
    17: { grid: 8, cells: 14, showMs: 400, targetMs: 4000 },
    18: { grid: 8, cells: 15, showMs: 400, targetMs: 4000 },
    19: { grid: 9, cells: 16, showMs: 400, targetMs: 3500 },
    20: { grid: 9, cells: 18, showMs: 400, targetMs: 3500 }
  }
};

export function getGridMemoryParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return gridMemoryManifest.levels[lvl as keyof typeof gridMemoryManifest.levels];
}
