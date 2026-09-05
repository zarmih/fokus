import type { ExerciseManifest } from '../types';

export const sequenceManifest: ExerciseManifest = {
  id: 'sequence',
  name: 'Цепочка',
  domain: 'memory',
  instruction: 'Запомните порядок вспыхивающих клеток и повторите его.',
  levels: {
    1: { grid: 3, length: 3, flashMs: 800, gapMs: 200, targetMs: 6000 },
    2: { grid: 3, length: 4, flashMs: 800, gapMs: 200, targetMs: 7000 },
    3: { grid: 3, length: 4, flashMs: 700, gapMs: 200, targetMs: 6500 },
    4: { grid: 3, length: 5, flashMs: 700, gapMs: 200, targetMs: 7000 },
    5: { grid: 3, length: 5, flashMs: 600, gapMs: 150, targetMs: 6500 },
    6: { grid: 4, length: 5, flashMs: 600, gapMs: 150, targetMs: 6500 },
    7: { grid: 4, length: 6, flashMs: 600, gapMs: 150, targetMs: 7000 },
    8: { grid: 4, length: 6, flashMs: 500, gapMs: 150, targetMs: 6500 },
    9: { grid: 4, length: 7, flashMs: 500, gapMs: 150, targetMs: 7000 },
    10: { grid: 4, length: 7, flashMs: 400, gapMs: 100, targetMs: 6500 },
    11: { grid: 4, length: 8, flashMs: 400, gapMs: 100, targetMs: 7000 },
    12: { grid: 4, length: 8, flashMs: 300, gapMs: 100, targetMs: 6500 },
    13: { grid: 4, length: 9, flashMs: 300, gapMs: 100, targetMs: 7000 },
    14: { grid: 4, length: 9, flashMs: 250, gapMs: 100, targetMs: 6500 },
    15: { grid: 4, length: 10, flashMs: 250, gapMs: 100, targetMs: 7000 },
    16: { grid: 4, length: 10, flashMs: 200, gapMs: 100, targetMs: 6500 },
    17: { grid: 4, length: 11, flashMs: 200, gapMs: 100, targetMs: 7000 },
    18: { grid: 4, length: 11, flashMs: 200, gapMs: 50, targetMs: 6500 },
    19: { grid: 4, length: 12, flashMs: 200, gapMs: 50, targetMs: 7000 },
    20: { grid: 4, length: 12, flashMs: 150, gapMs: 50, targetMs: 6500 }
  }
};

export function getSequenceParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return sequenceManifest.levels[lvl as keyof typeof sequenceManifest.levels];
}
