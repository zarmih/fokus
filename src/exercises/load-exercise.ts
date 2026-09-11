import type { ExerciseModule } from './contract';

const loaders = import.meta.glob<{ default: ExerciseModule }>(
  [
    './*/index.ts',
    './*.ts',
    '!./contract.ts',
    '!./dispatch.ts',
    '!./registry.ts',
    '!./stage.ts',
    '!./types.ts',
    '!./catalog.ts',
    '!./load-exercise.ts'
  ],
  { eager: false }
);

const SKIP = new Set([
  './contract.ts',
  './dispatch.ts',
  './registry.ts',
  './stage.ts',
  './types.ts',
  './catalog.ts',
  './load-exercise.ts'
]);

const byId = new Map<string, () => Promise<ExerciseModule>>();
for (const [key, loader] of Object.entries(loaders)) {
  if (SKIP.has(key)) continue;
  const id = key.endsWith('/index.ts')
    ? key.slice(2, -'/index.ts'.length)
    : key.replace(/^\.\//, '').replace(/\.ts$/, '');
  byId.set(id, () => loader().then((m) => m.default));
}

const cache = new Map<string, Promise<ExerciseModule>>();

export function loadExercise(id: string): Promise<ExerciseModule> {
  const hit = cache.get(id);
  if (hit) return hit;
  const loader = byId.get(id);
  if (!loader) return Promise.reject(new Error(`Unknown exercise: ${id}`));
  const pending = loader();
  cache.set(id, pending);
  return pending;
}

export function knownExerciseIds(): string[] {
  return [...byId.keys()].sort();
}
