import type { ExerciseManifest } from '../types';

export const nbackManifest: ExerciseManifest = {
  id: 'n-back',
  name: 'Dual N-Back',
  domain: 'memory',
  skills: ['working_memory', 'sustained_attention'],
  metricModel: 'speed-accuracy',
  diffCurve: 'warmup-plateau-surge',
  instruction: 'Следи за фигурой на экране И за буквой, которую произносит диктор. Жми соответствующие кнопки, если фигура или буква совпадает с той, что была N шагов назад.',
  levels: {
    1: { n: 1, delayMs: 3000, matchChance: 0.3 },
    2: { n: 1, delayMs: 2500, matchChance: 0.35 },
    3: { n: 1, delayMs: 2000, matchChance: 0.4 },
    4: { n: 2, delayMs: 3000, matchChance: 0.3 },
    5: { n: 2, delayMs: 2500, matchChance: 0.35 },
    6: { n: 2, delayMs: 2000, matchChance: 0.4 },
    7: { n: 3, delayMs: 3000, matchChance: 0.3 },
    8: { n: 3, delayMs: 2500, matchChance: 0.35 },
    9: { n: 3, delayMs: 2000, matchChance: 0.4 },
  }
};

export function getNBackParams(level: number) {
  if (level <= 3) return { n: 1, delayMs: Math.max(1500, 3500 - level * 500), matchChance: 0.3 };
  if (level <= 8) return { n: 2, delayMs: Math.max(1500, 4000 - (level-3) * 500), matchChance: 0.35 };
  return { n: 3, delayMs: Math.max(1500, 4000 - (level-8) * 400), matchChance: 0.4 };
}
