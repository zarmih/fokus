import type { ExerciseManifest } from '../types';

export const manifest: ExerciseManifest = {
  id: 'vault-span',
  name: 'Загадка Сейфа',
  domain: 'logic',
  skills: ['logical_reasoning', 'working_memory'],
  metricModel: 'speed-accuracy',
  instruction: 'Взломай сейф, определив правильный порядок цветов по подсказкам. Нажимай на цвета в нужном порядке.',
  levels: {
    1: { hard: false },
    2: { hard: false },
    3: { hard: false },
    4: { hard: false },
    5: { hard: true },
    6: { hard: true },
    7: { hard: true },
    8: { hard: true },
    9: { hard: true },
  }
};

export function getVaultSpanParams(level: number) {
  return level;
}
