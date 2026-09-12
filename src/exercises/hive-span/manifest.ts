import type { ExerciseManifest } from '../types';

export const hiveSpanManifest: ExerciseManifest = {
  id: 'hive-span',
  name: 'Соты',
  domain: 'memory',
  skills: ['spatial_memory', 'working_memory'],
  metricModel: 'memory-span',
  instruction: 'Запомните последовательность сот и повторите её.',
  levels: {
    1: { spanLength: 3, gridSize: 9, showMs: 800 },
    2: { spanLength: 4, gridSize: 9, showMs: 700 },
    3: { spanLength: 5, gridSize: 16, showMs: 600 },
    4: { spanLength: 6, gridSize: 16, showMs: 600 },
    5: { spanLength: 7, gridSize: 25, showMs: 500 }
  }
};
