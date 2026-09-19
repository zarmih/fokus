import type { ExerciseManifest } from '../types';

export const shapeEquationManifest: ExerciseManifest = {
  id: 'shape-equation',
  name: 'Фигурная математика',
  domain: 'logic',
  skills: ['working_memory', 'logical_reasoning'],
  metricModel: 'speed-accuracy',
  instruction: 'Решите уравнение с фигурами.',
  levels: {
    1: { unknowns: 2, maxVal: 5, targetMs: 6000, deadlineMs: 12000 },
    2: { unknowns: 2, maxVal: 7, targetMs: 5500, deadlineMs: 11000 },
    3: { unknowns: 2, maxVal: 10, targetMs: 5000, deadlineMs: 10000 },
    4: { unknowns: 2, maxVal: 15, targetMs: 4500, deadlineMs: 9000 },
    5: { unknowns: 2, maxVal: 20, targetMs: 4000, deadlineMs: 8000 },
    6: { unknowns: 3, maxVal: 10, targetMs: 5500, deadlineMs: 11000 },
    7: { unknowns: 3, maxVal: 15, targetMs: 5000, deadlineMs: 10000 },
    8: { unknowns: 3, maxVal: 20, targetMs: 4500, deadlineMs: 9000 },
    9: { unknowns: 3, maxVal: 25, targetMs: 4000, deadlineMs: 8000 },
    10: { unknowns: 3, maxVal: 30, targetMs: 3800, deadlineMs: 7500 },
    11: { unknowns: 3, maxVal: 40, targetMs: 3500, deadlineMs: 7000 },
    12: { unknowns: 4, maxVal: 15, targetMs: 6000, deadlineMs: 12000 },
    13: { unknowns: 4, maxVal: 20, targetMs: 5500, deadlineMs: 11000 },
    14: { unknowns: 4, maxVal: 30, targetMs: 5000, deadlineMs: 10000 },
    15: { unknowns: 4, maxVal: 40, targetMs: 4500, deadlineMs: 9000 },
    16: { unknowns: 4, maxVal: 50, targetMs: 4000, deadlineMs: 8000 },
    17: { unknowns: 4, maxVal: 60, targetMs: 3800, deadlineMs: 7500 },
    18: { unknowns: 4, maxVal: 70, targetMs: 3500, deadlineMs: 7000 },
    19: { unknowns: 4, maxVal: 80, targetMs: 3200, deadlineMs: 6500 },
    20: { unknowns: 4, maxVal: 99, targetMs: 3000, deadlineMs: 6000 }
  }
};

export function getShapeEquationParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return shapeEquationManifest.levels![lvl as keyof typeof shapeEquationManifest.levels];
}
