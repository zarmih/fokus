import { expect, test, beforeEach } from 'vitest';
import { setLocale, hasI18nKey, peekI18n } from '../src/core/i18n';
import type { DaySummary, DomainIndex, Session, SessionItem } from '../src/core/types';
import {
  WEEKLY_I18N_KEYS,
  addDaysKey,
  assessStreakHonesty,
  buildWeeklyReport,
  collectPlayedDates,
  collectWeeklyCopy,
  consecutiveClaimAllowed,
  formatWeeklyShareText,
  weekDateKeys
} from '../src/core/weekly-report';

const NOW = new Date('2026-09-06T12:00:00Z');
const CLAIM_RE = /(повышает IQ|вырастет IQ|станет гением|гарантированно|лечит СДВГ|прокачает мозг|супермозг|unlock your potential|train your brain like a muscle)/i;

beforeEach(() => {
  setLocale('ru');
});

function item(partial: Partial<SessionItem> = {}): SessionItem {
  return {
    exerciseId: partial.exerciseId || 'grid-memory',
    level: 2,
    accuracy: 0.85,
    avgRtMs: 900,
    score: 40,
    ...partial
  };
}

function session(startedAt: string, extra?: Partial<Session> & { items?: SessionItem[] }): Session {
  return {
    id: extra?.id || startedAt,
    startedAt,
    finishedAt: extra?.finishedAt === undefined ? startedAt : extra.finishedAt,
    durationSec: extra?.durationSec ?? 300,
    items: extra?.items || [item()],
    ...extra
  };
}

function day(date: string, extra?: Partial<DaySummary>): DaySummary {
  return {
    date,
    totalScore: 80,
    domainDeltas: { memory: 4 },
    streak: 1,
    skipped: false,
    ...extra
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

const MAP = {
  'grid-memory': 'memory',
  stroop: 'attention',
  'math-sprint': 'logic',
  'switch-rule': 'flexibility',
  posner: 'speed'
};

test('weekDateKeys is 7 UTC calendar days ending today', () => {
  const keys = weekDateKeys(NOW);
  expect(keys).toHaveLength(7);
  expect(keys[0]).toBe('2026-08-31');
  expect(keys[keys.length - 1]).toBe('2026-09-06');
  expect(addDaysKey('2026-09-01', 1)).toBe('2026-09-02');
});

test('empty week is honest: no invented streak, no miracle copy', () => {
  const report = buildWeeklyReport({
    sessions: [],
    daySummaries: [],
    domains: [],
    now: NOW,
    locale: 'ru'
  });
  expect(report.empty).toBe(true);
  expect(report.streak.kind).toBe('empty');
  expect(report.streak.productStreak).toBe(0);
  expect(report.trainedDomainIds).toEqual([]);
  expect(report.narrative.voice).toBe('empty');
  expect(consecutiveClaimAllowed(report.streak)).toBe(false);
  expect(collectWeeklyCopy(report).join('\n')).not.toMatch(CLAIM_RE);
  expect(report.narrative.headline).toMatch(/тихая/);
});

test('played dates ignore skipped-only summaries and empty sessions', () => {
  const keys = weekDateKeys(NOW);
  const played = collectPlayedDates(
    [
      session('2026-09-05T10:00:00Z'),
      session('2026-09-04T10:00:00Z', { items: [] })
    ],
    [
      day('2026-09-05T10:00:00Z'),
      day('2026-09-03T10:00:00Z', { skipped: true, totalScore: 0 })
    ],
    keys
  );
  expect([...played]).toEqual(['2026-09-05']);
});

test('intact streak allows “in a row” only when the live run has no hole', () => {
  const sessions = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'].map((d, i) =>
    session(`${d}T10:00:00Z`, { id: `s${i}` })
  );
  const summaries = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'].map((d, i) =>
    day(`${d}T10:00:00Z`, { streak: i + 1, skipped: false, domainDeltas: { memory: 5, attention: 4 } })
  );
  const report = buildWeeklyReport({
    sessions,
    daySummaries: summaries,
    domains: domains({ memory: 400, attention: 700, speed: 500, flexibility: 480, logic: 510 }),
    now: NOW,
    domainByExercise: MAP,
    locale: 'ru'
  });
  expect(report.streak.kind).toBe('intact');
  expect(report.streak.livePlayed).toBe(5);
  expect(report.streak.liveForgiven).toBe(0);
  expect(consecutiveClaimAllowed(report.streak)).toBe(true);
  expect(report.narrative.voice).toBe('habit');
  expect(report.narrative.headline).toMatch(/подряд/);
  expect(report.trainedDomainIds).toContain('memory');
  expect(report.glance.activeDays).toBe(5);
  expect(report.glance.sessions).toBe(5);
});

test('forgiven skip is named a pause, not a trained consecutive day', () => {
  const sessions = [
    session('2026-09-01T10:00:00Z', { id: 's1' }),
    session('2026-09-03T10:00:00Z', { id: 's2' }),
    session('2026-09-04T10:00:00Z', { id: 's3' }),
    session('2026-09-05T10:00:00Z', { id: 's4' }),
    session('2026-09-06T10:00:00Z', { id: 's5' })
  ];
  const summaries = [
    day('2026-09-01T10:00:00Z', { streak: 1, skipped: false }),
    day('2026-09-03T10:00:00Z', { streak: 2, skipped: true }),
    day('2026-09-04T10:00:00Z', { streak: 3, skipped: false }),
    day('2026-09-05T10:00:00Z', { streak: 4, skipped: false }),
    day('2026-09-06T10:00:00Z', { streak: 5, skipped: false })
  ];
  const report = buildWeeklyReport({
    sessions,
    daySummaries: summaries,
    domains: domains({ memory: 300, attention: 800 }),
    now: NOW,
    domainByExercise: MAP,
    locale: 'ru'
  });
  expect(report.streak.kind).toBe('forgiven');
  expect(report.streak.liveForgiven).toBe(1);
  expect(report.streak.calendar.find((d) => d.date === '2026-09-02')?.state).toBe('forgiven');
  expect(consecutiveClaimAllowed(report.streak)).toBe(false);
  expect(report.narrative.voice).toBe('forgiven');
  expect(report.narrative.headline).toMatch(/подряд не было/);
  expect(report.streak.note).toMatch(/прощённый пропуск/);
  expect(report.streak.shareLine).not.toMatch(/подряд/);
  expect(collectWeeklyCopy(report).join('\n')).not.toMatch(CLAIM_RE);
});

test('a two-day hole resets the run — broken, not a silent 1-day streak', () => {
  const report = buildWeeklyReport({
    sessions: [session('2026-09-01T10:00:00Z')],
    daySummaries: [day('2026-09-01T10:00:00Z', { streak: 4 })],
    domains: domains({ memory: 400 }),
    now: NOW,
    locale: 'ru'
  });
  expect(report.streak.kind).toBe('broken');
  expect(report.streak.productStreak).toBe(0);
  expect(report.glance.activeDays).toBe(1);
  expect(consecutiveClaimAllowed(report.streak)).toBe(false);
  expect(report.narrative.headline).toMatch(/оборвался/);
});

test('domains trained come from session map and day deltas', () => {
  const report = buildWeeklyReport({
    sessions: [
      session('2026-09-05T10:00:00Z', {
        items: [item({ exerciseId: 'grid-memory' }), item({ exerciseId: 'stroop' })]
      }),
      session('2026-09-06T10:00:00Z', { items: [item({ exerciseId: 'stroop' })] })
    ],
    daySummaries: [
      day('2026-09-05T10:00:00Z', { domainDeltas: { memory: 6, attention: 20 } }),
      day('2026-09-06T10:00:00Z', { domainDeltas: { attention: 18 } })
    ],
    domains: domains({ memory: 350, attention: 820, speed: 500, flexibility: 500, logic: 500 }),
    now: NOW,
    domainByExercise: MAP,
    locale: 'ru'
  });
  expect(report.trainedDomainIds).toEqual(['attention', 'memory']);
  expect(report.neglectedDomainIds).toEqual(['speed', 'flexibility', 'logic']);
  expect(report.domains.find((d) => d.id === 'attention')?.blocks).toBe(2);
  expect(report.domains.find((d) => d.id === 'memory')?.blocks).toBe(1);
  expect(report.mix).toBe('skewed');
});

test('transfer insights hook is the week surface, not a second generator', () => {
  const report = buildWeeklyReport({
    sessions: [
      session('2026-09-05T10:00:00Z'),
      session('2026-09-06T10:00:00Z')
    ],
    daySummaries: [
      day('2026-09-05T10:00:00Z', { domainDeltas: { attention: 30, memory: 2 }, streak: 1 }),
      day('2026-09-06T10:00:00Z', { domainDeltas: { attention: 28, memory: 2 }, streak: 2 })
    ],
    domains: domains({ memory: 320, attention: 780, speed: 600, flexibility: 590, logic: 610 }),
    now: NOW,
    domainByExercise: MAP,
    locale: 'ru'
  });
  expect(report.transfer.insight).toBeTruthy();
  expect(report.transfer.insight.kind).not.toBeUndefined();
  expect(report.narrative.paragraphs.join(' ')).toMatch(/заметка переноса|Фокус недели/);
});

test('EN locale returns English chrome and does not copy-paste RU', () => {
  const report = buildWeeklyReport({
    sessions: [session('2026-09-06T10:00:00Z')],
    daySummaries: [day('2026-09-06T10:00:00Z')],
    domains: domains({ memory: 400 }),
    now: NOW,
    locale: 'en'
  });
  expect(report.locale).toBe('en');
  expect(report.narrative.headline).toMatch(/Too early|quiet|pauses|row|broke/i);
  expect(report.narrative.headline).not.toMatch(/[А-Яа-яЁё]/);
  expect(report.streak.note).not.toMatch(/[А-Яа-яЁё]/);
  expect(formatWeeklyShareText(report)).toMatch(/local history/i);
  expect(formatWeeklyShareText(report)).not.toMatch(CLAIM_RE);
});

test('share payload is local-history copy, filename stays on device', () => {
  const report = buildWeeklyReport({
    sessions: [session('2026-09-06T10:00:00Z'), session('2026-09-05T10:00:00Z')],
    daySummaries: [
      day('2026-09-05T10:00:00Z', { streak: 1 }),
      day('2026-09-06T10:00:00Z', { streak: 2 })
    ],
    domains: domains({ memory: 400, attention: 500 }),
    now: NOW,
    domainByExercise: MAP,
    locale: 'ru'
  });
  expect(report.share.filename).toBe('fokus-week.png');
  expect(report.share.footer).toMatch(/локальн/);
  expect(report.share.disclaimer).toMatch(/Не IQ/);
  const text = formatWeeklyShareText(report);
  expect(text).toContain('Fokus');
  expect(text).toContain(report.share.headline);
});

test('sessions outside the 7-day window are ignored', () => {
  const report = buildWeeklyReport({
    sessions: [
      session('2026-08-25T10:00:00Z', { items: [item({ exerciseId: 'stroop' })] }),
      session('2026-09-05T10:00:00Z')
    ],
    daySummaries: [
      day('2026-08-25T10:00:00Z', { domainDeltas: { attention: 40 } }),
      day('2026-09-05T10:00:00Z')
    ],
    domains: domains({ memory: 400, attention: 700 }),
    now: NOW,
    domainByExercise: MAP
  });
  expect(report.glance.sessions).toBe(1);
  expect(report.trainedDomainIds).toContain('memory');
  expect(report.domains.find((d) => d.id === 'attention')?.blocks || 0).toBe(0);
});

test('every G18 string has RU and EN and both are non-empty', () => {
  for (const key of WEEKLY_I18N_KEYS) {
    expect(hasI18nKey(key), key).toBe(true);
    const ru = peekI18n(key, 'ru');
    const en = peekI18n(key, 'en');
    expect(ru && ru.length > 0, key).toBe(true);
    expect(en && en.length > 0, key).toBe(true);
    expect(en).not.toBe(ru);
    expect(`${ru} ${en}`).not.toMatch(CLAIM_RE);
  }
});

test('assessStreakHonesty: one-day week is sparse, not a 7-day run', () => {
  const keys = weekDateKeys(NOW);
  const honesty = assessStreakHonesty({
    weekKeys: keys,
    played: new Set(['2026-09-06']),
    summaries: [day('2026-09-06T10:00:00Z', { streak: 1 })],
    locale: 'ru'
  });
  expect(honesty.kind).toBe('sparse');
  expect(honesty.playedDays).toBe(1);
  expect(honesty.allowsInARow).toBe(false);
});
