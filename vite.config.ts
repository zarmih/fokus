import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generateServiceWorker } from './scripts/generate-sw';

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
  return {
    name: 'fokus-sw',
    apply: 'build',
    closeBundle() {
      const dist = path.join(process.cwd(), 'dist');
      const files = listFiles(dist).map((f) => path.relative(dist, f).split(path.sep).join('/'));
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
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
          if (id.includes('src/exercises/')) {
            const parts = id.split('src/exercises/')[1].split('/');
            if (parts.length > 1) {
              return `ex-${parts[0]}`;
            }
          }
        }
      }
    }
  }
}));
