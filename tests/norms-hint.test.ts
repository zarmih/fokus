import { describe, expect, test } from 'vitest';
import { collectAttemptSamples, domainNormsSummaryRu, normsForDomain } from '../src/core/local-norms';
import {
  quietNormsHintDisclaimerRu,
  quietNormsHintFromSessions,
  quietPersonalNormsHintRu
} from '../src/core/norms-hint';
import type { Session } from '../src/core/types';

const catalog = [
  { id: 'ex-att', domain: 'attention' },
  { id: 'ex-mem', domain: 'memory' },
  { id: 'ex-spd', domain: 'speed' }
];

function session(
  id: string,
  at: string,
  items: { exerciseId: string; accuracy: number }[]
): Session {
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
      score: Math.round(i.accuracy * 40)
    }))
  };
}

/** 5 past + 1 latest for a domain (MIN_NORM_SAMPLES past required). */
function enoughFor(domainEx: string, startDay: number, latestAcc = 0.95): Session[] {
  const out: Session[] = [];
  for (let i = 0; i < 5; i++) {
    out.push(
      session(`p-${domainEx}-${i}`, `2026-10-${String(startDay + i).padStart(2, '0')}T10:00:00Z`, [
        { exerciseId: domainEx, accuracy: 0.5 + i * 0.05 }
      ])
    );
  }
  out.push(
    session(`latest-${domainEx}`, `2026-10-${String(startDay + 5).padStart(2, '0')}T10:00:00Z`, [
      { exerciseId: domainEx, accuracy: latestAcc }
    ])
  );
  return out;
}

describe('quietPersonalNormsHintRu', () => {
  test('null when no samples', () => {
    expect(quietPersonalNormsHintRu([])).toBeNull();
  });

  test('null when every domain is insufficient', () => {
    const sessions = [
      session('s1', '2026-10-01T10:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.8 }]),
      session('s2', '2026-10-02T10:00:00Z', [{ exerciseId: 'ex-att', accuracy: 0.7 }])
    ];
    const samples = collectAttemptSamples(sessions, catalog);
    expect(quietPersonalNormsHintRu(samples)).toBeNull();
  });

  test('one quiet Russian line when a domain is sufficient', () => {
    const samples = collectAttemptSamples(enoughFor('ex-att', 1), catalog);
    const line = quietPersonalNormsHintRu(samples);
    expect(line).not.toBeNull();
    expect(line!).toMatch(/Внимание/i);
    expect(line!).toMatch(/лучше \d+% своих/i);
    expect(line!.toLowerCase()).not.toMatch(/world|population|мир|рейтинг среди|других людей/);
  });

  test('prefers focus domain when it is sufficient', () => {
    const sessions = [...enoughFor('ex-att', 1), ...enoughFor('ex-mem', 10)];
    const samples = collectAttemptSamples(sessions, catalog);
    const line = quietPersonalNormsHintRu(samples, ['memory']);
    expect(line).toMatch(/Память/i);
  });

  test('falls back to another domain when preferred is insufficient', () => {
    const samples = collectAttemptSamples(enoughFor('ex-att', 1), catalog);
    const line = quietPersonalNormsHintRu(samples, ['speed', 'memory']);
    expect(line).toMatch(/Внимание/i);
  });

  test('quiet line stays shorter than Progress domainNormsSummaryRu', () => {
    const samples = collectAttemptSamples(enoughFor('ex-att', 1), catalog);
    const result = normsForDomain(samples, 'attention');
    const quiet = quietPersonalNormsHintRu(samples, ['attention']);
    expect(result.status).toBe('ok');
    expect(quiet).not.toBeNull();
    expect(quiet!.length).toBeLessThan(domainNormsSummaryRu('attention', result).length);
    expect(quiet!).not.toMatch(/медиана|типичный диапазон/);
  });

});

describe('quietNormsHintFromSessions', () => {
  test('loads the same session → sample path Progress uses', () => {
    const line = quietNormsHintFromSessions(enoughFor('ex-spd', 1), catalog, ['speed']);
    expect(line).toMatch(/Скорость/i);
    expect(line!).toMatch(/лучше \d+% своих/i);
  });

  test('disclaimer is personal-only Quiet Light copy', () => {
    const d = quietNormsHintDisclaimerRu();
    expect(d).toMatch(/устройств/i);
    expect(d.toLowerCase()).toMatch(/без сравнения с другими/);
  });
});
