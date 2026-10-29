import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { reducedMotionCss } from '../src/exercises/reduced-motion-css';
import trailMake from '../src/exercises/trail-make';
import tokenWarp from '../src/exercises/token-warp';
import spatialSpeed from '../src/exercises/spatial-speed';
import colorFrequency from '../src/exercises/color-frequency';

describe('reducedMotionCss', () => {
  test('emits an app-setting rule and a prefers-reduced-motion rule', () => {
    const css = reducedMotionCss('.a, .b', 'opacity: 1;');
    expect(css).toContain('html[data-motion="reduce"] .a, html[data-motion="reduce"] .b { animation: none !important; opacity: 1; }');
    expect(css).toContain('@media (prefers-reduced-motion: reduce) { .a, .b { animation: none !important; opacity: 1; } }');
  });
  test('works without end-state declarations', () => {
    expect(reducedMotionCss('.x')).toContain('html[data-motion="reduce"] .x { animation: none !important; }');
  });
});

const cases: Array<[string, any, string, string[]]> = [
  ['trail-make', trailMake, '.tm-node.error', []],
  ['token-warp', tokenWarp, '.tw-rule.warp', []],
  ['spatial-speed', spatialSpeed, '.ss-target', ['transform: translate(-50%, -50%) scale(1);']],
  ['color-frequency', colorFrequency, '.cf-dot', ['opacity: 1;', 'transform: scale(1);']]
];

describe('exercise inline animations honor reduced motion', () => {
  let cleanup: any = null;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="host"></div>';
    document.documentElement.dataset.motion = '';
  });
  afterEach(() => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    vi.useRealTimers();
    document.documentElement.dataset.motion = '';
  });

  test.each(cases)('%s injects overrides for its animated selector', (_name, mod, selector, rest) => {
    const host = document.getElementById('host')!;
    cleanup = mod.render(host, 1, () => {}, () => false);
    const css = [...host.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toContain(`html[data-motion="reduce"] ${selector} { animation: none !important;`);
    expect(css).toContain(`@media (prefers-reduced-motion: reduce) { ${selector} { animation: none !important;`);
    rest.forEach((decl) => expect(css).toContain(decl));
  });

  test('color-frequency dots are visible without the pop animation under the app setting', () => {
    document.documentElement.dataset.motion = 'reduce';
    const host = document.getElementById('host')!;
    cleanup = colorFrequency.render(host, 1, () => {}, () => false);
    const dot = host.querySelector('.cf-dot') as HTMLElement | null;
    expect(dot).toBeTruthy();
    expect(getComputedStyle(dot!).opacity).toBe('1');
  });

  test('color-frequency dots keep the pop entrance (start hidden) when motion is full', () => {
    document.documentElement.dataset.motion = 'full';
    const host = document.getElementById('host')!;
    cleanup = colorFrequency.render(host, 1, () => {}, () => false);
    const dot = host.querySelector('.cf-dot') as HTMLElement;
    expect(getComputedStyle(dot).opacity).toBe('0');
  });
});
