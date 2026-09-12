import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  FORBIDDEN_ADVISOR_COPY_RE,
  MIN_ADVISOR_SESSIONS,
  adviseNextLoad,
  collectAdvisorCopy,
  composeAdvisorCopy,
  loadBandLabel,
  sparkFromAdvisor
} from '../src/core/retention-advisor';
import { estimateRecovery } from '../src/core/recovery';
import { assessRetention, type RetentionSnapshot } from '../src/core/retention';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';

const NOW = '2026-09-11T10:00:00.000Z';
const MAP: Record<string, string> = {
  'grid-memory': 'memory',
  stroop: 'attention',
  'odd-one': 'logic',
  'switch-rule': 'flexibility',
  'math-sprint': 'speed'
};

function item(partial: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: partial.exerciseId || 'grid-memory',
    level: partial.level ?? 5,
    accuracy: partial.accuracy ?? 0.88,
    avgRtMs: partial.avgRtMs ?? 420,
    score: 60,
    ...partial
  };
}

function session(partial: Partial<Session> & { n?: number } = {}): Session {
  const n = partial.n ?? 3;
  const items = partial.items || Array.from({ length: n }, (_, i) => item({ avgRtMs: 410 + i * 8 }));
  return {
    id: partial.id || 's',
    startedAt: partial.startedAt || '2026-09-10T10:00:00.000Z',
    finishedAt: partial.finishedAt === undefined ? '2026-09-10T10:05:00.000Z' : partial.finishedAt,
    durationSec: partial.durationSec ?? 300,
    items,
    interrupted: partial.interrupted,
    endReason: partial.endReason,
    plannedDurationSec: partial.plannedDurationSec ?? 300
  };
}

function hardSessions(): Session[] {
  return [0, 1, 2, 3].map((i) =>
    session({
      id: `h${i}`,
      startedAt: `2026-09-${String(7 + i).padStart(2, '0')}T18:00:00.000Z`,
      durationSec: 700,
      plannedDurationSec: 720,
      items: [
        item({ exerciseId: 'grid-memory', level: 14, accuracy: 0.48, avgRtMs: 900 }),
        item({ exerciseId: 'stroop', level: 13, accuracy: 0.5, avgRtMs: 1400 }),
        item({ exerciseId: 'odd-one', level: 12, accuracy: 0.42, avgRtMs: 1800 })
      ]
    })
  );
}

function easySessions(dates: string[]): Session[] {
  return dates.map((d, i) =>
    session({
      id: `e${i}`,
      startedAt: `${d}T10:00:00.000Z`,
      finishedAt: `${d}T10:05:00.000Z`,
      durationSec: 240,
      plannedDurationSec: 300,
      items: [
        item({ exerciseId: 'stroop', level: 3, accuracy: 0.9, avgRtMs: 380, score: 80 }),
        item({ exerciseId: 'odd-one', level: 3, accuracy: 0.88, avgRtMs: 400, score: 78 }),
        item({ exerciseId: 'math-sprint', level: 2, accuracy: 0.92, avgRtMs: 360, score: 82 })
      ]
    })
  );
}

function domains(values: Record<string, number>, updatedAt = NOW): DomainIndex[] {
  return Object.entries(values).map(([domain, value]) => ({ domain, value, updatedAt }));
}

function summariesFor(sessions: Session[]): DaySummary[] {
  return sessions.map((s, i) => ({
    date: s.startedAt,
    totalScore: 80,
    domainDeltas: { memory: 2 },
    streak: i + 1,
    skipped: false
  }));
}

const base = {
  streak: 3,
  skippedYesterday: false,
  calibrated: true,
  nowIso: NOW,
  plannedDurationSec: 300,
  domainByExercise: MAP
};

test('advisor module does not import exercises, registry, or DOM', () => {
  const src = readFileSync('src/core/retention-advisor.ts', 'utf8');
  expect(src).not.toMatch(/exercises\/registry|from '\.\.\/exercises|document\.|localStorage/);
});

test('too few sessions stay quiet — no fake tomorrow plan', () => {
  const advice = adviseNextLoad({
    ...base,
    sessions: [session({ id: 'only' })],
    daySummaries: [],
    domains: domains({ memory: 500 }),
    playedToday: false
  });
  expect(advice.ready).toBe(false);
  expect(advice.quietReason).toBe('insufficient-sessions');
  expect(sparkFromAdvisor(advice)).toBeNull();
  expect(MIN_ADVISOR_SESSIONS).toBe(2);
});

test('uncalibrated stays quiet', () => {
  const advice = adviseNextLoad({
    ...base,
    calibrated: false,
    sessions: hardSessions(),
    daySummaries: [],
    domains: domains({ memory: 500 }),
    playedToday: false
  });
  expect(advice.ready).toBe(false);
  expect(advice.quietReason).toBe('uncalibrated');
});

test('high load after dense sessions proposes rest-light for tomorrow', () => {
  const sessions = hardSessions();
  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ memory: 520, attention: 700, logic: 610 }),
    playedToday: false
  });
  expect(advice.ready).toBe(true);
  expect(advice.band).toBe('rest-light');
  expect(advice.copy.situation).toBe('fatigue_pre');
  expect(advice.copy.tone).toBe('recovery');
  expect(advice.copy.title).toMatch(/короче/i);
  expect(advice.copy.body).not.toMatch(FORBIDDEN_ADVISOR_COPY_RE);
  expect(advice.focuses.length).toBeGreaterThanOrEqual(1);
  expect(advice.focuses.length).toBeLessThanOrEqual(2);
});

test('a clean rest-light ritual today does not stack another rest day', () => {
  const sessions = [
    ...hardSessions(),
    session({
      id: 'rest-today',
      startedAt: '2026-09-11T09:00:00.000Z',
      finishedAt: '2026-09-11T09:05:00.000Z',
      durationSec: 300,
      plannedDurationSec: 300,
      items: [
        item({ exerciseId: 'odd-one', level: 4, accuracy: 0.9, avgRtMs: 400 }),
        item({ exerciseId: 'stroop', level: 4, accuracy: 0.88, avgRtMs: 410 }),
        item({ exerciseId: 'math-sprint', level: 3, accuracy: 0.91, avgRtMs: 390 })
      ]
    })
  ];
  const recovery = estimateRecovery({
    sessions,
    daySummaries: summariesFor(sessions),
    plannedDurationSec: 300,
    nowIso: NOW
  });
  expect(recovery.recommendation).toBe('rest-light');

  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ memory: 520, attention: 700, logic: 610 }),
    playedToday: true,
    recovery
  });
  expect(advice.ready).toBe(true);
  expect(advice.band).toBe('normal');
  expect(advice.reasons).toContain('rest-already-taken');
  expect(advice.copy.situation).toBe('day_done');
});

test('low load and even quality propose stretch, not a fake IQ claim', () => {
  const sessions = easySessions(['2026-09-09', '2026-09-10', '2026-09-11']);
  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ attention: 720, logic: 540, memory: 600 }),
    playedToday: true,
    streak: 3
  });
  expect(advice.ready).toBe(true);
  expect(advice.band).toBe('stretch');
  expect(advice.copy.situation).toBe('focus_day');
  expect(advice.copy.body).toMatch(/запас/i);
  expect(advice.copy.body).not.toMatch(/IQ|возраст мозга|прокачай/i);
});

test('G15 skip probability caps stretch without rewriting matchmaking', () => {
  const sessions = easySessions(['2026-09-09', '2026-09-10', '2026-09-11']);
  const retention = assessRetention({
    daySummaries: summariesFor(sessions),
    sessions,
    domains: domains({ attention: 720, logic: 540 }),
    playedToday: true,
    streak: 3,
    now: new Date(NOW)
  }) as RetentionSnapshot & {
    riskModel: { skipProbability: number; churnProbability: number };
  };
  retention.riskModel = { skipProbability: 0.62, churnProbability: 0.2 };

  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ attention: 720, logic: 540 }),
    playedToday: true,
    retention
  });
  expect(advice.band).toBe('rest-light');
  expect(advice.reasons).toContain('skip-risk');
});

test('G15 reengagement floor blocks stretch after a gap', () => {
  const sessions = easySessions(['2026-09-09', '2026-09-10', '2026-09-11']);
  const retention = assessRetention({
    daySummaries: summariesFor(sessions),
    sessions,
    domains: domains({ attention: 720 }),
    playedToday: true,
    streak: 3,
    now: new Date(NOW)
  }) as RetentionSnapshot & {
    reengagement: { floor: { multiplier: number } };
  };
  retention.reengagement = { floor: { multiplier: 0.85 } };

  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ attention: 720, logic: 500 }),
    playedToday: true,
    retention
  });
  expect(advice.band).not.toBe('stretch');
  expect(advice.reasons.join(' ')).toMatch(/difficulty-floor|skip|reentry|steady|rest/);
});

test('G16 fortnight focus is used as-is and EWMA is not recomputed here', () => {
  const src = readFileSync('src/core/retention-advisor.ts', 'utf8');
  expect(src).not.toMatch(/WEEK_ALPHA|MONTH_ALPHA|ewmaDelta|pickFocusOfFortnight/);
  expect(src).not.toMatch(/matchQuality|rankOpponents|duelantFromLocal/);

  const sessions = hardSessions();
  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ memory: 400, attention: 800, logic: 610 }),
    playedToday: false,
    fortnightFocus: {
      domainId: 'logic',
      why: '«Логика» почти не сдвинулась и сейчас самая тихая из областей с данными.'
    }
  });
  expect(advice.focuses[0]?.domainId).toBe('logic');
  expect(advice.focuses[0]?.source).toBe('fortnight');
  expect(advice.focuses[0]?.reason).toMatch(/Логика/);
  expect(advice.focuses.length).toBeLessThanOrEqual(2);
});

test('rest-light prefers a contrasting domain, not another pass in the last one', () => {
  const sessions = hardSessions();
  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({
      memory: 380,
      attention: 710,
      logic: 690,
      speed: 700,
      flexibility: 705
    }),
    playedToday: false
  });
  expect(advice.band).toBe('rest-light');
  expect(advice.focuses[0]?.domainId).not.toBe('memory');
  expect(advice.focuses[0]?.source).toBe('contrast');
});

test('copy catalog is tiny, tagged with G20 situations, and never forks FOMO claims', () => {
  const blob = collectAdvisorCopy().join('\n');
  expect(blob).not.toMatch(FORBIDDEN_ADVISOR_COPY_RE);
  expect(blob).toMatch(/завтра/i);
  expect(blob).toMatch(/навёрстывания/i);

  const rest = composeAdvisorCopy({ band: 'rest-light', focuses: [], playedToday: true, gapDays: 0 });
  expect(rest.situation).toBe('fatigue_rest');
  const pre = composeAdvisorCopy({ band: 'rest-light', focuses: [], playedToday: false, gapDays: 0 });
  expect(pre.situation).toBe('fatigue_pre');
  const done = composeAdvisorCopy({ band: 'normal', focuses: [], playedToday: true, gapDays: 0 });
  expect(done.situation).toBe('day_done');
  const back = composeAdvisorCopy({ band: 'normal', focuses: [], playedToday: false, gapDays: 4 });
  expect(back.situation).toBe('post_miss_comeback');
});

test('sparkFromAdvisor matches the card copy', () => {
  const sessions = hardSessions();
  const advice = adviseNextLoad({
    ...base,
    sessions,
    daySummaries: summariesFor(sessions),
    domains: domains({ memory: 500, attention: 700 }),
    playedToday: true
  });
  const spark = sparkFromAdvisor(advice);
  expect(spark?.title).toBe(advice.copy.title);
  expect(spark?.body).toBe(advice.copy.body);
  expect(spark?.tone).toBe(advice.copy.tone);
});

test('loadBandLabel is Russian process language, not a brain score', () => {
  expect(loadBandLabel('rest-light')).toBe('короче');
  expect(loadBandLabel('normal')).toBe('обычный');
  expect(loadBandLabel('stretch')).toBe('можно сложнее');
});
