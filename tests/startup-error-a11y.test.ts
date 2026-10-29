import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  errorScreenHtml,
  escapeHtml,
  programTrendChipHtml,
  questProgressBarHtml,
  questProgressValueText
} from '../src/ui/components/accessible-markup';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function token(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token ${name} not found`);
  return m[1];
}

describe('startup error screen', () => {
  test('is an alert using the theme danger token, with escaped content', () => {
    const el = mount(errorScreenHtml('Ошибка навигации', '<img src=x onerror=alert(1)>'));
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('style')).toContain('var(--danger');
    expect(el.getAttribute('style')).not.toMatch(/#f44336/i);
    expect(el.querySelector('h3')?.textContent).toBe('Ошибка навигации');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('p')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  test('main.ts has no hardcoded #f44336 and renders every error via errorScreenHtml', () => {
    const src = read('src/main.ts');
    expect(src).not.toMatch(/#f44336/i);
    expect((src.match(/errorScreenHtml\(/g) || []).length).toBe(4);
  });

  test('danger token meets 4.5:1 on the background in both themes (and the fallback on white)', () => {
    const css = read('src/styles/tokens.css');
    const lightStart = css.indexOf('[data-theme="light"]');
    const dark = css.slice(0, lightStart);
    const light = css.slice(lightStart);
    expect(contrast(token(dark, 'ql-danger'), token(dark, 'ql-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(light, 'ql-danger'), token(light, 'ql-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#B83E63', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    // The old colour failed on the light background.
    expect(contrast('#f44336', token(light, 'ql-bg'))).toBeLessThan(4.5);
  });
});

describe('quest progress bar', () => {
  test('has an accessible name and Russian value text', () => {
    const el = mount(questProgressBarHtml({ title: 'Три блока "памяти"', progress: 2, target: 5 }, 40));
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-label')).toBe('Прогресс задания: Три блока "памяти"');
    expect(el.getAttribute('aria-valuenow')).toBe('2');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('5');
    expect(el.getAttribute('aria-valuetext')).toBe('2 из 5');
    expect(questProgressValueText(0, 3)).toBe('0 из 3');
  });

  test('Today renders quests through the named progressbar', () => {
    const src = read('src/ui/screens/today.ts');
    expect(src).toContain('questProgressBarHtml(q, pct)');
    expect(src).not.toMatch(/role="progressbar" aria-valuenow="\$\{q\.progress\}"/);
  });
});

describe('program trend chip', () => {
  test('is a labelled role=img using theme text colour', () => {
    const el = mount(programTrendChipHtml({ label: '↑ +4', aria: 'Тренд: растёт' }));
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Тренд: растёт');
    const style = el.getAttribute('style') || '';
    expect(style).toContain('color: var(--text)');
    expect(style).not.toMatch(/#fff\b/i);
  });

  test('program.ts uses the shared chip builder', () => {
    const src = read('src/ui/screens/program.ts');
    expect(src).toContain('programTrendChipHtml(chip)');
    expect(src).not.toMatch(/trend-chip[^`]*color: #fff/);
  });

  test('escapeHtml escapes attribute-breaking characters', () => {
    expect(escapeHtml(`a"b'<c>&`)).toBe('a&quot;b&#39;&lt;c&gt;&amp;');
  });
});
