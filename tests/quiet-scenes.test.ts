import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { catalog } from '../src/exercises/catalog';
import { mountScene, sceneIdFor, SCENE_SLOTS } from '../src/ui/scene';

const SCENES_DIR = join(__dirname, '..', 'src', 'styles', 'scenes');
const DOMAINS = ['attention', 'memory', 'speed', 'logic', 'flexibility'] as const;

function sceneCss(): string {
  return readdirSync(SCENES_DIR)
    .filter((f) => f.endsWith('.css') && f !== 'index.css' && f !== 'base.css')
    .map((f) => readFileSync(join(SCENES_DIR, f), 'utf8'))
    .join('\n');
}

function missingSceneIds(): string[] {
  // Strip comments so the id lists in file headers don't count as rules.
  const css = sceneCss().replace(/\/\*[\s\S]*?\*\//g, '');
  return catalog
    .map((c) => c.manifest.id)
    .filter((id) => !css.includes(`[data-scene="${id}"]`))
    .sort();
}

describe('quiet-light scenes: mount', () => {
  it('sets data-scene, adds an aria-hidden layer with slots and an exercise host', () => {
    const arena = document.createElement('div');
    arena.className = 'play-arena';
    const host = mountScene(arena, 'grid-memory', 'memory');
    expect(arena.dataset.scene).toBe('grid-memory');
    expect(arena.dataset.sceneDomain).toBe('memory');
    const layer = arena.firstElementChild as HTMLElement;
    expect(layer.className).toBe('scene-layer');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelectorAll(':scope > i').length).toBe(SCENE_SLOTS);
    expect(host.className).toBe('play-host');
    // An exercise wiping its own container must not wipe the scene.
    host.innerHTML = '<div class="board"></div>';
    host.innerHTML = '';
    expect(arena.querySelector('.scene-layer')).toBe(layer);
    expect(sceneIdFor(host)).toBe('grid-memory');
  });

  it('reuses the layer and clears the host on the next exercise', () => {
    const arena = document.createElement('div');
    mountScene(arena, 'schulte', 'attention').innerHTML = '<b>x</b>';
    const host = mountScene(arena, 'pairs', 'memory');
    expect(arena.querySelectorAll('.scene-layer').length).toBe(1);
    expect(host.innerHTML).toBe('');
    expect(arena.dataset.scene).toBe('pairs');
  });
});

describe('quiet-light scenes: files', () => {
  it('has one file per domain, each listing exactly its registered exercise ids', () => {
    for (const d of DOMAINS) {
      const src = readFileSync(join(SCENES_DIR, `${d}.css`), 'utf8');
      const header = src.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? '';
      const ids = catalog.filter((c) => c.manifest.domain === d).map((c) => c.manifest.id);
      for (const id of ids) expect(header, `${d}.css header lists ${id}`).toMatch(new RegExp(`\\*\\s+${id}\\s*$`, 'm'));
    }
  });

  it('scopes every scene rule under [data-scene="<id>"] .scene-layer', () => {
    const css = sceneCss().replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(',').map((s) => s.trim())).filter(Boolean);
    const known = new Set(catalog.map((c) => c.manifest.id));
    for (const sel of selectors) {
      if (sel.startsWith('@')) continue;
      const m = sel.match(/^\[data-scene="([^"]+)"\] \.scene-layer\b/);
      expect(m, `bad selector: ${sel}`).toBeTruthy();
      expect(known.has(m![1]), `unknown exercise id in selector: ${sel}`).toBe(true);
    }
  });

  it('reports exercises still without a scene (informational)', () => {
    const missing = missingSceneIds();
    if (missing.length) console.info(`[quiet-scenes] ${missing.length}/${catalog.length} without scene:`, missing.join(' '));
    expect(missing.length).toBeLessThanOrEqual(catalog.length);
  });

  it('every registered exercise has a scene', () => {
    expect(missingSceneIds()).toEqual([]);
  });
});
