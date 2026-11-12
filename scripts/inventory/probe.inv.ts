/**
 * Dynamic exercise inventory probe (not part of `npm test`).
 * Run: npx vitest run -c scripts/inventory/vitest.inventory.config.ts
 * Writes scripts/inventory/probe-result.json.
 */
import { describe, it, vi } from 'vitest';
import { writeFileSync, readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('inventory', () => {
  it('probes every registry module', async () => {
    (globalThis as any).speechSynthesis = { speak() {}, cancel() {} };
    (globalThis as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    HTMLCanvasElement.prototype.getContext = (() => null) as any;
    const { registry } = await import('../../src/exercises/registry');
    const root = join(__dirname, '../../');
    const testsDir = join(root, 'tests');
    const testSrc = readdirSync(testsDir).map((f) => [f, readFileSync(join(testsDir, f), 'utf8')] as const);
    const out: any[] = [];

    const only = (process.env.PROBE_IDS || '').split(',').filter(Boolean);
    const skip = (process.env.PROBE_SKIP || '').split(',').filter(Boolean);
    for (const mod of registry) {
      const m: any = mod.manifest;
      if (only.length && !only.includes(m.id)) continue;
      if (skip.includes(m.id)) continue;
      if (process.env.PROBE_DONE && existsSync(process.env.PROBE_DONE) && readFileSync(process.env.PROBE_DONE, 'utf8').split('\n').some((l) => l.startsWith('{"id":"' + m.id + '"'))) continue;
      writeFileSync('/tmp/probe-current.txt', m.id + '\n', { flag: 'a' });
      const id = m.id;
      const dir = join(root, 'src/exercises', id);
      const isDir = existsSync(dir) && statSync(dir).isDirectory();
      const files = isDir ? readdirSync(dir) : [];
      const srcText = isDir
        ? files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n')
        : existsSync(join(root, 'src/exercises', id + '.ts')) ? readFileSync(join(root, 'src/exercises', id + '.ts'), 'utf8') : '';
      const tests = testSrc.filter(([, s]) => s.includes(`'${id}'`) || s.includes(`"${id}"`) || s.includes(`exercises/${id}`)).map(([f]) => f);
      const row: any = {
        id, name: m.name, domain: m.domain, skills: m.skills, metricModel: m.metricModel ?? null,
        instruction: m.instruction,
        levels: m.levels ? Object.keys(m.levels).length : null,
        layout: isDir ? files.filter((f) => f.endsWith('.ts')).map((f) => f.replace('.ts', '')).join('+') : 'single',
        tests,
        mathRandom: (srcText.match(/Math\.random/g) || []).length,
        visibility: /visibilitychange|document\.hidden/.test(srcText),
        audio: /speechSynthesis|AudioContext|new Audio/.test(srcText),
        hexColors: (srcText.match(/#[0-9a-fA-F]{6}\b/g) || []).length,
      };

      // --- run 1: no input, how long until it ends, what does it report?
      const run = (level: number, seed: number, horizonSec: number) => {
        vi.useFakeTimers({ now: new Date('2026-11-12T09:00:00Z') });
        const rnd = mulberry(seed);
        const spy = vi.spyOn(Math, 'random').mockImplementation(rnd);
        const docAdd = vi.spyOn(document, 'addEventListener');
        const docRem = vi.spyOn(document, 'removeEventListener');
        const winAdd = vi.spyOn(window, 'addEventListener');
        const winRem = vi.spyOn(window, 'removeEventListener');
        const el = document.createElement('div');
        document.body.innerHTML = '';
        document.body.appendChild(el);
        let timeUp = false;
        let ended: any = null; let endedAt = -1; let endCalls = 0;
        let err: string | null = null; let cleanup: any;
        let firstHtml = '';
        try {
          cleanup = mod.render(el, level, (r) => { endCalls++; if (!ended) { ended = r; endedAt = elapsed; } }, () => timeUp);
          firstHtml = el.innerHTML.replace(/\s+/g, ' ').slice(0, 4000);
        } catch (e: any) { err = String(e?.message || e); }
        let elapsed = 0;
        try {
          while (!ended && elapsed < horizonSec && !err) { vi.advanceTimersByTime(1000); elapsed++; }
          let afterTimeUp = -1;
          if (!ended && !err) {
            timeUp = true;
            for (let s = 0; s < 30 && !ended; s++) { vi.advanceTimersByTime(1000); afterTimeUp = s + 1; }
          }
          // leak check: cleanup then count
          if (typeof cleanup === 'function') { try { cleanup(); } catch (e: any) { err = err || 'cleanup:' + e?.message; } }
          const pendingAfterCleanup = vi.getTimerCount();
          vi.advanceTimersByTime(5000);
          const res = {
            err, ended, endedAt: ended ? endedAt : -1, endCalls, afterTimeUp,
            hasCleanup: typeof cleanup === 'function',
            pendingAfterCleanup,
            pendingAfter5s: vi.getTimerCount(),
            docListenersNet: docAdd.mock.calls.length - docRem.mock.calls.length,
            winListenersNet: winAdd.mock.calls.length - winRem.mock.calls.length,
            firstHtml
          };
          return res;
        } catch (e: any) {
          return { err: String(e?.message || e), ended: null, endedAt: -1, endCalls, afterTimeUp: -1, hasCleanup: false, pendingAfterCleanup: -1, pendingAfter5s: -1, docListenersNet: 0, winListenersNet: 0, firstHtml };
        } finally {
          spy.mockRestore(); docAdd.mockRestore(); docRem.mockRestore(); winAdd.mockRestore(); winRem.mockRestore();
          vi.clearAllTimers(); vi.useRealTimers();
        }
      };
      const lo = run(1, 7, 240);
      const hi = run(row.levels || 20, 7, 240);
      const again = run(1, 7, 1);
      const other = run(1, 99, 1);
      row.idle = { endedAtSec: lo.endedAt, afterTimeUpSec: lo.afterTimeUp, result: lo.ended, endCalls: lo.endCalls, err: lo.err };
      row.idleHi = { endedAtSec: hi.endedAt, result: hi.ended, err: hi.err };
      row.cleanup = { has: lo.hasCleanup, pendingTimers: lo.pendingAfterCleanup, pendingAfter5s: lo.pendingAfter5s, docNet: lo.docListenersNet, winNet: lo.winListenersNet };
      row.seededReproducible = again.firstHtml === lo.firstHtml;
      row.seedSensitive = other.firstHtml !== lo.firstHtml;
      out.push(row);
      if (process.env.PROBE_DONE) writeFileSync(process.env.PROBE_DONE, JSON.stringify(row) + '\n', { flag: 'a' });
    }
    writeFileSync(join(__dirname, process.env.PROBE_OUT || 'probe-result.json'), JSON.stringify(out, null, 1));
  });
});
