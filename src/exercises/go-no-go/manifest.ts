import type { ExerciseManifest } from '../types';

export const goNoGoManifest: ExerciseManifest = {
  id: 'go-no-go',
  name: 'Go / No-Go',
  domain: 'attention',
  skills: ['inhibition', 'sustained_attention'],
  metricModel: 'speed-accuracy',
  instruction: 'Нажимайте КРАСНУЮ кнопку, когда видите ЗЕЛЕНЫЙ круг. НИЧЕГО НЕ НАЖИМАЙТЕ, если круг КРАСНЫЙ.',
  levels: {
    1: { trials: 15, noGoRatio: 0.2 },
    2: { trials: 20, noGoRatio: 0.3 },
    3: { trials: 30, noGoRatio: 0.4 },
  }
};
