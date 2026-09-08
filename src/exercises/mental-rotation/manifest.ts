import type { ExerciseManifest } from '../types';

export const mentalRotationManifest: ExerciseManifest = {
  id: 'mental-rotation',
  name: 'Ментальная ротация',
  domain: 'logic',
  skills: ['spatial_reasoning', 'visual_scanning'],
  metricModel: 'speed-accuracy',
  instruction: 'Определите, совпадают ли фигуры. Нажмите ДА, если правая фигура — это та же самая левая фигура, просто повернутая. Нажмите НЕТ, если это зеркальное отражение.',
  levels: {
    1: { trials: 10, maxAngle: 90 },
    2: { trials: 15, maxAngle: 180 },
    3: { trials: 20, maxAngle: 270 },
  }
};
