import { afterEach, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { questProgressBarHtml } from '../src/ui/components/accessible-markup';

const rawCss = fs.readFileSync(path.join(process.cwd(), 'src/styles.css'), 'utf8');
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');

const TARGETS = [
  '.btn-pulse::after',
  '.stroop-btn',
  '.num-chip',
  '.glyph-3d',
  '.posner-dot',
  '.swings-hero.is-jump',
  '.swings-hero.is-reset'
];

/** Flat list of {selectors, body} rules, plus rules inside `@media (prefers-reduced-motion: reduce)` blocks. */
function topLevelRules(src: string): Array<{ sel: string[]; body: string; media: string | null }> {
  const out: Array<{ sel: string[]; body: string; media: string | null }> = [];
  let i = 0;
  const parseBlock = (text: string, media: string | null) => {
    let j = 0;
    while (j < text.length) {
      const open = text.indexOf('{', j);
      if (open === -1) break;
      const head = text.slice(j, open).trim();
      // find matching close brace
      let depth = 1;
      let k = open + 1;
      while (k < text.length && depth > 0) {
        if (text[k] === '{') depth++;
        else if (text[k] === '}') depth--;
        k++;
      }
      const inner = text.slice(open + 1, k - 1);
      if (head.startsWith('@media')) parseBlock(inner, head);
      else if (!head.startsWith('@')) out.push({ sel: head.split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: inner, media });
      j = k;
    }
  };
  parseBlock(src, null);
  void i;
  return out;
}

const rules = topLevelRules(css);
const stopsAnimation = (body: string) => /animation:\s*none\s*!important/.test(body);

describe('styles.css reduced-motion coverage', () => {
  test.each(TARGETS)('%s is stopped under the app setting (data-motion and .reduce-motion)', (target) => {
    for (const prefix of ['html[data-motion="reduce"]', ':root.reduce-motion']) {
      const hit = rules.find((r) => r.media === null && r.sel.includes(`${prefix} ${target}`) && stopsAnimation(r.body));
      expect(hit, `${prefix} ${target}`).toBeTruthy();
    }
  });

  test.each(TARGETS)('%s is stopped under @media (prefers-reduced-motion: reduce)', (target) => {
    const hit = rules.find(
      (r) => r.media?.includes('prefers-reduced-motion: reduce') && r.sel.includes(target) && stopsAnimation(r.body)
    );
    expect(hit, target).toBeTruthy();
  });

  test('entrance tiles keep a visible resting state; the infinite CTA shine is hidden', () => {
    for (const r of rules.filter((x) => x.sel.some((s) => s.endsWith('.posner-dot') && /reduce/.test(s)))) {
      expect(r.body).toMatch(/opacity:\s*1/);
    }
    const shine = rules.filter((r) => r.sel.some((s) => s.endsWith('.btn-pulse::after')) && stopsAnimation(r.body));
    expect(shine.length).toBeGreaterThanOrEqual(2);
    shine.forEach((r) => expect(r.body).toMatch(/display:\s*none/));
  });

  test('every infinite animation in styles.css has a reduce-motion override', () => {
    const reduceSelectors = new Set(
      rules
        .filter((r) => stopsAnimation(r.body) && (r.media?.includes('reduce') || r.sel.some((s) => /data-motion="reduce"|reduce-motion/.test(s))))
        .flatMap((r) => r.sel.map((s) => s.replace(/^(html\[data-motion="reduce"\]|:root\.reduce-motion)\s+/, '')))
    );
    const infinite = rules
      .filter((r) => r.media === null && /animation:[^;]*infinite/.test(r.body))
      .flatMap((r) => r.sel)
      .filter((s) => !/reduce/.test(s));
    const missing = infinite.filter((s) => !reduceSelectors.has(s));
    expect(missing).toEqual([]);
  });
});

describe('computed visibility under the app reduce setting', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-motion');
  });

  test('posner dot / glyph / tiles are fully opaque with no animation when data-motion=reduce', () => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes popIn { from { opacity: 0; } to { opacity: 1; } }
      ${rules
        .filter((r) => r.media === null && r.sel.some((s) => TARGETS.some((t) => s === t || s === `html[data-motion="reduce"] ${t}`)))
        .map((r) => `${r.sel.join(', ')} { ${r.body} }`)
        .join('\n')}
    `;
    document.head.appendChild(style);
    document.documentElement.setAttribute('data-motion', 'reduce');
    document.body.innerHTML = '<div class="posner-dot"></div><div class="glyph-3d"></div><button class="stroop-btn"></button><div class="num-chip"></div>';
    for (const el of [...document.body.children] as HTMLElement[]) {
      const cs = getComputedStyle(el);
      expect(cs.opacity).toBe('1');
      expect(cs.getPropertyValue('animation-name') || cs.getPropertyValue('animation')).toMatch(/^(none|)$/);
    }
  });
});

describe('quest progress track', () => {
  test('uses the theme --track token instead of hardcoded translucent white', () => {
    const el = document.createElement('div');
    el.innerHTML = questProgressBarHtml({ title: 'Q', progress: 1, target: 3 }, 33);
    const style = (el.firstElementChild as HTMLElement).getAttribute('style') || '';
    expect(style).toContain('background: var(--track)');
    expect(style).not.toMatch(/rgba\(255,\s*255,\s*255/);
    expect(css).toMatch(/--track:\s*color-mix\(in srgb, var\(--text\) 16%, transparent\)/);
  });
});
