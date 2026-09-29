import { registry } from './registry';
import type { ExerciseManifest } from './contract';

const seenIds = new Set<string>();
for (const mod of registry) {
  if (seenIds.has(mod.manifest.id)) {
    throw new Error(`Duplicate exercise in registry: ${mod.manifest.id}`);
  }
  seenIds.add(mod.manifest.id);
}

export const catalog: { manifest: ExerciseManifest }[] = registry
  .map(mod => ({ manifest: mod.manifest }))
  .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name, 'ru'));

export function getManifest(id: string): ExerciseManifest | undefined {
  return catalog.find((c) => c.manifest.id === id)?.manifest;
}
