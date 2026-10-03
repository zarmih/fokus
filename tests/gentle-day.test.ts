import { expect, test, describe } from 'vitest';
import { gentleDayIndex, gentleDayNote } from '../src/core/onboarding';

describe('gentleDayIndex', () => {
  test('returns null for empty plan', () => {
    expect(gentleDayIndex(null)).toBeNull();
    expect(gentleDayIndex({ days: [] })).toBeNull();
  });

  test('returns day with intensity gentle', () => {
    const plan = {
      days: [
        { durationSec: 300, intensity: 'steady' },
        { durationSec: 300, intensity: 'gentle' },
        { durationSec: 300, intensity: 'full' }
      ]
    };
    expect(gentleDayIndex(plan)).toBe(2);
  });

  test('returns earliest day with strictly smallest durationSec if no gentle intensity', () => {
    const plan = {
      days: [
        { durationSec: 400, intensity: 'steady' },
        { durationSec: 300, intensity: 'steady' },
        { durationSec: 300, intensity: 'steady' }
      ]
    };
    expect(gentleDayIndex(plan)).toBe(2);
  });
});

describe('gentleDayNote', () => {
  test('returns null if no gentle day', () => {
    expect(gentleDayNote(null)).toBeNull();
  });

  test('returns Russian sentence naming the day', () => {
    const plan = {
      days: [
        { durationSec: 400 },
        { durationSec: 300, intensity: 'gentle' }
      ]
    };
    expect(gentleDayNote(plan)).toBe('День 2 будет короче — это часть плана, ничего наверстывать не нужно.');
  });
});
