import { describe, expect, test } from 'vitest';
import {
  MIN_NORM_SAMPLES,
  collectAttemptSamples,
  computeNorms,
  domainNormsSummaryRu,
  latestPercentileLineRu,
  median,
  normsByDomain,
  normsForDomain,
  normsForExercise,
  normsFromSessionValues,
  percentileRank,
  quantile,
  resultLocalNormsLineRu
} from '../src/core/local-norms';
import type { Session } from '../src/core/types';

const catalog = [
  { id: 'ex-att', domain: 'attention' },
  { id: 'ex-mem', domain: 'memory' },
  { id: 'ex-spd', domain: 'speed' }
];

function session(id: string, at: string, items: { exerciseId: string; accuracy: number; score?: number }[]): Session {
  return {
    id,
    startedAt: at,
    finishedAt: at,
    durationSec: 60,
    items: items.map((i) => ({
      exerciseId: i.exerciseId,
      level: 1,
      accuracy: i.accuracy,
      avgRtMs: 800,
      score: i.score ?? Math.round(i.accuracy * 40)
    }))
  };
}

describe('quantile / median / percentileRank', () => {
  test('quantile on empty and singleton', () => {
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
    expect(quantile([7], 0.25)).toBe(7);
    expect(quantile([7], 0.75)).toBe(7);
  });

  test('quantile interpolates', () => {
    expect(quantile([0, 10], 0.5)).toBe(5);
    expect(quantile([0, 10], 0.25)).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  test('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(Number.isNaN(median([]))).toBe(true);
  });

  test('percentileRank: empty, ties, strict less', () => {
    expect(percentileRank([], 0.9)).toBe(0);
    expect(percentileRank([0.5, 0.5, 0.5], 0.5)).toBe(0);
    expect(percentileRank([0.1, 0.2, 0.3, 0.4], 0.35)).toBe(75);
    expect(percentileRank([0.1, 0.2, 0.3, 0.4], 0.4)).toBe(75);
    expect(percentileRank([0.1, 0.2, 0.3, 0.4], 0.05)).toBe(0);
    expect(percentileRank([0.1, 0.2, 0.3, 0.4], 0.9)).toBe(100);
  });
});

describe('computeNorms thresholds', () => {
  test('empty → insufficient n=0', () => {
    expect(computeNorms([])).toEqual({ status: 'insufficient', n: 0 });
  });

  test('1 sample → insufficient (no past)', () => {
    expect(computeNorms([0.8])).toEqual({ status: 'insufficient', n: 0 });
  });

  test('exactly threshold-1 past → insufficient', () => {
    const values = [0.5, 0.55, 0.6, 0.65, 0.9]; // 4 past + latest
    const r = computeNorms(values);
    expect(r.status).toBe('insufficient');
    if (r.status === 'insufficient') expect(r.n).toBe(4);
  });

  test('exactly threshold past → ok with ranks', () => {
    const past = [0.4, 0.5, 0.6, 0.7, 0.8];
    const latest = 0.75;
    const r = computeNorms([...past, latest]);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.n).toBe(MIN_NORM_SAMPLES);
      expect(r.latestValue).toBe(0.75);
      expect(r.latestPercentile).toBe(80); // 0.4,0.5,0.6,0.7 strictly below
      expect(r.median).toBe(0.6);
      expect(r.p25).toBeCloseTo(0.5, 5);
      expect(r.p75).toBeCloseTo(0.7, 5);
    }
  });

  test('ignores non-finite values', () => {
    const r = computeNorms([0.1, NaN, 0.2, Infinity, 0.3, 0.4, 0.5, 0.9]);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.n).toBe(5);
      expect(r.latestValue).toBe(0.9);
      expect(r.latestPercentile).toBe(100);
    }
  });
});

describe('collectAttemptSamples + multi-domain', () => {
  test('maps exercises to domains and keeps chronology', () => {
    const sessions = [
      session('b', '2026-10-02T10:00:00Z', [
        { exerciseId: 'ex-mem', accuracy: 0.5 },
        { exerciseId: 'ex-att', accuracy: 0.7 }
      ]),
      session('a', '2026-10-01T10:00:00Z', [
        { exerciseId: 'ex-att', accuracy: 0.6 },
        { exerciseId: 'unknown', accuracy: 0.99 }
      ])
    ];
    const samples = collectAttemptSamples(sessions, catalog);
    expect(samples.map((s) => s.exerciseId)).toEqual(['ex-att', 'ex-mem', 'ex-att']);
    expect(samples.map((s) => s.domain)).toEqual(['attention', 'memory', 'attention']);
    expect(samples[0].value).toBe(0.6);
  });

  test('normsForDomain / normsForExercise / normsByDomain', () => {
    const sessions: Session[] = [];
    for (let i = 0; i < 6; i++) {
      sessions.push(
        session(`s${i}`, `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z`, [
          { exerciseId: 'ex-att', accuracy: 0.5 + i * 0.05 },
          { exerciseId: 'ex-mem', accuracy: 0.4 }
        ])
      );
    }
    // one more attention-only to bump exercise samples
    sessions.push(
      session('s6', '2026-10-07T12:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.95 }])
    );

    const samples = collectAttemptSamples(sessions, catalog);
    const att = normsForDomain(samples, 'attention');
    expect(att.status).toBe('ok');
    if (att.status === 'ok') {
      expect(att.n).toBe(6);
      expect(att.latestValue).toBe(0.95);
      expect(att.latestPercentile).toBe(100);
    }

    const mem = normsForDomain(samples, 'memory');
    expect(mem.status).toBe('ok'); // 6 past memory attempts before... wait, 6 sessions each with mem, latest is last mem
    // 6 memory samples all 0.4 → past=5, latest=0.4 → ok, percentile 0 (ties)
    if (mem.status === 'ok') {
      expect(mem.n).toBe(5);
      expect(mem.latestPercentile).toBe(0);
    }

    const spd = normsForDomain(samples, 'speed');
    expect(spd).toEqual({ status: 'insufficient', n: 0 });

    const ex = normsForExercise(samples, 'ex-att');
    expect(ex.status).toBe('ok');

    const by = normsByDomain(samples);
    expect(by).toHaveLength(5);
    expect(by.find((r) => r.domain === 'attention')?.result.status).toBe('ok');
    expect(by.find((r) => r.domain === 'logic')?.result).toEqual({ status: 'insufficient', n: 0 });
  });

  test('score metric collects raw scores', () => {
    const sessions = [
      session('1', '2026-10-01T00:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.5, score: 10 }]),
      session('2', '2026-10-02T00:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.5, score: 20 }])
    ];
    const samples = collectAttemptSamples(sessions, catalog, 'score');
    expect(samples.map((s) => s.value)).toEqual([10, 20]);
  });
});

describe('session aggregates + Russian copy', () => {
  test('normsFromSessionValues mirrors computeNorms', () => {
    const vals = [0.5, 0.55, 0.6, 0.65, 0.7, 0.9];
    expect(normsFromSessionValues(vals)).toEqual(computeNorms(vals));
  });

  test('copy never invents world norms and stays Russian', () => {
    const empty = latestPercentileLineRu({ status: 'insufficient', n: 0 });
    expect(empty).toBe(
      'Личные нормы появятся после нескольких своих попыток — без сравнения с другими.'
    );
    expect(empty.toLowerCase()).not.toMatch(/wikium|населен|мир|schulte|stroop/);

    const insuf = latestPercentileLineRu({ status: 'insufficient', n: 2 });
    expect(insuf).toBe(
      `Пока мало своих попыток (2 из ${MIN_NORM_SAMPLES}) — это не плохой результат, просто рано для перцентиля.`
    );
    expect(insuf).toMatch(/не плохой результат/);
    expect(insuf.toLowerCase()).not.toMatch(/wikium|населен|мир|schulte|stroop/);

    const ok = latestPercentileLineRu({
      status: 'ok',
      n: 5,
      median: 0.7,
      p25: 0.6,
      p75: 0.8,
      latestPercentile: 72,
      latestValue: 0.85
    });
    expect(ok).toBe('Лучше 72% своих прошлых попыток');
    expect(ok).not.toMatch(/других людей|мира|населения/i);

    const row = domainNormsSummaryRu('attention', {
      status: 'ok',
      n: 5,
      median: 0.7,
      p25: 0.6,
      p75: 0.8,
      latestPercentile: 40,
      latestValue: 0.65
    });
    expect(row).toMatch(/^Внимание:/);
    expect(row).toMatch(/лучше 40%/);
    expect(row).toMatch(/медиана 70%/);
  });

  test('resultLocalNormsLineRu prefers domain insufficient over misleading session ok', () => {
    // Many mixed sessions → session aggregate would be ok, but attention is thin.
    const sessions = [
      session('s1', '2026-10-01T00:00:00Z', [{ exerciseId: 'ex-mem', accuracy: 0.5 }]),
      session('s2', '2026-10-02T00:00:00Z', [{ exerciseId: 'ex-mem', accuracy: 0.55 }]),
      session('s3', '2026-10-03T00:00:00Z', [{ exerciseId: 'ex-mem', accuracy: 0.6 }]),
      session('s4', '2026-10-04T00:00:00Z', [{ exerciseId: 'ex-mem', accuracy: 0.65 }]),
      session('s5', '2026-10-05T00:00:00Z', [{ exerciseId: 'ex-mem', accuracy: 0.7 }]),
      session('s6', '2026-10-06T00:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.8 }]),
      session('s7', '2026-10-07T00:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.85 }])
    ];
    const samples = collectAttemptSamples(sessions, catalog);
    const sessionAccs = sessions.map(
      (s) => s.items.reduce((sum, it) => sum + it.accuracy, 0) / s.items.length
    );
    expect(normsFromSessionValues(sessionAccs).status).toBe('ok');
    expect(normsForDomain(samples, 'attention').status).toBe('insufficient');

    const line = resultLocalNormsLineRu(['attention'], samples, sessionAccs);
    expect(line).toBe(domainNormsSummaryRu('attention', normsForDomain(samples, 'attention')));
    expect(line).toMatch(/мало данных/);
    expect(line).not.toMatch(/Лучше \d+%/);
  });

  test('resultLocalNormsLineRu shows ok domain line when ready', () => {
    const sessions = Array.from({ length: 6 }, (_, i) =>
      session(`s${i}`, `2026-10-0${i + 1}T00:00:00Z`, [
        { exerciseId: 'ex-att', accuracy: 0.5 + i * 0.05 }
      ])
    );
    const samples = collectAttemptSamples(sessions, catalog);
    const sessionAccs = sessions.map((s) => s.items[0].accuracy);
    const line = resultLocalNormsLineRu(['attention'], samples, sessionAccs);
    expect(line).toMatch(/^Внимание: лучше \d+% своих$/);
  });

  test('resultLocalNormsLineRu falls back to session copy when no domain samples', () => {
    const line = resultLocalNormsLineRu(['attention'], [], [0.7]);
    expect(line).toBe(latestPercentileLineRu({ status: 'insufficient', n: 0 }));
  });
});
