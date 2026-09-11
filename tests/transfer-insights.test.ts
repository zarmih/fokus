import { expect, test } from 'vitest';
import { buildTrainingPlan } from '../src/core/session-builder';
import {
  buildTransferSurface,
  collectGeneratedCopy,
  generateSessionInsight,
  generateWeekInsight,
  suggestFocusOfTheWeek
} from '../src/core/transfer-insights';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';

const NOW = new Date('2026-09-10T12:00:00Z');

function item(partial: Partial<SessionItem> & { exerciseId?: string }): SessionItem {
  return {
    exerciseId: partial.exerciseId || 'grid-memory',
    level: 2,
    accuracy: 0.9,
    avgRtMs: 800,
    score: 40,
    ...partial
  };
}

function session(partial: Partial<Session> & { startedAt: string; items: SessionItem[] }): Session {
  return {
    id: partial.id || partial.startedAt,
    finishedAt: partial.finishedAt === undefined ? partial.startedAt : partial.finishedAt,
    durationSec: 300,
    ...partial
  };
}

function domains(values: Partial<Record<string, number>>): DomainIndex[] {
  return Object.entries(values).map(([domain, value]) => ({
    domain,
    value: value || 0,
    trend: 0,
    updatedAt: NOW.toISOString()
  }));
}

function day(date: string, extra?: Partial<DaySummary>): DaySummary {
  return {
    date,
    totalScore: 80,
    domainDeltas: {},
    streak: 1,
    skipped: false,
    ...extra
  };
}

const CLAIM_RE = /(повышает IQ|вырастет IQ|станет гением|гарантированно|лечит СДВГ|прокачает мозг|супермозг)/i;

test('empty data returns a modest warming-up insight, not a miracle', () => {
  const insight = generateSessionInsight(undefined);
  expect(insight.kind).toBe('warming_up');
  expect(insight.confidence).toBe('low');
  expect(insight.body).not.toMatch(CLAIM_RE);
  expect(insight.action).toMatch(/ритуал/i);
});

test('session accuracy insight from a real low-accuracy block', () => {
  const s = session({
    startedAt: '2026-09-10T09:00:00Z',
    items: [item({ accuracy: 0.55, avgRtMs: 1100 }), item({ accuracy: 0.6, avgRtMs: 1000 })]
  });
  const insight = generateSessionInsight(s);
  expect(insight.kind).toBe('session_accuracy');
  expect(insight.signal).toBe('accuracy');
  expect(insight.body).toMatch(/5[5-8]%/);
  expect(insight.action).toMatch(/точность/i);
});

test('speed-accuracy tradeoff needs a slower accurate baseline', () => {
  const recent = [
    session({
      id: 'r1',
      startedAt: '2026-09-08T09:00:00Z',
      items: [item({ accuracy: 0.92, avgRtMs: 900 }), item({ accuracy: 0.94, avgRtMs: 880 }), item({ accuracy: 0.9, avgRtMs: 910 }), item({ accuracy: 0.91, avgRtMs: 890 })]
    })
  ];
  const s = session({
    startedAt: '2026-09-10T09:00:00Z',
    items: [item({ accuracy: 0.7, avgRtMs: 600 }), item({ accuracy: 0.68, avgRtMs: 580 })]
  });
  const insight = generateSessionInsight(s, recent);
  expect(insight.kind).toBe('session_tradeoff');
  expect(insight.signal).toBe('accuracy');
});

test('difficulty up with held accuracy is a working step, not an IQ jump', () => {
  const s = session({
    startedAt: '2026-09-10T09:00:00Z',
    items: [
      item({
        accuracy: 0.88,
        difficultyBefore: 2.0,
        difficultyAfter: 2.4
      })
    ]
  });
  const insight = generateSessionInsight(s);
  expect(insight.kind).toBe('session_difficulty');
  expect(insight.signal).toBe('difficulty');
  expect(insight.body).toMatch(/рабочий шаг/i);
  expect(insight.body).not.toMatch(CLAIM_RE);
});

test('incomplete session prefers completion copy', () => {
  const s = session({
    startedAt: '2026-09-10T09:00:00Z',
    finishedAt: null,
    items: [item({ accuracy: 0.8 })]
  });
  const insight = generateSessionInsight(s);
  expect(insight.kind).toBe('session_incomplete');
  expect(insight.signal).toBe('completion');
});

test('narrow domain mix when mapping is provided', () => {
  const s = session({
    startedAt: '2026-09-10T09:00:00Z',
    items: [
      item({ exerciseId: 'a', accuracy: 0.8 }),
      item({ exerciseId: 'b', accuracy: 0.82 }),
      item({ exerciseId: 'c', accuracy: 0.81 })
    ]
  });
  const insight = generateSessionInsight(s, [], { a: 'memory', b: 'memory', c: 'memory' });
  expect(insight.kind).toBe('session_mix');
  expect(insight.domain).toBe('memory');
  expect(insight.body).toMatch(/Память/);
});

test('slow RT vs recent baseline', () => {
  const recent = [
    session({
      id: 'r1',
      startedAt: '2026-09-07T09:00:00Z',
      items: [item({ accuracy: 0.85, avgRtMs: 700 }), item({ accuracy: 0.84, avgRtMs: 720 }), item({ accuracy: 0.86, avgRtMs: 710 }), item({ accuracy: 0.85, avgRtMs: 730 })]
    })
  ];
  const s = session({
    startedAt: '2026-09-10T09:00:00Z',
    items: [item({ accuracy: 0.84, avgRtMs: 1100 }), item({ accuracy: 0.83, avgRtMs: 1080 })]
  });
  const insight = generateSessionInsight(s, recent);
  expect(insight.kind).toBe('session_rt');
  expect(insight.signal).toBe('rt');
});

test('week insight: sparse completion', () => {
  const insight = generateWeekInsight(
    [session({ startedAt: '2026-09-09T10:00:00Z', items: [item({})] })],
    [day('2026-09-09T10:00:00Z')],
    domains({ memory: 400, attention: 700 }),
    NOW
  );
  expect(insight.kind).toBe('week_completion');
  expect(insight.body).toMatch(/1 день/);
});

test('week insight: imbalanced domain mix points at the weaker transferable skill', () => {
  const insight = generateWeekInsight(
    [
      session({ startedAt: '2026-09-08T10:00:00Z', items: [item({}), item({})] }),
      session({ startedAt: '2026-09-09T10:00:00Z', items: [item({}), item({})] }),
      session({ startedAt: '2026-09-10T10:00:00Z', items: [item({}), item({})] })
    ],
    [
      day('2026-09-08', { domainDeltas: { attention: 40, memory: 4 } }),
      day('2026-09-09', { domainDeltas: { attention: 35, memory: 3 } }),
      day('2026-09-10', { domainDeltas: { attention: 30, memory: 2 } })
    ],
    domains({ memory: 380, attention: 820, speed: 600 }),
    NOW
  );
  expect(insight.kind).toBe('week_mix');
  expect(insight.domain).toBe('memory');
  expect(insight.body).toMatch(/Память/);
  expect(insight.action).toMatch(/Память/);
});

test('week insight: five active days is a habit, not a marathon', () => {
  const days = [4, 5, 6, 7, 8].map((d) =>
    day(`2026-09-0${d}`, { domainDeltas: { memory: 10, attention: 10 } })
  );
  const sessions = days.map((d) =>
    session({ startedAt: d.date + 'T10:00:00Z', items: [item({ accuracy: 0.85 })] })
  );
  const insight = generateWeekInsight(sessions, days, domains({ memory: 500, attention: 510 }), NOW);
  expect(insight.kind).toBe('week_completion');
  expect(insight.title).toMatch(/Ритуал/);
  expect(insight.body).toMatch(/5 дней из 7/);
});

test('focus of the week is a no-op without enough evidence', () => {
  expect(suggestFocusOfTheWeek([], [], [], NOW)).toBeNull();
  expect(
    suggestFocusOfTheWeek(domains({ memory: 200, attention: 800 }), [], [], NOW)
  ).toBeNull();
  expect(
    suggestFocusOfTheWeek(
      domains({ memory: 500, attention: 510 }),
      [day('2026-09-08'), day('2026-09-09'), day('2026-09-10')],
      [
        session({ startedAt: '2026-09-08T10:00:00Z', items: [item({})] }),
        session({ startedAt: '2026-09-09T10:00:00Z', items: [item({})] })
      ],
      NOW
    )
  ).toBeNull();
});

test('focus of the week picks the weaker transferable domain', () => {
  const focus = suggestFocusOfTheWeek(
    domains({ memory: 360, attention: 790, speed: 640 }),
    [day('2026-09-08'), day('2026-09-09'), day('2026-09-10')],
    [
      session({ startedAt: '2026-09-08T10:00:00Z', items: [item({})] }),
      session({ startedAt: '2026-09-09T10:00:00Z', items: [item({})] })
    ],
    NOW
  );
  expect(focus).toBeTruthy();
  expect(focus!.domain).toBe('memory');
  expect(focus!.title).toMatch(/Память/);
  expect(focus!.reason).toMatch(/кассе|имя|домофон/i);
  expect(focus!.action).not.toMatch(CLAIM_RE);
});

test('surface prefers session recap and always attaches a transfer tip', () => {
  const surface = buildTransferSurface({
    now: NOW,
    prefer: 'session',
    domains: domains({ memory: 400, attention: 700 }),
    daySummaries: [day('2026-09-10')],
    sessions: [
      session({
        startedAt: '2026-09-10T09:00:00Z',
        items: [item({ accuracy: 0.93 }), item({ accuracy: 0.95 })]
      })
    ]
  });
  expect(surface.insight.kind).toBe('session_accuracy');
  expect(surface.tip).toBeTruthy();
  expect(surface.tip!.situation.length).toBeGreaterThan(10);
  const copy = collectGeneratedCopy(surface).join('\n');
  expect(copy).not.toMatch(CLAIM_RE);
});

test('buildTrainingPlan without focusOfTheWeek stays a no-op for existing callers', () => {
  const catalog = [
    { manifest: { id: 'm1', domain: 'memory', skills: [] } },
    { manifest: { id: 'a1', domain: 'attention', skills: [] } },
    { manifest: { id: 's1', domain: 'speed', skills: [] } }
  ];
  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: catalog as any,
    domains: domains({ memory: 500, attention: 500, speed: 500 }),
    skills: [],
    states: [],
    primaryGoal: 'balance'
  });
  expect(plan.items.length).toBe(3);
  expect(plan.focusDomains).not.toContain(undefined);
});

test('focusOfTheWeek biases the planner when the weakest domain has no exercises', () => {
  const original = Math.random;
  Math.random = () => 0.9;
  try {
    const catalog = [
      { manifest: { id: 'a1', domain: 'attention', skills: [] } },
      { manifest: { id: 's1', domain: 'speed', skills: [] } }
    ];
    const params = {
      durationSec: 300,
      catalog: catalog as any,
      domains: domains({ memory: 200, attention: 500, speed: 500 }),
      skills: [],
      states: [],
      primaryGoal: 'balance' as const
    };
    const plain = buildTrainingPlan(params);
    const biased = buildTrainingPlan({ ...params, focusOfTheWeek: 'speed' });
    expect(plain.focusDomains).not.toContain('speed');
    expect(biased.focusDomains).toContain('speed');
    expect(biased.items[0].exerciseId).toBe('s1');
    expect(biased.items[0].reason).toMatch(/Фокус недели|слабой области|Сбалансированная/);
  } finally {
    Math.random = original;
  }
});
