import type { ExerciseManifest } from '../types';

export const corsiManifest: ExerciseManifest = {
  id: 'corsi',
  name: 'Блоки Корси',
  domain: 'memory',
  skills: ['spatial_memory', 'working_memory'],
  metricModel: 'memory-span',
  instruction: 'Запомни порядок, в котором загораются квадраты, и повтори его.',
  levels: {}
};

export function getCorsiParams(level: number) {
  const span = Math.min(10, 2 + Math.floor(level / 2));
  return { span, blocks: 9 };
}
