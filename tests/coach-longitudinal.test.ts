import { expect, test } from 'vitest';
import {
  MIN_PLAYED_DAYS,
  MIN_SESSIONS,
  MONTH_ALPHA,
  WEEK_ALPHA,
  buildDomainDeltas,
  buildLongitudinalCoach,
  classifyTrend,
  ewmaDelta,
  ewmaLast,
  periodPhrase,
  pickFocusOfFortnight,
  ruSessions,
  sessionScoreSeries
} from '../src/core/coach-longitudinal';
import type { DaySummary, DomainIndex, Session } from '../src/core/types';

const AS_OF = '2026-09-11T12:00:00Z';

function sessionOn(date: string, id: string, exerciseId = 'grid-memory', score = 70): Session {
  return {
    id,
    startedAt: `${date}T10:00:00Z`,
    finishedAt: `${date}T10:05:00Z`,
    durationSec: 300,
    items: [{ exerciseId, level: 1, accuracy: 0.8, avgRtMs: 900, score }]
  };
}

function dayOn(date: string, values: Record<string, number>, streak: number): DaySummary {
  const mean = Object.values(values).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(values).length);
  return {
    date: `${date}T10:00:00Z`,
    totalScore: 80,
    domainDeltas: {},
    streak,
    skipped: false,
    fokusIndex: Math.round(mean * 0.75),
    domainValues: { ...values }
  };
}

function live(values: Record<string, number>): DomainIndex[] {
  return Object.entries(values).map(([domain, value]) => ({
    domain,
    value,
    updatedAt: AS_OF
  }));
}

/** Five days in the last week: enough for the session/day gate. */
function lastWeekDates(): string[] {
  return ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'];
}

function pack(valuesByDay: Record<string, Record<string, number>>): {
  sessions: Session[];
  summaries: DaySummary[];
  domains: DomainIndex[];
} {
  const dates = Object.keys(valuesByDay).sort();
  const sessions = dates.map((d, i) => sessionOn(d, `s${i}`));
  const summaries = dates.map((d, i) => dayOn(d, valuesByDay[d], i + 1));
  const last = valuesByDay[dates[dates.length - 1]];
  return { sessions, summaries, domains: live(last) };
}

test('ewmaLast is recursive and returns null on empty', () => {
  expect(ewmaLast([], 0.32)).toBeNull();
  expect(ewmaLast([40], 0.32)).toBe(40);
  expect(ewmaLast([10, 20], 0.5)).toBe(15);
  const slow = ewmaLast([100, 200], MONTH_ALPHA)!;
  const fast = ewmaLast([100, 200], WEEK_ALPHA)!;
  expect(fast).toBeGreaterThan(slow);
  expect(slow).toBeCloseTo(100 + MONTH_ALPHA * 100, 5);
});

test('ewmaDelta uses prior window, else first-vs-last in recent', () => {
  expect(ewmaDelta([], [10], 0.32)).toBeNull();
  expect(ewmaDelta([50], [], 0.32)).toBeNull();
  expect(ewmaDelta([10, 20], [], 0.5)).toBe(5);
  expect(ewmaDelta([100, 100, 100], [80, 80], 0.32)).toBe(20);
});

test('classifyTrend uses the G3 deadband of 8', () => {
  expect(classifyTrend(20, 0)).toBe('improving');
  expect(classifyTrend(-20, 4)).toBe('declining');
  expect(classifyTrend(3, 40)).toBe('stagnating');
  expect(classifyTrend(null, 12)).toBe('improving');
  expect(classifyTrend(null, null)).toBe('unknown');
});

test('quiet if fewer than MIN_SESSIONS', () => {
  const dates = lastWeekDates().slice(0, 3);
  const built = pack(Object.fromEntries(dates.map((d) => [d, { memory: 400, attention: 500 }])));
  const coach = buildLongitudinalCoach({ ...built, asOf: AS_OF });
  expect(coach.ready).toBe(false);
  expect(coach.quietReason).toBe('insufficient-sessions');
  expect(coach.card).toBeNull();
  expect(coach.focus).toBeNull();
  expect(coach.sessionCount).toBeLessThan(MIN_SESSIONS);
});

test('quiet if enough sessions but too few distinct days', () => {
  const sessions = Array.from({ length: MIN_SESSIONS }, (_, i) =>
    sessionOn('2026-09-11', `same-${i}`)
  );
  const summaries = [dayOn('2026-09-11', { memory: 400 }, 1)];
  const coach = buildLongitudinalCoach({
    sessions,
    summaries,
    domains: live({ memory: 400 }),
    asOf: AS_OF
  });
  expect(coach.ready).toBe(false);
  expect(coach.quietReason).toBe('insufficient-days');
  expect(coach.playedDays).toBeLessThan(MIN_PLAYED_DAYS);
});

test('week/month deltas from reconstructed snapshots', () => {
  const valuesByDay: Record<string, Record<string, number>> = {};
  // Prior fortnight: memory stuck, attention lower.
  for (const d of ['2026-08-18', '2026-08-22', '2026-08-26']) {
    valuesByDay[d] = { memory: 420, attention: 500 };
  }
  // Recent fortnight / last week: memory still stuck, attention up.
  const recentMem = [418, 422, 419, 421, 420];
  const recentAtt = [560, 580, 600, 615, 630];
  lastWeekDates().forEach((d, i) => {
    valuesByDay[d] = { memory: recentMem[i], attention: recentAtt[i] };
  });

  const built = pack(valuesByDay);
  const deltas = buildDomainDeltas({ ...built, asOf: AS_OF });
  const memory = deltas.find((d) => d.id === 'memory')!;
  const attention = deltas.find((d) => d.id === 'attention')!;

  expect(memory.ready).toBe(true);
  expect(attention.ready).toBe(true);
  expect(memory.source).toBe('snapshot');
  expect(memory.trendKind).toBe('stagnating');
  expect(attention.trendKind).toBe('improving');
  expect(attention.monthDelta).not.toBeNull();
  expect(attention.monthDelta!).toBeGreaterThan(8);
  expect(Math.abs(memory.monthDelta ?? 99)).toBeLessThanOrEqual(8);
  expect(memory.weekDelta).not.toBeNull();
});

test('focus of fortnight is the weakest stagnating domain, with a numeric why', () => {
  const valuesByDay: Record<string, Record<string, number>> = {};
  lastWeekDates().forEach((d, i) => {
    valuesByDay[d] = {
      memory: 400 + (i % 2),
      attention: 520 + i * 20,
      speed: 700
    };
  });
  const built = pack(valuesByDay);
  const coach = buildLongitudinalCoach({ ...built, asOf: AS_OF });
  expect(coach.ready).toBe(true);
  expect(coach.focus?.domainId).toBe('memory');
  expect(coach.focus?.reasonKind).toBe('stagnating');
  expect(coach.focus?.why).toMatch(/Память/);
  expect(coach.focus?.why).toMatch(/тихая|не сдвинулась/);
  expect(coach.card?.primary.kind).toBe('focus');
  expect(coach.card?.primary.domainId).toBe('memory');
  expect(coach.card?.supporting.length).toBeGreaterThan(0);
  expect(coach.card?.supporting.length).toBeLessThanOrEqual(2);
});

test('when nothing stagnates, pick the weakest improving domain', () => {
  const valuesByDay: Record<string, Record<string, number>> = {};
  // Prior fortnight lower for both, recent both up — memory still weaker.
  for (const d of ['2026-08-18', '2026-08-22', '2026-08-26']) {
    valuesByDay[d] = { memory: 380, logic: 500 };
  }
  lastWeekDates().forEach((d, i) => {
    valuesByDay[d] = { memory: 430 + i * 8, logic: 620 + i * 12 };
  });
  const built = pack(valuesByDay);
  const coach = buildLongitudinalCoach({ ...built, asOf: AS_OF });
  expect(coach.focus?.domainId).toBe('memory');
  expect(coach.focus?.reasonKind).toBe('weakest-improving');
  expect(coach.focus?.why).toMatch(/растёт медленнее/);
});

test('if every ready domain is declining, still pick the weakest with why', () => {
  const valuesByDay: Record<string, Record<string, number>> = {};
  for (const d of ['2026-08-18', '2026-08-22', '2026-08-26']) {
    valuesByDay[d] = { memory: 600, attention: 720 };
  }
  lastWeekDates().forEach((d, i) => {
    valuesByDay[d] = { memory: 480 - i * 6, attention: 640 - i * 8 };
  });
  const deltas = buildDomainDeltas({ ...pack(valuesByDay), asOf: AS_OF });
  const ready = deltas.filter((d) => d.ready);
  expect(ready.every((d) => d.trendKind === 'declining')).toBe(true);
  const focus = pickFocusOfFortnight(deltas);
  expect(focus?.domainId).toBe('memory');
  expect(focus?.reasonKind).toBe('weak-declining');
  expect(focus?.why).toMatch(/вниз|тише/);
});

test('card stays off when sessions pass the gate but no domain has enough points', () => {
  const sessions = lastWeekDates().map((d, i) => sessionOn(d, `s${i}`, 'unknown-ex', 10));
  const summaries = lastWeekDates().map((d, i) => ({
    date: `${d}T10:00:00Z`,
    totalScore: 10,
    domainDeltas: {},
    streak: i + 1,
    skipped: false
  }));
  const coach = buildLongitudinalCoach({
    sessions,
    summaries,
    domains: [],
    asOf: AS_OF
  });
  expect(coach.quietReason).toBeNull();
  expect(coach.sessionCount).toBeGreaterThanOrEqual(MIN_SESSIONS);
  expect(coach.card).toBeNull();
  expect(coach.ready).toBe(false);
});

test('without snapshots, EWMA falls back to per-session domain scores', () => {
  const dates = lastWeekDates();
  const sessions: Session[] = dates.map((d, i) => ({
    id: `sc${i}`,
    startedAt: `${d}T10:00:00Z`,
    finishedAt: `${d}T10:05:00Z`,
    durationSec: 300,
    items: [
      { exerciseId: 'grid-memory', level: 1, accuracy: 0.7, avgRtMs: 800, score: 40 + i * 2 },
      { exerciseId: 'stroop', level: 1, accuracy: 0.8, avgRtMs: 600, score: 50 + i * 12 }
    ]
  }));
  const series = sessionScoreSeries(sessions, AS_OF, 28);
  expect(series.get('memory')!.length).toBe(5);
  expect(series.get('flexibility')!.length).toBe(5);

  const summaries = dates.map((d, i) => ({
    date: `${d}T10:00:00Z`,
    totalScore: 90,
    domainDeltas: {},
    streak: i + 1,
    skipped: false
  }));
  const deltas = buildDomainDeltas({
    sessions,
    summaries,
    domains: [],
    asOf: AS_OF
  });
  expect(deltas.every((d) => d.source === 'session-score')).toBe(true);
  const flex = deltas.find((d) => d.id === 'flexibility')!;
  expect(flex.ready).toBe(true);
  expect(flex.weekDelta).not.toBeNull();
});

test('copy stays in product voice: no IQ, no grind FOMO', () => {
  const valuesByDay: Record<string, Record<string, number>> = {};
  lastWeekDates().forEach((d, i) => {
    valuesByDay[d] = { memory: 410, attention: 500 + i * 15, speed: 680 };
  });
  const coach = buildLongitudinalCoach({ ...pack(valuesByDay), asOf: AS_OF });
  const blob = [
    coach.card?.primary.title,
    coach.card?.primary.body,
    ...(coach.card?.supporting.map((s) => s.body) || []),
    coach.focus?.why
  ].join(' ');
  expect(blob).not.toMatch(/IQ|прокачай|нейрофитнес|last chance|не пропусти/i);
  expect(periodPhrase(null, 'неделю')).toMatch(/мало данных/);
  expect(ruSessions(1)).toBe('1 сессия');
  expect(ruSessions(3)).toBe('3 сессии');
  expect(ruSessions(5)).toBe('5 сессий');
});

test('all-improving profile uses a progress primary and still names the weakest', () => {
  const valuesByDay: Record<string, Record<string, number>> = {};
  for (const d of ['2026-08-18', '2026-08-22', '2026-08-26']) {
    valuesByDay[d] = { memory: 360, attention: 400, speed: 420 };
  }
  lastWeekDates().forEach((d, i) => {
    valuesByDay[d] = {
      memory: 430 + i * 6,
      attention: 520 + i * 10,
      speed: 560 + i * 12
    };
  });
  const coach = buildLongitudinalCoach({ ...pack(valuesByDay), asOf: AS_OF });
  expect(coach.card?.primary.kind).toBe('progress');
  expect(coach.card?.primary.domainId).toBe('memory');
  expect(coach.card?.supporting.length).toBeLessThanOrEqual(2);
});

test('legacy summaries without sessions still open the gate', () => {
  const dates = lastWeekDates();
  const summaries = dates.map((d, i) => dayOn(d, { memory: 400 + (i % 2), attention: 600 }, i + 1));
  const coach = buildLongitudinalCoach({
    sessions: [],
    summaries,
    domains: live({ memory: 401, attention: 600 }),
    asOf: AS_OF
  });
  expect(coach.sessionCount).toBe(5);
  expect(coach.quietReason).toBeNull();
  expect(coach.focus?.domainId).toBe('memory');
});
