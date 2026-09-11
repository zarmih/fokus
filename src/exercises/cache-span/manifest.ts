import { ExerciseManifest } from '../contract';

export const cacheSpanManifest: ExerciseManifest = {
  id: 'cache-span',
  name: 'Кэш',
  domain: 'memory',
  skills: ['working_memory', 'spatial_memory'],
  metricModel: 'memory-span',
  instruction: 'Запомните, в каких ячейках лежат символы. Затем найдите заданный символ.'
};

export function getCacheSpanParams(level: number) {
  return {
    slots: Math.max(3, Math.min(12, Math.floor(level) + 2)),
    showMs: Math.max(1000, 3000 - level * 200)
  };
}
