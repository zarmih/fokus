import { registry } from './registry';
import type { ExerciseManifest } from './contract';

export const catalog: { manifest: ExerciseManifest }[] = registry.map(mod => ({ manifest: mod.manifest }));

export function getManifest(id: string): ExerciseManifest | undefined {
  return registry.find((c) => c.manifest.id === id)?.manifest;
}
