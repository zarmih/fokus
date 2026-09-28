import { registry } from './registry';
import type { ExerciseManifest } from './contract';

const uniqueRegistry = registry.filter((mod, index, self) =>
  index === self.findIndex((m) => m.manifest.id === mod.manifest.id)
);

export const catalog: { manifest: ExerciseManifest }[] = uniqueRegistry
  .map(mod => ({ manifest: mod.manifest }))
  .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name, 'ru'));

export function getManifest(id: string): ExerciseManifest | undefined {
  return catalog.find((c) => c.manifest.id === id)?.manifest;
}
