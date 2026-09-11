import { expect, test } from 'vitest';
import { targetRitual, ritualSlotCount, EXPLORATION_BUDGET } from '../src/core/ritual-targeter';
import { describeAdaptiveDepth } from '../src/core/adaptive-depth';
import type { DomainIndex, ExerciseState, Session } from '../src/core/types';

const catalog = [
  { manifest: { id: 'grid-memory', domain: 'memory', name: 'Матрица' } },
  { manifest: { id: 'stroop', domain: 'attention', name: 'Чернила' } },
  { manifest: { id: 'math-sprint', domain: 'speed', name: 'Счёт' } },
  { manifest: { id: 'switch-rule', domain: 'flexibility', name: 'Смена правила' } },
  { manifest: { id: 'pattern-next', domain: 'logic', name: 'Ряд' } }
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

test('empty catalog is a graceful no-op', () => {
  expect(targetRitual({ catalog: [] })).toBeNull();
  expect(targetRitual({ catalog: null })).toBeNull();
  expect(targetRitual({})).toBeNull();
});

test('slot count follows 5 / 8 / 12 minute ritual lengths', () => {
  expect(ritualSlotCount(300)).toBe(3);
  expect(ritualSlotCount(480)).toBe(4);
  expect(ritualSlotCount(720)).toBe(5);
});

test('favours the weakest domain from trajectory evidence', () => {
  const sessions: Session[] = [
    {
      id: 's1',
      startedAt: daysAgo(5),
      finishedAt: daysAgo(5),
      durationSec: 300,
      items: [
        { exerciseId: 'grid-memory', level: 3, accuracy: 0.5, avgRtMs: 2000, score: 10, difficultyBefore: 3 },
        { exerciseId: 'stroop', level: 5, accuracy: 0.92, avgRtMs: 800, score: 70, difficultyBefore: 5 }
      ]
    },
    {
      id: 's2',
      startedAt: daysAgo(3),
      finishedAt: daysAgo(3),
      durationSec: 300,
      items: [
        { exerciseId: 'grid-memory', level: 3, accuracy: 0.55, avgRtMs: 1900, score: 12, difficultyBefore: 3 },
        { exerciseId: 'stroop', level: 6, accuracy: 0.9, avgRtMs: 850, score: 68, difficultyBefore: 6 }
      ]
    },
    {
      id: 's3',
      startedAt: daysAgo(1),
      finishedAt: daysAgo(1),
      durationSec: 300,
      items: [
        { exerciseId: 'grid-memory', level: 3, accuracy: 0.58, avgRtMs: 1800, score: 14, difficultyBefore: 3 },
        { exerciseId: 'stroop', level: 6, accuracy: 0.93, avgRtMs: 800, score: 72, difficultyBefore: 6 }
      ]
    }
  ];
  const domains: DomainIndex[] = [
    { domain: 'memory', value: 380, trend: -4, updatedAt: daysAgo(1) },
    { domain: 'attention', value: 820, trend: 12, updatedAt: daysAgo(1) }
  ];
  const states: ExerciseState[] = catalog.map((c) => ({
    exerciseId: c.manifest.id,
    level: 3,
    difficulty: 3,
    performance: 500,
    lastPlayedAt: daysAgo(c.manifest.domain === 'memory' ? 10 : 1),
    lastAccuracy: 0.7
  }));

  const plan = targetRitual({
    catalog,
    sessions,
    domains,
    states,
    durationSec: 300,
    rng: () => 0.99
  });
  expect(plan).toBeTruthy();
  expect(plan!.items).toHaveLength(3);
  expect(plan!.items[0].domain).toBe('memory');
  expect(plan!.focusDomains).toContain('memory');
  expect(plan!.why).toMatch(/памят/i);
  expect(plan!.why).not.toMatch(/IQ|iq|нейроскор/i);
});

test('exploration budget can pick a non-greedy slot', () => {
  const domains: DomainIndex[] = [
    { domain: 'memory', value: 200, trend: 0, updatedAt: daysAgo(1) },
    { domain: 'attention', value: 800, trend: 0, updatedAt: daysAgo(1) }
  ];
  let calls = 0;
  const rng = () => {
    calls += 1;
    if (calls === 1) return EXPLORATION_BUDGET - 0.01;
    return 0;
  };
  const plan = targetRitual({
    catalog,
    domains,
    durationSec: 300,
    rng
  });
  expect(plan).toBeTruthy();
  expect(plan!.explored).toBe(true);
  expect(plan!.items.some((i) => i.reason === 'explore')).toBe(true);
});

test('does not invent IQ in the public description helper', () => {
  const depth = describeAdaptiveDepth({
    catalog,
    domains: [{ domain: 'memory', value: 400, trend: -10, updatedAt: daysAgo(1) }],
    sessions: [
      {
        id: 's1',
        startedAt: daysAgo(3),
        finishedAt: daysAgo(3),
        durationSec: 300,
        items: [
          { exerciseId: 'grid-memory', level: 3, accuracy: 0.6, avgRtMs: 1600, score: 20 },
          { exerciseId: 'stroop', level: 4, accuracy: 0.8, avgRtMs: 1000, score: 40 }
        ]
      },
      {
        id: 's2',
        startedAt: daysAgo(1),
        finishedAt: daysAgo(1),
        durationSec: 300,
        items: [
          { exerciseId: 'grid-memory', level: 3, accuracy: 0.65, avgRtMs: 1500, score: 22 },
          { exerciseId: 'stroop', level: 4, accuracy: 0.85, avgRtMs: 900, score: 50 }
        ]
      }
    ],
    durationSec: 300,
    rng: () => 0.99
  });
  expect(depth.ritual).toBeTruthy();
  expect(depth.chip).toBeTruthy();
  expect(depth.chip!.label).not.toMatch(/\d{2,3}\s*IQ/);
  expect(depth.why).not.toMatch(/IQ/i);
});

test('peak-cooldown exercise is not the greedy first pick', () => {
  const sessions: Session[] = [
    {
      id: 'peak',
      startedAt: daysAgo(0.2),
      finishedAt: daysAgo(0.2),
      durationSec: 300,
      items: [{ exerciseId: 'stroop', level: 9, accuracy: 0.96, avgRtMs: 700, score: 80, difficultyAfter: 9.2 }]
    }
  ];
  const states: ExerciseState[] = [
    { exerciseId: 'stroop', level: 9, difficulty: 9, performance: 900, lastPlayedAt: daysAgo(0.2), lastAccuracy: 0.96 },
    { exerciseId: 'grid-memory', level: 3, difficulty: 3, performance: 400, lastPlayedAt: daysAgo(8), lastAccuracy: 0.6 }
  ];
  const plan = targetRitual({
    catalog,
    sessions,
    states,
    domains: [
      { domain: 'attention', value: 900, trend: 5, updatedAt: daysAgo(0.2) },
      { domain: 'memory', value: 350, trend: -2, updatedAt: daysAgo(8) }
    ],
    durationSec: 300,
    rng: () => 0.99
  });
  expect(plan).toBeTruthy();
  expect(plan!.items[0].exerciseId).not.toBe('stroop');
});
