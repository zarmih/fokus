import type { ExerciseManifest } from '../types';

export const chordTapManifest: ExerciseManifest = {
  id: 'chord-tap',
  name: 'Аккорд',
  domain: 'attention',
  skills: ['divided_attention', 'reaction_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Нажми одновременно все выделенные элементы, когда они загорятся зеленым.',
  levels: {
    1: { targets: 2, distractors: 2, durationMs: 2000 },
    2: { targets: 2, distractors: 3, durationMs: 1800 },
    3: { targets: 3, distractors: 3, durationMs: 1800 },
    4: { targets: 3, distractors: 4, durationMs: 1600 },
    5: { targets: 3, distractors: 5, durationMs: 1500 },
    6: { targets: 4, distractors: 4, durationMs: 1500 },
    7: { targets: 4, distractors: 5, durationMs: 1400 },
    8: { targets: 4, distractors: 6, durationMs: 1300 },
    9: { targets: 5, distractors: 5, durationMs: 1300 },
    10: { targets: 5, distractors: 6, durationMs: 1200 },
    11: { targets: 5, distractors: 7, durationMs: 1100 },
    12: { targets: 6, distractors: 6, durationMs: 1100 },
    13: { targets: 6, distractors: 8, durationMs: 1000 },
    14: { targets: 6, distractors: 10, durationMs: 900 },
    15: { targets: 7, distractors: 8, durationMs: 900 },
    16: { targets: 7, distractors: 10, durationMs: 800 },
    17: { targets: 8, distractors: 10, durationMs: 800 },
    18: { targets: 8, distractors: 12, durationMs: 750 },
    19: { targets: 9, distractors: 12, durationMs: 700 },
    20: { targets: 9, distractors: 15, durationMs: 650 }
  }
};

export function getChordTapParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return chordTapManifest.levels![lvl as keyof typeof chordTapManifest.levels];
}
