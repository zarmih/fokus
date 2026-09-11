import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  COPY_TEMPLATES,
  FORBIDDEN_COPY_RE,
  MILESTONE_STREAKS,
  SITUATION_PRIORITY,
  collectCatalogCopy,
  composeRitualCopy,
  fillSlots,
  hash32,
  isPendingForgivenMiss,
  localDayKey,
  pickSituation,
  ruCount,
  selectTemplate,
  templatesFor,
  type RitualCopyInput
} from '../src/core/ritual-copy';

const NOON = new Date(2026, 8, 11, 12, 0, 0);
const EVENING = new Date(2026, 8, 11, 21, 0, 0);

function input(partial: Partial<RitualCopyInput> = {}): RitualCopyInput {
  return {
    calibrated: true,
    playedToday: false,
    streak: 0,
    asOf: NOON,
    ...partial
  };
}

test('every situation has at least three templates', () => {
  for (const situation of SITUATION_PRIORITY) {
    expect(templatesFor(situation).length, situation).toBeGreaterThanOrEqual(3);
  }
});

test('catalog copy stays in product voice and never FOMO-claims', () => {
  const blob = collectCatalogCopy().join('\n');
  expect(blob).not.toMatch(FORBIDDEN_COPY_RE);
  expect(blob).not.toMatch(/не пропусти|прокачай|нейрофитнес|last chance|you.?re on fire/i);
  expect(blob).toMatch(/навёрстывать/i);
  expect(blob).toMatch(/ошибаться нормально/i);
});

test('ritual-copy module does not import exercises or registry', () => {
  const src = readFileSync('src/core/ritual-copy.ts', 'utf8');
  expect(src).not.toMatch(/exercises\/registry|from '\.\.\/exercises/);
});

test('ruCount follows Russian plural rules', () => {
  expect(ruCount(1, 'день', 'дня', 'дней')).toBe('1 день');
  expect(ruCount(2, 'день', 'дня', 'дней')).toBe('2 дня');
  expect(ruCount(7, 'день', 'дня', 'дней')).toBe('7 дней');
  expect(ruCount(21, 'день', 'дня', 'дней')).toBe('21 день');
});

test('fillSlots substitutes known keys and drops unknown', () => {
  expect(fillSlots('Сегодня {minutes} мин · {domain}', { minutes: 5, domain: 'Память' })).toBe(
    'Сегодня 5 мин · Память'
  );
  expect(fillSlots('x {missing}', {})).toBe('x ');
});

test('hash32 is stable', () => {
  expect(hash32('2026-09-11|day_done')).toBe(hash32('2026-09-11|day_done'));
  expect(hash32('a')).not.toBe(hash32('b'));
});

describe('pickSituation', () => {
  test('uncalibrated wins over every other signal', () => {
    const { situation } = pickSituation(
      input({ calibrated: false, playedToday: true, streak: 14, fatigueScore: 90 })
    );
    expect(situation).toBe('uncalibrated');
  });

  test('played today + loud fatigue is rest, not another grind', () => {
    const { situation } = pickSituation(input({ playedToday: true, streak: 4, fatigueScore: 70 }));
    expect(situation).toBe('fatigue_rest');
  });

  test('played today without fatigue is day_done', () => {
    expect(pickSituation(input({ playedToday: true, streak: 3 })).situation).toBe('day_done');
  });

  test('pending forgiven miss beats comeback and focus', () => {
    const { situation, reason } = pickSituation(
      input({
        skippedYesterday: true,
        streak: 5,
        historyDays: 6,
        domain: 'Внимание',
        gapDays: 2
      })
    );
    expect(situation).toBe('post_miss_forgiven');
    expect(reason).toMatch(/forgiven/);
    expect(isPendingForgivenMiss(input({ gapDays: 2, historyDays: 4 }))).toBe(true);
  });

  test('real gap is a comeback, not a debt', () => {
    const { situation } = pickSituation(
      input({ streak: 0, historyDays: 8, gapDays: 4, domain: 'Память' })
    );
    expect(situation).toBe('post_miss_comeback');
  });

  test('rest-light before the session is fatigue_pre', () => {
    expect(
      pickSituation(input({ recovery: 'rest-light', streak: 3, historyDays: 3 })).situation
    ).toBe('fatigue_pre');
  });

  test('milestones 7/14/30 fire exactly', () => {
    for (const n of MILESTONE_STREAKS) {
      expect(pickSituation(input({ streak: n, historyDays: n })).situation).toBe('streak_milestone');
    }
    expect(pickSituation(input({ streak: 8, historyDays: 8, asOf: NOON })).situation).not.toBe(
      'streak_milestone'
    );
  });

  test('evening long streak is fragile, noon is hold or focus', () => {
    expect(
      pickSituation(input({ streak: 12, historyDays: 12, asOf: EVENING, hour: 21 })).situation
    ).toBe('streak_fragile');
    expect(
      pickSituation(input({ streak: 12, historyDays: 12, asOf: NOON, hour: 12 })).situation
    ).toBe('streak_hold');
    expect(
      pickSituation(
        input({ streak: 12, historyDays: 12, asOf: NOON, hour: 12, domain: 'Логика' })
      ).situation
    ).toBe('focus_day');
  });

  test('early streak is building', () => {
    expect(pickSituation(input({ streak: 3, historyDays: 3 })).situation).toBe('streak_building');
  });

  test('loud neglect names the waiting domain', () => {
    expect(
      pickSituation(input({ neglectScore: 80, domain: 'Гибкость', historyDays: 1, streak: 1 })).situation
    ).toBe('domain_wait');
  });
});

describe('composeRitualCopy', () => {
  test('same day is deterministic; another day can rotate', () => {
    const base = input({ playedToday: true, streak: 2 });
    const a = composeRitualCopy(base);
    const b = composeRitualCopy(base);
    expect(a.templateId).toBe(b.templateId);
    expect(a.title).toBe(b.title);

    const otherDays = [0, 1, 2, 3, 4, 5, 6].map((d) =>
      composeRitualCopy({ ...base, asOf: new Date(2026, 8, 11 + d, 12, 0, 0) }).templateId
    );
    expect(new Set(otherDays).size).toBeGreaterThan(1);
  });

  test('lastTemplateId skips the previous variant when a pool exists', () => {
    const base = input({ playedToday: true, streak: 1, asOf: NOON });
    const first = composeRitualCopy(base);
    const second = composeRitualCopy({ ...base, lastTemplateId: first.templateId });
    expect(second.templateId).not.toBe(first.templateId);
    expect(second.situation).toBe(first.situation);
  });

  test('post-miss copy never asks to make up days', () => {
    const copy = composeRitualCopy(
      input({ skippedYesterday: true, streak: 6, historyDays: 8, gapDays: 2 })
    );
    expect(copy.situation).toBe('post_miss_forgiven');
    expect(copy.tone).toBe('recovery');
    expect(copy.body).not.toMatch(/отработай|штраф|не пропусти/i);
    expect(`${copy.title} ${copy.body}`).toMatch(/прост|пропуск|ритм|навёрстывать/i);
  });

  test('comeback with a named gap fills the slot', () => {
    const copy = composeRitualCopy(
      input({
        streak: 0,
        historyDays: 10,
        gapDays: 5,
        asOf: new Date(2026, 8, 20, 12, 0, 0)
      })
    );
    expect(copy.situation).toBe('post_miss_comeback');
    expect(copy.tone).toBe('recovery');
    expect(copy.body).toMatch(/навёрстыв|пропуск|пауза/i);
  });

  test('fatigue rest talks about tomorrow, not one more round', () => {
    const copy = composeRitualCopy(input({ playedToday: true, fatigueScore: 80, streak: 4 }));
    expect(copy.situation).toBe('fatigue_rest');
    expect(copy.body).toMatch(/завтра/i);
    expect(copy.body).not.toMatch(/ещё одну сессию|дожимай|не пропусти/i);
    expect(copy.cardTitle).toMatch(/план выполнен|ритуал закрыт/i);
  });

  test('pre-session rest-light uses shorter/easier language', () => {
    const copy = composeRitualCopy(input({ recovery: 'rest-light', loadEwma: 80, streak: 4, historyDays: 4 }));
    expect(copy.situation).toBe('fatigue_pre');
    expect(`${copy.title} ${copy.cardKicker}`).toMatch(/короче|легче|лёгкий/i);
  });

  test('milestone titles include the day count', () => {
    const copy = composeRitualCopy(input({ streak: 7, historyDays: 7 }));
    expect(copy.situation).toBe('streak_milestone');
    expect(copy.title).toMatch(/7/);
  });

  test('evening fragility titles stay in the soft-nudge family', () => {
    const copy = composeRitualCopy(input({ streak: 12, historyDays: 12, asOf: EVENING, hour: 21 }));
    expect(copy.situation).toBe('streak_fragile');
    expect(copy.title).toMatch(/серия|возврат|короче/i);
    expect(copy.body).not.toMatch(FORBIDDEN_COPY_RE);
  });

  test('focus day names the domain', () => {
    const copy = composeRitualCopy(input({ domain: 'Память', streak: 1, historyDays: 1 }));
    expect(copy.situation).toBe('focus_day');
    expect(`${copy.title} ${copy.body}`).toMatch(/Память/);
  });

  test('selectTemplate falls back when a slot is missing', () => {
    const t = selectTemplate('post_miss_comeback', {
      streak: 0,
      streakDays: '0 дней',
      domain: '',
      minutes: 5,
      chrono: '',
      gapDays: ''
    }, '2026-09-11');
    expect(t.body).not.toMatch(/\{gapDays\}/);
    expect(t.situation).toBe('post_miss_comeback');
  });
});

test('localDayKey is calendar-local, not UTC-shifted', () => {
  expect(localDayKey(new Date(2026, 8, 11, 0, 30, 0))).toBe('2026-09-11');
});

test('priority list covers every catalog situation', () => {
  const fromCatalog = new Set(COPY_TEMPLATES.map((t) => t.situation));
  const fromPriority = new Set(SITUATION_PRIORITY);
  expect(fromCatalog).toEqual(fromPriority);
  const ids = COPY_TEMPLATES.map((t) => t.id);
  expect(new Set(ids).size).toBe(ids.length);
});
