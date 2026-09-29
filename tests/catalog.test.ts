import { expect, test } from 'vitest';
import { catalog, getManifest } from '../src/exercises/catalog';
import { registry } from '../src/exercises/registry';
import { knownExerciseIds, loadExercise } from '../src/exercises/load-exercise';

test('catalog ids match the full registry without duplicates', () => {
  const catalogIds = catalog.map((c) => c.manifest.id).sort();
  const registryIds = Array.from(new Set(registry.map((r) => r.manifest.id))).sort();
  expect(catalogIds).toEqual(registryIds);
  expect(catalog.length).toBeGreaterThan(70);
});

test('catalog.unique: contains no duplicate exercise ids', () => {
  const ids = catalog.map((c) => c.manifest.id);
  const uniqueIds = new Set(ids);
  expect(ids.length).toBe(uniqueIds.size);
});

test('getManifest returns planning fields without needing render()', () => {
  const stroop = getManifest('stroop');
  expect(stroop?.name).toBeTruthy();
  expect(stroop?.domain).toBe('flexibility');
  expect(stroop?.instruction.length).toBeGreaterThan(8);
});

test('loadExercise resolves a module with render', async () => {
  expect(knownExerciseIds()).toContain('even-odd');
  const mod = await loadExercise('even-odd');
  expect(mod.manifest.id).toBe('even-odd');
  expect(typeof mod.render).toBe('function');
});
