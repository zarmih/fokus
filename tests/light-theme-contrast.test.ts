import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderOfflineBanner } from '../src/ui/components/offline-banner';

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Light-on-dark literals that break on the light theme: translucent/solid white, the `white` keyword, neutral greys. */
const HARDCODED = /rgba\(\s*255\s*,\s*255\s*,\s*255\b[^)]*\)|#(?:fff|ffffff)\b|\bwhite\b(?!-space)|#([0-9a-f])\1\1\b|#([0-9a-f]{2})\2\2\b/i;

/**
 * Intentional exceptions. Everything here is drawn on a surface that is dark (or white) in BOTH themes,
 * so a fixed colour is correct. Adding an entry needs a reason.
 */
const ALLOWED_FILES: Record<string, string> = {
  'src/styles/tokens.css': 'theme token definitions (the one place literals belong)',
  'src/core/qrcode.js': 'QR codes need a fixed white quiet zone / black modules to scan',
  'src/core/device-transfer.ts': 'QR render colours (scanner contrast)',
  'src/ui/components/share-card.ts': 'exported share image uses a fixed dark palette',
};
const ALLOWED_DIRS: Record<string, string> = {
  'src/styles/scenes/': 'exercise scenes are painted on the always-dark stage sky',
  'src/exercises/': 'exercises render inside .play-arena / .play-stage, which re-scope the dark palette in every theme',
};
/** styles.css selectors (full rule selector text) allowed to use white literals. */
const ALLOWED_SELECTORS: Record<string, string> = {
  // Always-dark play stage and exercise widgets (only rendered inside .play-arena / .play-stage).
  '.play-stage': 'stage', '.play-sky': 'stage',
  '.grid-cell': 'stage', '.grid-cell::before': 'stage', '.grid-cell.highlight': 'stage', '.grid-cell.correct': 'stage', '.grid-cell.wrong': 'stage',
  '.stroop-btn': 'stage', '.oo-orb': 'stage', '.card-front': 'stage', '.card-front::after': 'stage', '.go-orb': 'stage',
  '.posner-box': 'stage', '.posner-dot': 'stage', '.mic-orb': 'stage', '.mic-orb.live': 'stage', '.corsi-block': 'stage',
  '.corsi-block .cube-lid': 'stage', '.schulte-btn': 'stage', '.schulte-btn.found': 'stage', '.f-bar': 'stage',
  '.swings-hero .hero-head': 'stage',
  // Glossy highlights on saturated accent fills: same look in both themes, not a boundary or text.
  '.cta-card': 'highlight on accent fill', '.btn-pulse': 'highlight on accent fill', '.btn-pulse::after': 'shine on accent fill',
  // prefers-contrast: dark default; [data-theme="light"] overrides it right below.
  '@media (prefers-contrast: more) >> :root': 'dark-theme value, light override follows',
};
const ALLOWED_LINES: Array<[file: string, snippet: string, reason: string]> = [
  ['src/ui/screens/settings.ts', 'id="qr-transfer"', 'QR container must stay white/black for scanning'],
];

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return walk(rel);
    return /\.(css|ts|js)$/.test(e.name) ? [rel] : [];
  });
}

/** Declarations containing a hardcoded white/grey, with their selector chain. */
function cssHits(src: string): Array<{ sel: string; decl: string }> {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack: string[] = [];
  const out: Array<{ sel: string; decl: string }> = [];
  let buf = '';
  for (const c of text) {
    if (c === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; }
    else if (c === '}') { if (buf.trim() && HARDCODED.test(buf)) out.push({ sel: stack.join(' >> '), decl: buf.trim() }); stack.pop(); buf = ''; }
    else if (c === ';') { if (HARDCODED.test(buf)) out.push({ sel: stack.join(' >> '), decl: buf.trim() }); buf = ''; }
    else buf += c;
  }
  return out;
}

const stripTsComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('light theme: no hardcoded light-on-dark colours outside the allowlist', () => {
  const files = walk('src').filter((f) => !ALLOWED_FILES[f] && !Object.keys(ALLOWED_DIRS).some((d) => f.startsWith(d)));

  test('CSS (styles.css and any other stylesheet outside scenes)', () => {
    const offenders = files
      .filter((f) => f.endsWith('.css'))
      .flatMap((f) => cssHits(read(f)).filter((h) => !ALLOWED_SELECTORS[h.sel]).map((h) => `${f}: ${h.sel} { ${h.decl} }`));
    expect(offenders).toEqual([]);
  });

  test('inline styles in src/**/*.ts|js (app chrome)', () => {
    const offenders = files
      .filter((f) => !f.endsWith('.css'))
      .flatMap((f) =>
        stripTsComments(read(f))
          .split('\n')
          .map((line, i) => ({ line, n: i + 1 }))
          .filter(({ line }) => HARDCODED.test(line))
          .filter(({ line }) => !ALLOWED_LINES.some(([af, snip]) => af === f && line.includes(snip)))
          .map(({ line, n }) => `${f}:${n}: ${line.trim().slice(0, 120)}`)
      );
    expect(offenders).toEqual([]);
  });

  test('allowlist has no stale entries', () => {
    const hitSelectors = new Set(cssHits(read('src/styles.css')).map((h) => h.sel));
    expect(Object.keys(ALLOWED_SELECTORS).filter((s) => !hitSelectors.has(s))).toEqual([]);
    for (const f of Object.keys(ALLOWED_FILES)) expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
    for (const [f, snip] of ALLOWED_LINES) expect(read(f)).toContain(snip);
  });

  test('the guard regex catches the patterns it is meant to', () => {
    for (const bad of ['rgba(255,255,255,0.1)', 'rgba(255, 255, 255, .2)', '#fff', '#FFFFFF', 'white', '#333', '#cccccc']) expect(HARDCODED.test(bad), bad).toBe(true);
    for (const ok of ['white-space: nowrap', '#F3F1FA', 'var(--text)', '#1C1A2E']) expect(HARDCODED.test(ok), ok).toBe(false);
  });
});

// ---- Contrast of the changed tokens, computed from tokens.css ----
type RGB = [number, number, number];
const hex = (h: string): RGB => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB; };
const lum = (c: RGB) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (fg: RGB, a: number, bg: RGB): RGB => fg.map((c, i) => c * a + bg[i] * (1 - a)) as RGB;

const tokens = read('src/styles/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
function block(selectorStart: string): Record<string, string> {
  const i = tokens.indexOf(selectorStart);
  const body = tokens.slice(tokens.indexOf('{', i) + 1, tokens.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const themes = { dark: block(':root, [data-theme="dark"]'), light: block('[data-theme="light"]') };
const shared = block(':root {');

describe('changed tokens meet WCAG in both themes', () => {
  for (const [name, t] of Object.entries(themes)) {
    const bg = hex(t['--ql-bg']);
    const text = hex(t['--ql-text']);
    const card = name === 'dark' ? mix([255, 255, 255], 0.045, bg) : mix([255, 255, 255], 0.82, bg);
    const trackMix = parseFloat(t['--ql-track-mix']) / 100;

    test(`${name}: --track ≥ 3:1 against bg, cards and elevated surfaces`, () => {
      for (const surface of [bg, card, hex(t['--ql-elevated'])]) {
        expect(ratio(mix(text, trackMix, surface), surface)).toBeGreaterThanOrEqual(3);
      }
    });
    test(`${name}: --on-ok text ≥ 4.5:1 on --ok`, () => {
      expect(ratio(hex(t['--ql-on-ok']), hex(t['--ql-ok']))).toBeGreaterThanOrEqual(4.5);
    });
    test(`${name}: text and muted stay ≥ 4.5:1 on --fill-subtle/--fill-muted panels`, () => {
      for (const a of [0.04, 0.07]) {
        const panel = mix(text, a, card);
        expect(ratio(text, panel)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(hex(t['--ql-text-muted']), panel)).toBeGreaterThanOrEqual(4.5);
      }
    });
    test(`${name}: offline banner text on --bg-elev ≥ 4.5:1`, () => {
      expect(ratio(text, hex(t['--ql-elevated']))).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('stage placeholder outline (num-chip / pn-item .missing) ≥ 3:1 on every sky tone', () => {
    const m = shared['--stage-placeholder-line'].match(/var\(--stage-text\) (\d+)%/);
    expect(m).toBeTruthy();
    const a = Number(m![1]) / 100;
    for (const sky of ['--stage-sky-base', '--stage-sky-indigo', '--stage-sky-violet']) {
      const s = hex(shared[sky]);
      expect(ratio(mix(hex(shared['--stage-text']), a, s), s)).toBeGreaterThanOrEqual(3);
    }
    const css = read('src/styles.css');
    expect(css).toMatch(/\.num-chip\.missing \{[^}]*border: 3px dashed var\(--stage-placeholder-line\)/);
    expect(css).toMatch(/\.pn-item\.missing \{[^}]*border: 3px dashed var\(--stage-placeholder-line\)/);
  });
});

describe('app chrome uses theme tokens', () => {
  test('offline banner has no hardcoded dark fallbacks', () => {
    const host = document.createElement('div');
    renderOfflineBanner(host);
    const el = host.querySelector('.offline-trust-banner') as HTMLElement;
    expect(el.style.backgroundColor).toBe('var(--bg-elev)');
    expect(el.style.color).toBe('var(--text)');
    expect(el.getAttribute('style')).not.toMatch(/#333|#fff|#444/);
  });

  test('program day chips and stats use defined tokens (no undefined --primary / --text-primary)', () => {
    const src = read('src/ui/screens/program.ts');
    expect(src).not.toMatch(/var\(--primary\)|--text-primary/);
    expect(src).toContain("isCompleted ? 'var(--on-ok)' : isCurrent ? 'var(--btn-text)' : 'var(--muted)'");
    const styles = read('src/styles.css');
    for (const v of ['--on-ok', '--btn-text', '--fill-subtle', '--fill-muted', '--track']) expect(styles).toMatch(new RegExp(`${v}:`));
  });

  test('progress tracks use --track', () => {
    const styles = read('src/styles.css');
    expect(styles).toMatch(/\.scale-track \{[^}]*background: var\(--track\)/);
    expect(read('src/ui/screens/program.ts')).toMatch(/phase-progress[^>]*background:\s*var\(--track\)/);
  });
});
