import type { ExerciseManifest } from '../types';

export const posnerManifest: ExerciseManifest = {
  id: 'posner',
  name: 'Скрытое внимание (Posner)',
  domain: 'attention',
  skills: ['selective_attention', 'reaction_speed'],
  metricModel: 'speed-accuracy',
  diffCurve: 'warmup-plateau-surge',
  instruction: 'Следи за крестиком в центре. Когда появится круг слева или справа — жми соответствующую стрелку. Осторожно: стрелка-подсказка бывает обманчива!',
  levels: {}
};

export function getPosnerParams(level: number) {
  const invalidPct = Math.min(0.5, 0.1 + (level * 0.02));
  const targetDuration = Math.max(300, 1500 - (level * 50));
  return { invalidPct, targetDuration };
}
