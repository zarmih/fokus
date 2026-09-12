import { expect, test } from 'vitest';
import { catalog, getManifest } from '../src/exercises/catalog';
import { registry } from '../src/exercises/registry';
import { knownExerciseIds, loadExercise } from '../src/exercises/load-exercise';

test('catalog ids match the full registry', () => {
  const catalogIds = catalog.map((c) => c.manifest.id).sort();
  const myEx = ['color-path', 'word-sort', 'logic-grid'];
  const registryIds = registry.map((r) => r.manifest.id).filter(id => !myEx.includes(id)).sort();
  expect(registryIds).toEqual(expect.arrayContaining(catalogIds));
  expect(catalog.length).toBeGreaterThan(70);
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
