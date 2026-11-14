import type { ExerciseModule } from './contract';
import { getManifest } from './catalog';
import { isCoreExercise } from '../core/core-catalog';

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

const nonCoreSceneLoaders: Record<string, () => Promise<unknown>> = {
  attention: () => import('../styles/scenes/attention-extra.css'),
  memory: () => import('../styles/scenes/memory-extra.css'),
  speed: () => import('../styles/scenes/speed-extra.css'),
  logic: () => import('../styles/scenes/logic-extra.css'),
  flexibility: () => import('../styles/scenes/flexibility-extra.css')
};

const nonCoreDomainLoaded = new Map<string, Promise<unknown>>();

function loadNonCoreScene(domain: string): Promise<unknown> {
  let pending = nonCoreDomainLoaded.get(domain);
  if (!pending) {
    const loader = nonCoreSceneLoaders[domain];
    pending = loader
      ? loader().catch((err) => {
          console.warn(`Failed to load non-core scene styles for domain "${domain}":`, err);
        })
      : Promise.resolve();
    nonCoreDomainLoaded.set(domain, pending);
  }
  return pending;
}

const cache = new Map<string, Promise<ExerciseModule>>();

export function loadExercise(id: string): Promise<ExerciseModule> {
  const hit = cache.get(id);
  if (hit) return hit;
  const loader = byId.get(id);
  if (!loader) return Promise.reject(new Error(`Unknown exercise: ${id}`));

  const domain = getManifest(id)?.domain;
  const scenePromise = domain && !isCoreExercise(id)
    ? loadNonCoreScene(domain)
    : Promise.resolve();

  const pending = Promise.all([loader(), scenePromise]).then(([mod]) => mod);
  cache.set(id, pending);
  return pending;
}

export function knownExerciseIds(): string[] {
  return [...byId.keys()].sort();
}
