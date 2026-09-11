import type { ExerciseManifest } from '../../exercises/contract';
import type { CatalogItem, DomainId, MetricModel } from './types';

export function catalogFromManifests(
  catalog: { manifest: ExerciseManifest & { levels?: Record<number, unknown> } }[]
): CatalogItem[] {
  return catalog
    .filter((c) => c?.manifest?.id && c.manifest.domain)
    .map((c) => {
      const levels = c.manifest.levels;
      const maxLevel = levels
        ? Math.max(5, ...Object.keys(levels).map((k) => Number(k)).filter((n) => Number.isFinite(n)))
        : 20;
      return {
        id: c.manifest.id,
        domain: c.manifest.domain as DomainId,
        skills: [...(c.manifest.skills || [])],
        metricModel: (c.manifest.metricModel || 'speed-accuracy') as MetricModel,
        maxLevel
      };
    });
}
