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

test('russian plurals', () => {
  expect(ruPlural(1, 'день', 'дня', 'дней')).toBe('1 день');
  expect(ruPlural(2, 'день', 'дня', 'дней')).toBe('2 дня');
  expect(ruPlural(5, 'день', 'дня', 'дней')).toBe('5 дней');
  expect(ruPlural(21, 'сессия', 'сессии', 'сессий')).toBe('21 сессия');
});
