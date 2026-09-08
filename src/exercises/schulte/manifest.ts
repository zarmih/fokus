import type { ExerciseManifest } from '../types';

export const schulteManifest: ExerciseManifest = {
  id: 'schulte',
  name: 'Таблицы Шульте',
  domain: 'attention',
  skills: ['visual_scanning', 'processing_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Нажимай числа по порядку от 1 и далее как можно быстрее.',
  levels: {
    1: { size: 3 },
    2: { size: 4 },
    3: { size: 4 },
    4: { size: 4 },
    5: { size: 5 },
    6: { size: 5 },
  }
};

export function getSchulteParams(level: number) {
  if (level <= 1) return { size: 3 };
  if (level <= 4) return { size: 4 };
  if (level <= 10) return { size: 5 };
  return { size: 6 };
}
