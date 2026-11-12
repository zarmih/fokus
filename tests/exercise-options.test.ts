import { describe, expect, it } from 'vitest';
import { distinctIndices, distinctOptions, nearbyNumberOptions, shuffled } from '../src/exercises/lib/options';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('bounded option generators', () => {
  it('shuffled is a permutation and reproducible for a seed', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7];
    const a = shuffled(xs, rng(3));
    expect([...a].sort()).toEqual(xs);
    expect(shuffled(xs, rng(3))).toEqual(a);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('distinctOptions always contains the answer once, is distinct, and terminates on tiny pools', () => {
    for (let seed = 0; seed < 300; seed++) {
      const r = rng(seed);
      const poolSize = seed % 6; // 0..5 — includes the old freezing case (3 names, 4 options)
      const preferred = Array.from({ length: poolSize }, (_, i) => `n${i}`);
      const opts = distinctOptions('n0', 4, preferred, [], r);
      expect(opts.filter((o) => o === 'n0')).toHaveLength(1);
      expect(new Set(opts).size).toBe(opts.length);
      expect(opts.length).toBe(Math.min(4, Math.max(1, poolSize)));
    }
  });

  it('distinctOptions pads from the fallback list (avatar-names level 1: 3 pairs → 4 options)', () => {
    const names = ['Рекс', 'Барсик', 'Сырок', 'Пушок', 'Зая'];
    const opts = distinctOptions('Рекс', 4, ['Рекс', 'Барсик', 'Сырок'], names, rng(1));
    expect(opts).toHaveLength(4);
    expect(opts).toContain('Рекс');
    expect(opts).toEqual(expect.arrayContaining(['Барсик', 'Сырок']));
  });

  it('nearbyNumberOptions gives 5 non-negative distinct options even for answers 0 and 1', () => {
    for (const answer of [0, 1, 2, 3, 7, 12]) {
      for (let seed = 0; seed < 50; seed++) {
        const opts = nearbyNumberOptions(answer, 5, rng(seed));
        expect(opts).toHaveLength(5);
        expect(opts).toContain(answer);
        expect(new Set(opts).size).toBe(5);
        expect(Math.min(...opts)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...opts.map((o) => Math.abs(o - answer)))).toBeLessThanOrEqual(4);
      }
    }
  });

  it('distinctIndices clamps the count to the pool (dot-span above level 14 used to hang)', () => {
    expect(distinctIndices(20, 16, rng(2))).toHaveLength(16);
    const idx = distinctIndices(9, 16, rng(2));
    expect(new Set(idx).size).toBe(9);
    expect(idx.every((i) => i >= 0 && i < 16)).toBe(true);
    expect(distinctIndices(3, 0, rng(2))).toEqual([]);
  });
});
