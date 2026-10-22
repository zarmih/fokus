/**
 * «Тихий свет» — per-exercise decorative scenes.
 *
 * Every exercise play container gets `data-scene="<exercise-id>"` and a
 * decorative `.scene-layer` (aria-hidden, pointer-events:none, 5 empty <i>
 * slots). Scene visuals live in pure CSS under src/styles/scenes/*.css and are
 * scoped as `[data-scene="<id>"] .scene-layer …`.
 *
 * Exercises render into a dedicated `.play-host` child, so a module that
 * rewrites `el.innerHTML` never wipes the scene layer.
 */

export const SCENE_SLOTS = 5;

export function createSceneLayer(): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'scene-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<i></i>'.repeat(SCENE_SLOTS);
  return layer;
}

/**
 * Prepare the session arena for an exercise: set data-scene, ensure the scene
 * layer (first child) and an empty `.play-host` (where the module renders).
 * Returns the host element.
 */
export function mountScene(arena: HTMLElement, exerciseId: string, domain?: string): HTMLElement {
  arena.dataset.scene = exerciseId;
  if (domain) arena.dataset.sceneDomain = domain;
  else delete arena.dataset.sceneDomain;

  let layer = arena.querySelector(':scope > .scene-layer') as HTMLElement | null;
  if (!layer) {
    layer = createSceneLayer();
    arena.prepend(layer);
  }
  let host = arena.querySelector(':scope > .play-host') as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.className = 'play-host';
    layer.after(host);
  } else {
    host.innerHTML = '';
  }
  return host;
}

/** The exercise id of the closest scene-bearing ancestor (or the element itself). */
export function sceneIdFor(el: HTMLElement): string | undefined {
  return (el.closest('[data-scene]') as HTMLElement | null)?.dataset.scene;
}
