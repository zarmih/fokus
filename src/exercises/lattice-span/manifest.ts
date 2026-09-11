import type { ExerciseManifest } from '../types';

export const latticeSpanManifest: ExerciseManifest = {
  id: 'lattice-span',
  name: 'Решётка',
  domain: 'memory',
  skills: ['working_memory', 'spatial_memory'],
  metricModel: 'memory-span',
  instruction: 'Запомни последовательность подсвеченных узлов решетки и повтори её.',
  levels: {
    1: { grid: 3, sequenceLength: 3, showMs: 1000 },
    2: { grid: 3, sequenceLength: 4, showMs: 900 },
    3: { grid: 4, sequenceLength: 4, showMs: 900 },
    4: { grid: 4, sequenceLength: 5, showMs: 800 },
    5: { grid: 4, sequenceLength: 6, showMs: 800 },
    6: { grid: 5, sequenceLength: 6, showMs: 750 },
    7: { grid: 5, sequenceLength: 7, showMs: 750 },
    8: { grid: 5, sequenceLength: 8, showMs: 700 },
    9: { grid: 6, sequenceLength: 8, showMs: 700 },
    10: { grid: 6, sequenceLength: 9, showMs: 650 },
    11: { grid: 6, sequenceLength: 10, showMs: 650 },
    12: { grid: 7, sequenceLength: 10, showMs: 600 },
    13: { grid: 7, sequenceLength: 11, showMs: 600 },
    14: { grid: 7, sequenceLength: 12, showMs: 550 },
    15: { grid: 8, sequenceLength: 12, showMs: 550 },
    16: { grid: 8, sequenceLength: 13, showMs: 500 },
    17: { grid: 8, sequenceLength: 14, showMs: 500 },
    18: { grid: 9, sequenceLength: 14, showMs: 450 },
    19: { grid: 9, sequenceLength: 15, showMs: 450 },
    20: { grid: 9, sequenceLength: 16, showMs: 400 }
  }
};

export function getLatticeSpanParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return latticeSpanManifest.levels![lvl as keyof typeof latticeSpanManifest.levels];
}
