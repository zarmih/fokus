import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generateServiceWorker, shouldPrecache } from './scripts/generate-sw';

function listFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'sw.js' || name.endsWith('.map')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) listFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function fokusSw(): Plugin {
  const staticImports = new Map<string, string[]>();
  return {
    name: 'fokus-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') staticImports.set(output.fileName, output.imports);
      }
    },
    closeBundle() {
      const dist = path.join(process.cwd(), 'dist');
      const precache = new Set(listFiles(dist)
        .map((file) => path.relative(dist, file).split(path.sep).join('/'))
        .filter(shouldPrecache));
      // Rollup can put boot dependencies in exercise-named chunks. Follow static imports
      // of the precached chunks while leaving optional dynamic exercise imports on demand.
      for (const file of precache) {
        for (const dependency of staticImports.get(file) ?? []) precache.add(dependency);
      }
      const files = [...precache].sort();
      const hash = createHash('sha256').update(generateServiceWorker(files, ''));
      for (const file of files) {
        hash.update(file);
        hash.update(createHash('sha256').update(fs.readFileSync(path.join(dist, file))).digest());
      }
      const version = hash.digest('hex').slice(0, 10);
      fs.writeFileSync(path.join(dist, 'sw.js'), generateServiceWorker(files, version));
    }
  };
}

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/fokus/' : '/',
  plugins: [fokusSw()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('src/exercises/')) return;
          const rel = id.split('src/exercises/')[1];
          if (!rel) return;
          const top = rel.split('/')[0].replace(/\.ts$/, '');
          if (['contract', 'dispatch', 'registry', 'stage', 'types', 'catalog', 'load-exercise'].includes(top)) {
            return;
          }
          return `ex-${top}`;
        }
      }
    }
  }
}));
