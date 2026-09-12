import type { ExerciseManifest } from '../types';

export const manifest: ExerciseManifest = {
  id: 'ember-lane',
  name: 'Угольная Тропа',
  domain: 'memory',
  skills: ['working_memory', 'spatial_memory'],
  metricModel: 'memory-span',
  instruction: 'Запомни последовательность вспыхивающих угольков и повтори её.',
  levels: {
    1: { span: 3, delayMs: 800 },
    2: { span: 4, delayMs: 700 },
    3: { span: 4, delayMs: 650 },
    4: { span: 5, delayMs: 600 },
    5: { span: 5, delayMs: 500 },
    6: { span: 6, delayMs: 450 },
    7: { span: 6, delayMs: 400 },
    8: { span: 7, delayMs: 400 },
    9: { span: 8, delayMs: 400 },
  }
};

export function getEmberLaneParams(level: number) {
  const cfg = manifest.levels![level] || manifest.levels![9];
  return { span: cfg.span, delayMs: cfg.delayMs };
}
