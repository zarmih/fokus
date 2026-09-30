import { registry } from './registry';
import type { ExerciseManifest } from './contract';

const seenIds = new Set<string>();
export const catalog: { manifest: ExerciseManifest }[] = [];

for (const mod of registry) {
  if (seenIds.has(mod.manifest.id)) {
    console.warn(`Duplicate exercise id found (ignoring): ${mod.manifest.id}`);
    continue;
  }
  seenIds.add(mod.manifest.id);
  catalog.push({ manifest: mod.manifest });
}

catalog.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name, 'ru'));

export function getManifest(id: string): ExerciseManifest | undefined {
  return catalog.find((c) => c.manifest.id === id)?.manifest;
}
