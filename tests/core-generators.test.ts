/**
 * Core exercise generators (core program, step 4): seeded, reproducible fixtures; no ambiguous or
 * impossible trials; difficulty that does not get easier as the level goes up.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { registry } from '../src/exercises/registry';
import { CORE_EXERCISE_IDS } from '../src/core/core-catalog';
import { StroopEngine } from '../src/exercises/stroop/engine';
import { SwitchRuleEngine, computeAnswer } from '../src/exercises/switch-rule/engine';
import { OddOneEngine } from '../src/exercises/odd-one/engine';
import { GridMemoryEngine } from '../src/exercises/grid-memory/engine';
import { SequenceEngine } from '../src/exercises/sequence/engine';
import { PatternNextEngine } from '../src/exercises/pattern-next/engine';
import { ShapeEquationEngine } from '../src/exercises/shape-equation/engine';
import { HelixFlipEngine } from '../src/exercises/helix-flip/engine';
import { generateEquation } from '../src/exercises/math-sprint/engine';
import { LEVELS as PULLEY_LEVELS, generateDynamicTask, getPulleyParams } from '../src/exercises/pulley/manifest';
import { isSolvable } from '../src/exercises/pulley/engine';
import { tideGateParams } from '../src/exercises/tide-gate';
import { anchorPairParams } from '../src/exercises/anchor-pair';
import { slipMarkParams } from '../src/exercises/slip-mark';
import { cutBarParams } from '../src/exercises/cut-bar';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seeded<T>(seed: number, fn: () => T): T {
  const spy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return fn(); } finally { spy.mockRestore(); }
}
afterEach(() => vi.restoreAllMocks());

const manifest = (id: string) => registry.find((r) => r.manifest.id === id)!.manifest as any;
const levelsOf = (id: string) => { const lv = manifest(id).levels || {}; return Object.keys(lv).map(Number).sort((a, b) => a - b).map((k) => lv[k]); };
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

/** Non-decreasing ("harder" grows) or non-increasing ("harder" shrinks) along the level table, and not flat. */
function expectMonotonic(values: number[], dir: 'up' | 'down', label: string) {
  for (let i = 1; i < values.length; i++) {
    if (dir === 'up') expect(values[i], `${label} @${i + 1}`).toBeGreaterThanOrEqual(values[i - 1]);
    else expect(values[i], `${label} @${i + 1}`).toBeLessThanOrEqual(values[i - 1]);
  }
  expect(values[0] !== values[values.length - 1], `${label} changes across levels`).toBe(true);
}

describe('difficulty never gets easier with level', () => {
  // A level step may relax a secondary knob only when a structural ("primary") knob gets harder —
  // e.g. odd-one 5→6 goes to a 5×5 grid and widens the hue gap again. Otherwise every knob must be
  // at least as hard and at least one strictly harder. (Lexicographic difficulty: primary first.)
  type Knob = [key: string, dir: 'up' | 'down' | 'change'];
  const spec: Record<string, { primary: Knob[]; secondary: Knob[] }> = {
    'odd-one': { primary: [['grid', 'up']], secondary: [['deltaHue', 'down'], ['deadlineMs', 'down']] },
    'go-no-go': { primary: [['noGoRatio', 'up']], secondary: [['trials', 'up']] },
    'grid-memory': { primary: [['cells', 'up'], ['grid', 'up']], secondary: [['showMs', 'down']] },
    sequence: { primary: [['length', 'up'], ['grid', 'up']], secondary: [['flashMs', 'down'], ['gapMs', 'down']] },
    stroop: { primary: [['colors', 'up']], secondary: [['incongruentPct', 'up'], ['deadlineMs', 'down']] },
    'switch-rule': { primary: [['switchEvery', 'down']], secondary: [['deadlineMs', 'down']] },
    'helix-flip': { primary: [['switchChance', 'up']], secondary: [] },
    // pattern-next: a new rule each level is the structural step (rule complexity is not a scalar).
    'pattern-next': { primary: [['ruleType', 'change']], secondary: [['deadlineMs', 'down']] },
    'shape-equation': { primary: [['unknowns', 'up']], secondary: [['maxVal', 'up'], ['deadlineMs', 'down']] }
  };
  const cmp = (a: any, b: any, dir: 'up' | 'down' | 'change') => (a === b ? 0 : dir === 'change' ? 1 : (dir === 'up' ? b > a : b < a) ? 1 : -1);
  test.each(Object.keys(spec))('%s level table never gets easier', (id) => {
    const lv = levelsOf(id);
    const { primary, secondary } = spec[id];
    for (let i = 1; i < lv.length; i++) {
      const p = primary.map(([k, d]) => cmp(lv[i - 1][k], lv[i][k], d));
      const s = secondary.map(([k, d]) => cmp(lv[i - 1][k], lv[i][k], d));
      expect(p.every((x) => x >= 0), `${id} ${i}→${i + 1}: a structural knob got easier`).toBe(true);
      if (p.some((x) => x > 0)) continue;
      expect(s.every((x) => x >= 0), `${id} ${i}→${i + 1}: easier without a structural step`).toBe(true);
      expect(s.some((x) => x > 0) || p.some((x) => x > 0), `${id} ${i}→${i + 1}: identical levels`).toBe(true);
    }
  });

  test('grid-memory never asks for more cells than the grid has', () => {
    for (const l of levelsOf('grid-memory')) expect(l.cells).toBeLessThan(l.grid * l.grid);
  });

  const L = Array.from({ length: 20 }, (_, i) => i + 1);
  test('formula-driven core modules (tide-gate, anchor-pair, slip-mark, cut-bar, pulley)', () => {
    expectMonotonic(L.map((l) => tideGateParams(l).gateH), 'down', 'tide-gate.gateH');
    expectMonotonic(L.map((l) => tideGateParams(l).speed), 'up', 'tide-gate.speed');
    expectMonotonic(L.map((l) => anchorPairParams(l).showMs), 'down', 'anchor-pair.showMs');
    expectMonotonic(L.map((l) => anchorPairParams(l).blankMs), 'up', 'anchor-pair.blankMs');
    expectMonotonic(L.map((l) => slipMarkParams(l).gateWidth), 'down', 'slip-mark.gateWidth');
    expectMonotonic(L.map((l) => slipMarkParams(l).markSpeed), 'up', 'slip-mark.markSpeed');
    expectMonotonic(L.map((l) => cutBarParams(l).lateWindow), 'down', 'cut-bar.lateWindow');
    expectMonotonic(L.map((l) => cutBarParams(l).fillSpeed), 'up', 'cut-bar.fillSpeed');
    expectMonotonic(L.map((l) => getPulleyParams(l).deadlineMs), 'down', 'pulley.deadlineMs');
    // Hand-made pulley table: larger door weights at the top than at the bottom (not strictly per level).
    const meanNeed = (xs: typeof PULLEY_LEVELS) => xs.flatMap((x) => x.need).reduce((a, b) => a + b, 0) / (xs.length * 4);
    expect(meanNeed(PULLEY_LEVELS.slice(15))).toBeGreaterThan(meanNeed(PULLEY_LEVELS.slice(0, 5)));
  });

  test('math-sprint operands grow with level', () => {
    const maxOperand = (level: number) => Math.max(...SEEDS.map((s) => seeded(s, () => {
      const [a, , b] = generateEquation(level).equation.split(' ');
      return Math.max(Number(a), Number(b));
    })));
    expectMonotonic([1, 4, 8, 15].map(maxOperand), 'up', 'math-sprint.maxOperand');
  });
});

describe('no ambiguous or impossible trials (200 seeds × min/mid/max level)', () => {
  const pick = (id: string) => { const lv = levelsOf(id); return [lv[0], lv[Math.floor(lv.length / 2)], lv[lv.length - 1]]; };

  test('stroop: ink is always one of the answer buttons; incongruent means ink ≠ word', () => {
    for (const p of pick('stroop')) for (const s of SEEDS) seeded(s, () => {
      const t = new StroopEngine().nextTrial(p);
      expect(t.options).toContain(t.ink);
      expect(new Set(t.options).size).toBe(t.options.length);
      expect(t.congruent).toBe(t.ink === t.word);
    });
  });

  test('switch-rule: the expected answer follows the shown rule', () => {
    for (const p of pick('switch-rule')) seeded(7, () => {
      const e = new SwitchRuleEngine();
      for (let i = 0; i < 200; i++) {
        const t = e.nextTrial(p);
        expect(t.correctYes).toBe(computeAnswer(t.rule, t.left, t.right));
        if (t.rule === 'GREATER') expect(t.left).not.toBe(t.right); // "Левое больше?" is never a tie
      }
    });
  });

  test('odd-one: exactly one tile differs, and it really differs', () => {
    for (const p of pick('odd-one')) for (const s of SEEDS) seeded(s, () => {
      const r = new OddOneEngine().start(p);
      expect(r.cells).toHaveLength(p.grid * p.grid);
      expect(r.cells.filter((c: any) => c.isOdd)).toHaveLength(1);
      const hues = new Set(r.cells.map((c: any) => c.hue));
      expect(hues.size).toBe(2);
    });
  });

  test('grid-memory / sequence: targets are inside the grid; grid-memory targets are distinct', () => {
    for (const p of pick('grid-memory')) for (const s of SEEDS) seeded(s, () => {
      const r = new GridMemoryEngine().start(p);
      expect(new Set(r.cellsToRemember).size).toBe(p.cells);
      for (const c of r.cellsToRemember) expect(c).toBeGreaterThanOrEqual(0), expect(c).toBeLessThan(p.grid * p.grid);
    });
    for (const p of pick('sequence')) for (const s of SEEDS) seeded(s, () => {
      const r = new SequenceEngine().start(p);
      expect(r.sequence).toHaveLength(p.length);
      for (const c of r.sequence) expect(c).toBeLessThan(p.grid * p.grid);
    });
  });

  test('pattern-next: the answer is among the options exactly once, options are distinct', () => {
    for (const p of levelsOf('pattern-next')) for (const s of SEEDS.slice(0, 50)) seeded(s, () => {
      const t = new PatternNextEngine().nextTrial(p);
      expect(t.options.filter((o) => o === t.answer)).toHaveLength(1);
      expect(new Set(t.options).size).toBe(t.options.length);
      expect(t.sequence).toHaveLength(4);
    });
  });

  test('shape-equation: the chain determines the target; options distinct, positive, contain it once', () => {
    for (const p of pick('shape-equation')) for (const s of SEEDS) seeded(s, () => {
      const r = new ShapeEquationEngine().start(p);
      // Solve the chain from the equations alone.
      const known = new Map<string, number>();
      for (const eq of r.equations) {
        const [x, y] = eq.left;
        if (x === y) known.set(x, eq.right / 2);
        else if (known.has(x)) known.set(y, eq.right - known.get(x)!);
      }
      expect(known.get(r.targetShape)).toBe(r.targetVal);
      expect(r.options.filter((o) => o === r.targetVal)).toHaveLength(1);
      expect(new Set(r.options).size).toBe(4);
      for (const o of r.options) expect(o).toBeGreaterThan(0);
    });
  });

  test('math-sprint: shown verdict matches the arithmetic; wrong answers are never correct by accident', () => {
    for (const level of [1, 4, 8, 15]) for (const s of SEEDS) seeded(s, () => {
      const g = generateEquation(level);
      const [a, op, b, , shown] = g.equation.split(' ');
      const real = op === '+' ? +a + +b : op === '-' ? +a - +b : +a * +b;
      expect(real === Number(shown)).toBe(g.isCorrect);
      expect(Number(shown)).toBeGreaterThanOrEqual(0);
    });
  });

  test('pulley: every level table and every generated task is solvable', () => {
    PULLEY_LEVELS.forEach((l, i) => expect(isSolvable(l.need, l.pool), `level ${i + 1}`).toBe(true));
    for (const level of [1, 10, 20]) for (const s of SEEDS.slice(0, 50)) seeded(s, () => {
      const t = generateDynamicTask(level);
      expect(isSolvable(t.need, t.pool)).toBe(true);
    });
  });

  test('helix-flip: match flag agrees with the active rule; mismatches vary', () => {
    seeded(11, () => {
      const e = new HelixFlipEngine();
      const mismatchShapes = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const t = e.generateTrial(0.3, 'Форма');
        const same = t.rule === 'Форма' ? t.leftShape === t.rightShape : t.leftColor === t.rightColor;
        expect(same).toBe(t.isMatch);
        if (t.rule === 'Форма' && !t.isMatch && t.leftShape === 'Квадрат') mismatchShapes.add(t.rightShape);
      }
      expect(mismatchShapes.size).toBe(2);
    });
  });
});

describe('seeded fixtures are reproducible', () => {
  test.each(CORE_EXERCISE_IDS as string[])('%s renders the same first screen for the same seed', async (id) => {
    vi.useFakeTimers();
    const mod = registry.find((r) => r.manifest.id === id)!;
    const run = (seed: number) => seeded(seed, () => {
      document.body.innerHTML = '<div id="h"></div>';
      const host = document.getElementById('h')!;
      const cleanup: any = mod.render(host, 5, () => {}, () => false);
      const html = host.innerHTML.replace(/\s+/g, ' ');
      try { cleanup?.(); } catch { /* ignore */ }
      return html;
    });
    const a = run(42);
    const b = run(42);
    vi.useRealTimers();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toBe(b);
  });
});
