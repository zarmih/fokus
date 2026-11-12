import { describe, expect, test } from 'vitest';
import { applyObservation, composeRitual, createAbilityModel } from '../src/core/engine';
import type { AbilityModel, CatalogItem, Observation } from '../src/core/engine/types';
import { hasPlayedExercise, needsTrial } from '../src/core/session-timing';

const NOW = Date.parse('2026-11-12T06:00:00.000Z');
const DOMAINS = ['memory', 'attention', 'logic', 'speed', 'flexibility'] as const;
// Three "core" items per area plus one non-core speed probe (like reaction-strike in calibration).
const catalog: CatalogItem[] = [
  ...DOMAINS.flatMap((d) => [1, 2, 3].map((n) => ({ id: `${d}-${n}`, domain: d, skills: [], metricModel: 'speed-accuracy', maxLevel: 20 } as CatalogItem))),
  { id: 'speed-probe', domain: 'speed', skills: [], metricModel: 'speed-accuracy', maxLevel: 20 }
];

function played(ids: string[], at = NOW - 5 * 60000): AbilityModel {
  let m = createAbilityModel(at, new Date(at).toISOString());
  for (const id of ids) {
    const item = catalog.find((c) => c.id === id)!;
    const o: Observation = { exerciseId: id, domain: item.domain, skills: [], metricModel: 'speed-accuracy', difficulty: 4, accuracy: 0.7, avgRtMs: 900, targetMs: 1500, performance: 600, probe: true };
    m = applyObservation(m, o, at);
  }
  return m;
}

function domainsOf(model: AbilityModel, excludeIds: string[], seed: number) {
  let s = seed;
  const rng = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const plan = composeRitual({ model, catalog, states: [], durationSec: 300, nowMs: NOW, excludeIds, rng, programPhase: 'orient' });
  return plan.items.map((i) => i.domain);
}

describe('first plan after calibration', () => {
  test('an area probed only through an excluded (non-core) exercise still counts as trained — no single-area day', () => {
    const model = played(['memory-1', 'attention-1', 'logic-1', 'flexibility-1', 'speed-probe']);
    for (let seed = 1; seed <= 30; seed++) {
      const d = domainsOf(model, ['speed-probe'], seed);
      expect(d).toHaveLength(3);
      expect(new Set(d).size).toBe(3);
    }
  });

  test('a never-trained area is pulled in once, not for every block', () => {
    const model = played(['memory-1', 'attention-1', 'logic-1', 'flexibility-1']);
    for (let seed = 1; seed <= 30; seed++) {
      const d = domainsOf(model, ['speed-probe'], seed);
      expect(d.filter((x) => x === 'speed').length).toBeLessThanOrEqual(1);
      expect(new Set(d).size).toBe(d.length);
    }
  });
});

describe('trial round eligibility', () => {
  test('states seeded for the whole catalog do not count as "played": only real blocks do', () => {
    expect(hasPlayedExercise('stroop', 0, [])).toBe(false);
    expect(hasPlayedExercise('stroop', 1, [])).toBe(true); // calibration probe / engine observation
    expect(hasPlayedExercise('stroop', 0, [{ items: [{ exerciseId: 'stroop' }] }])).toBe(true);
    expect(needsTrial({ mode: 'normal', playedBefore: false, alreadyTried: false })).toBe(true);
    expect(needsTrial({ mode: 'normal', playedBefore: true, alreadyTried: false })).toBe(false);
    expect(needsTrial({ mode: 'normal', playedBefore: false, alreadyTried: true })).toBe(false);
    expect(needsTrial({ mode: 'calibration', playedBefore: false, alreadyTried: false })).toBe(false);
  });
});
