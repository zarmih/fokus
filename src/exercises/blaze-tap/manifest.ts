import type { ExerciseManifest } from '../types';

export const blazeTapManifest: ExerciseManifest = {
  id: 'blaze-tap',
  name: 'Вспышка',
  domain: 'attention',
  skills: ['sustained_attention', 'reaction_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Нажимайте на появляющиеся вспышки как можно быстрее.',
  levels: {
    1: { targetMs: 1500 },
    2: { targetMs: 1200 },
    3: { targetMs: 1000 },
    4: { targetMs: 800 },
    5: { targetMs: 600 }
  }
};
