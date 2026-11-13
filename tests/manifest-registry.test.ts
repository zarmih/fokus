import { expect, test } from 'vitest';
import { registry as full } from '../src/exercises/registry';
import { registry as light, serializeManifests } from '../src/exercises/manifest-registry';
import { MANIFESTS } from '../src/exercises/manifests.generated';
import { knownExerciseIds, loadExercise } from '../src/exercises/load-exercise';
import fs from 'node:fs';

test('generated manifests match the exercise modules (run `npm run gen:manifests` after changing one)', () => {
  expect(fs.readFileSync('src/exercises/manifests.generated.ts', 'utf8')).toBe(serializeManifests(full.map((m) => m.manifest)));
  expect(light.map((m) => m.manifest)).toEqual(MANIFESTS);
  expect(MANIFESTS).toEqual(JSON.parse(JSON.stringify(full.map((m) => m.manifest))));
});

test('every manifest has a lazily loadable exercise with the same manifest', async () => {
  const ids = new Set(knownExerciseIds());
  for (const { manifest } of light) expect(ids.has(manifest.id)).toBe(true);
  for (const id of ['odd-one', 'tide-gate', 'reaction-strike']) {
    const mod = await loadExercise(id);
    expect(mod.manifest.id).toBe(id);
    expect(typeof mod.render).toBe('function');
  }
});

test('the app shell never imports the full module registry', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${name.name}`;
      if (name.isDirectory()) { if (p !== 'src/exercises') walk(p); continue; }
      if (!p.endsWith('.ts')) continue;
      if (/from ['"][./]*(exercises\/)?registry['"]/.test(fs.readFileSync(p, 'utf8')) || /exercises\/(dispatch)['"]/.test(fs.readFileSync(p, 'utf8'))) offenders.push(p);
    }
  };
  walk('src');
  for (const f of ['src/exercises/catalog.ts']) if (/from '\.\/registry'/.test(fs.readFileSync(f, 'utf8'))) offenders.push(f);
  expect(offenders).toEqual([]);
});
