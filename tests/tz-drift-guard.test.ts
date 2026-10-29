import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Regression guard: Fokus days and hours live in Europe/Moscow (see core/streak.ts).
 * Runtime-local Date getters/setters and UTC ISO day slices drift near midnight
 * for users outside MSK. Use calendarDayKey / addCalendarDays / fokusWallHour instead.
 */
const SRC = join(__dirname, '..', 'src');

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'toISOString().slice(0, 10)', re: /toISOString\(\)\s*\.\s*(slice|substring|substr)\(\s*0\s*,\s*10\s*\)/ },
  { name: 'toISOString().split("T")', re: /toISOString\(\)\s*\.\s*split\(\s*['"`]T['"`]\s*\)/ },
  { name: 'local Date getter/setter', re: /\.(get|set)(Hours|Date|Day|Month|FullYear|Minutes)\(/ }
];

/** Intentional uses: "relative/path.ts" → reason. Keep this list short and justified. */
const ALLOWLIST: Record<string, string> = {};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p);
  }
  return out;
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('tz drift guard (src/)', () => {
  it('has no runtime-local Date math or UTC day slices outside the allowlist', () => {
    const hits: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file).split('\\').join('/');
      if (ALLOWLIST[rel]) continue;
      const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        for (const f of FORBIDDEN) if (f.re.test(line)) hits.push(`${rel}:${i + 1} ${f.name}: ${line.trim()}`);
      });
    }
    expect(hits, `Use calendarDayKey/addCalendarDays/fokusWallHour from core/streak.ts:\n${hits.join('\n')}`).toEqual([]);
  });

  it('the guard itself catches the patterns', () => {
    const sample = stripComments("const d = new Date().toISOString().slice(0, 10);\nx.setHours(0);\n// x.getHours()");
    const found = FORBIDDEN.filter((f) => sample.split('\n').some((l) => f.re.test(l))).map((f) => f.name);
    expect(found).toEqual(['toISOString().slice(0, 10)', 'local Date getter/setter']);
  });
});
