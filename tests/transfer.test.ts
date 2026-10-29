import { expect, test } from 'vitest';
import {
  TRANSFER_DOMAINS,
  TRANSFER_MAP,
  WEEKLY_FOCUS_BIAS,
  buildTransferTip,
  getTransferEntry,
  isTransferDomain,
  pickSituation,
  rotatingTipDomain,
  ruPlural,
  startOfWeekKey,
  weakestTransferDomain,
  weeklyFocusBias
} from '../src/core/transfer';

const CLAIM_RE =
  /(повышает IQ|вырастет IQ|\bIQ\b|станет гением|гарантированно|лечит СДВГ|прокачает мозг|супермозг)/i;

test('transfer map covers all five domains with modest everyday situations', () => {
  expect(TRANSFER_DOMAINS).toEqual(['memory', 'attention', 'logic', 'speed', 'flexibility']);
  for (const id of TRANSFER_DOMAINS) {
    const entry = TRANSFER_MAP[id];
    expect(entry.domain).toBe(id);
    expect(entry.label.length).toBeGreaterThan(3);
    expect(entry.trains.length).toBeGreaterThan(20);
    expect(entry.notClaimed.length).toBeGreaterThan(20);
    expect(entry.situations.length).toBeGreaterThanOrEqual(3);
    expect(entry.trains).not.toMatch(CLAIM_RE);
    for (const s of entry.situations) {
      expect(s.situation.length).toBeGreaterThan(12);
      expect(s.practiceLink.length).toBeGreaterThan(20);
      expect(s.situation).not.toMatch(CLAIM_RE);
    }
  }
});

test('unknown domain is a safe null, not a throw', () => {
  expect(isTransferDomain('iq')).toBe(false);
  expect(getTransferEntry('iq')).toBeNull();
  expect(pickSituation('iq')).toBeNull();
  expect(buildTransferTip('iq')).toBeNull();
});

test('situation pick is stable for the same week salt', () => {
  const a = pickSituation('memory', '2026-09-07');
  const b = pickSituation('memory', '2026-09-07');
  const c = pickSituation('memory', '2026-09-14');
  expect(a?.id).toBe(b?.id);
  expect(a).toBeTruthy();
  expect(c).toBeTruthy();
});

test('weekly focus bias is a no-op without a domain', () => {
  expect(weeklyFocusBias('memory')).toBe(0);
  expect(weeklyFocusBias('memory', null)).toBe(0);
  expect(weeklyFocusBias('memory', 'balance')).toBe(0);
  expect(weeklyFocusBias('memory', 'memory')).toBe(WEEKLY_FOCUS_BIAS);
  expect(weeklyFocusBias('speed', 'memory')).toBe(0);
});

test('weakest transfer domain ignores empty and unknown ids', () => {
  expect(weakestTransferDomain([])).toBeNull();
  expect(weakestTransferDomain([{ domain: 'mystery', value: 10, updatedAt: '' }])).toBeNull();
  expect(
    weakestTransferDomain([
      { domain: 'memory', value: 420, updatedAt: '' },
      { domain: 'attention', value: 700, updatedAt: '' }
    ])
  ).toBe('memory');
});

test('week key and rotating tip are deterministic', () => {
  const monday = new Date('2026-09-07T12:00:00Z'); // Monday
  const tuesday = new Date('2026-09-08T12:00:00Z');
  expect(startOfWeekKey(monday)).toBe('2026-09-07');
  expect(startOfWeekKey(tuesday)).toBe('2026-09-07');
  expect(rotatingTipDomain(monday)).toBe(rotatingTipDomain(tuesday));
});

test('startOfWeekKey uses Moscow Monday-start, not UTC (Sunday/Monday boundary)', () => {
  // 2026-10-04 is Sunday. Late UTC Sunday is already Monday in Moscow (UTC+3).
  // 2026-10-04T22:30:00.000Z = 2026-10-05 01:30 MSK (Monday) → week starts 2026-10-05
  expect(startOfWeekKey(new Date('2026-10-04T22:30:00.000Z'))).toBe('2026-10-05');

  // Earlier same UTC Sunday: 2026-10-04T19:00:00.000Z = 2026-10-04 22:00 MSK (Sunday)
  // → still previous week starting 2026-09-28
  expect(startOfWeekKey(new Date('2026-10-04T19:00:00.000Z'))).toBe('2026-09-28');

  // Late Moscow Sunday that is still Sunday UTC: Monday morning UTC that is
  // still Sunday evening Moscow — 2026-10-05T20:00:00.000Z = 2026-10-05 23:00 MSK (Monday)
  expect(startOfWeekKey(new Date('2026-10-05T20:00:00.000Z'))).toBe('2026-10-05');

  // Vice versa edge: early Monday UTC that is still Sunday in a negative offset
  // is not our product TZ; for Moscow, early Monday UTC is already Monday MSK.
  // End of Moscow Sunday week: 2026-10-04T20:59:59.000Z = 2026-10-04 23:59:59 MSK
  expect(startOfWeekKey(new Date('2026-10-04T20:59:59.000Z'))).toBe('2026-09-28');
  // First second of Moscow Monday: 2026-10-04T21:00:00.000Z = 2026-10-05 00:00 MSK
  expect(startOfWeekKey(new Date('2026-10-04T21:00:00.000Z'))).toBe('2026-10-05');

  // Matches quests mondayOfMoscowWeek for the same instants
  expect(startOfWeekKey(new Date('2026-10-04T22:30:00.000Z'))).toBe(
    startOfWeekKey(new Date('2026-10-05T12:00:00.000Z'))
  );
});

test('russian plurals', () => {
  expect(ruPlural(1, 'день', 'дня', 'дней')).toBe('1 день');
  expect(ruPlural(2, 'день', 'дня', 'дней')).toBe('2 дня');
  expect(ruPlural(5, 'день', 'дня', 'дней')).toBe('5 дней');
  expect(ruPlural(21, 'сессия', 'сессии', 'сессий')).toBe('21 сессия');
});
