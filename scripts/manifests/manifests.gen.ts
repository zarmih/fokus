// `npm run gen:manifests` — writes src/exercises/manifests.generated.ts from the full registry.
// The app imports only this data at start; exercise code loads on demand (load-exercise.ts).
import { test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { registry } from '../../src/exercises/registry';
import { serializeManifests } from '../../src/exercises/manifest-registry';

test('generate manifests', () => {
  const out = path.join(process.cwd(), 'src/exercises/manifests.generated.ts');
  fs.writeFileSync(out, serializeManifests(registry.map((m) => m.manifest)));
});
