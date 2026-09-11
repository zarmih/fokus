import type { ExerciseManifest } from '../types';

export const hingeSwapManifest: ExerciseManifest = {
  id: 'hinge-swap',
  name: 'Шарнир',
  domain: 'flexibility',
  skills: ['task_switching', 'cognitive_flexibility'],
  metricModel: 'speed-accuracy',
  instruction: 'Если фон СИНИЙ — выбирайте чётные числа. Если ЗЕЛЁНЫЙ — нечётные числа.',
  levels: {
    1: { numbers: [1, 2, 3, 4], swapChance: 0.2 },
    2: { numbers: [1, 2, 3, 4, 5, 6], swapChance: 0.3 },
    3: { numbers: [1, 2, 3, 4, 5, 6, 7, 8], swapChance: 0.4 },
    4: { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9], swapChance: 0.5 },
    5: { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9], swapChance: 0.6 }
  }
};
