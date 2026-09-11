import { expect, test } from 'vitest';
import {
  computeAbilityTrajectory,
  observationEvidence,
  updateTheta,
  THETA_PRIOR_MU
} from '../src/core/ability-trajectory';
import type { Session } from '../src/core/types';

const catalog = [
  { id: 'grid-memory', domain: 'memory' },
  { id: 'stroop', domain: 'attention' },
  { id: 'math-sprint', domain: 'speed' }
];

function session(id: string, dayOffset: number, items: Session['items']): Session {
  const started = new Date(Date.now() - dayOffset * 86400000).toISOString();
  return {
    id,
    startedAt: started,
    finishedAt: started,
    durationSec: 300,
    items
  };
}

test('empty input is not ready and has no headline', () => {
  const t = computeAbilityTrajectory({ sessions: [], domains: [], catalog: [] });
  expect(t.ready).toBe(false);
  expect(t.headline).toBeNull();
  expect(t.observations).toBe(0);
});

test('Bayesian theta moves toward evidence and stays in [0, 1]', () => {
  let theta = { mu: THETA_PRIOR_MU, precision: 2 };
  theta = updateTheta(theta, 0.9);
  expect(theta.mu).toBeGreaterThan(THETA_PRIOR_MU);
  theta = updateTheta(theta, 0.9);
  expect(theta.mu).toBeGreaterThan(0.5);
  expect(theta.mu).toBeLessThanOrEqual(1);
  const down = updateTheta({ mu: 0.5, precision: 2 }, 0.1);
  expect(down.mu).toBeLessThan(0.5);
  expect(down.mu).toBeGreaterThanOrEqual(0);
});

test('high accuracy at higher difficulty yields more evidence than a miss', () => {
  const good = observationEvidence({ accuracy: 0.95, avgRtMs: 900, difficulty: 8 });
  const bad = observationEvidence({ accuracy: 0.4, avgRtMs: 2200, difficulty: 3 });
  expect(good).toBeGreaterThan(bad);
  expect(good).toBeLessThanOrEqual(1);
  expect(bad).toBeGreaterThanOrEqual(0);
});

test('multi-session trajectory finds the weaker domain and a rising slope', () => {
  const sessions: Session[] = [
    session('s1', 6, [
      { exerciseId: 'grid-memory', level: 3, accuracy: 0.55, avgRtMs: 1800, score: 20, difficultyBefore: 3 },
      { exerciseId: 'stroop', level: 2, accuracy: 0.62, avgRtMs: 1600, score: 30, difficultyBefore: 2 }
    ]),
    session('s2', 4, [
      { exerciseId: 'grid-memory', level: 3, accuracy: 0.62, avgRtMs: 1700, score: 24, difficultyBefore: 3 },
      { exerciseId: 'stroop', level: 5, accuracy: 0.88, avgRtMs: 1000, score: 60, difficultyBefore: 5 }
    ]),
    session('s3', 1, [
      { exerciseId: 'grid-memory', level: 4, accuracy: 0.7, avgRtMs: 1500, score: 30, difficultyBefore: 4 },
      { exerciseId: 'stroop', level: 8, accuracy: 0.96, avgRtMs: 700, score: 80, difficultyBefore: 8 }
    ])
  ];

  const t = computeAbilityTrajectory({ sessions, catalog });
  expect(t.ready).toBe(true);
  expect(t.weakest?.domain).toBe('memory');
  expect(t.headline?.domain).toBe('memory');
  const attention = t.domains.find((d) => d.domain === 'attention');
  expect(attention).toBeTruthy();
  expect(attention!.theta).toBeGreaterThan(t.weakest!.theta);
  expect(attention!.trend).toBe('rising');
});

test('unknown catalog ids are skipped (no fake domain, no IQ)', () => {
  const sessions: Session[] = [
    session('s1', 2, [{ exerciseId: 'not-in-catalog', level: 9, accuracy: 1, avgRtMs: 400, score: 999 }]),
    session('s2', 1, [{ exerciseId: 'also-missing', level: 9, accuracy: 1, avgRtMs: 400, score: 999 }])
  ];
  const t = computeAbilityTrajectory({ sessions, catalog });
  expect(t.ready).toBe(false);
  expect(t.observations).toBe(0);
  expect(JSON.stringify(t)).not.toMatch(/IQ|iq|нейроскор|BPI/i);
});
