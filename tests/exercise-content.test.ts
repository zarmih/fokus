import { describe, expect, test } from 'vitest';
import {
  assertOriginalCopy,
  buildSessionContent,
  CONTENT_BANNED,
  difficultyBand,
  difficultyBandLabel,
  domainSessionTip
} from '../src/core/exercise-content';

describe('exercise-content — original RU difficulty/hints', () => {
  test('maps difficulty to four named RU bands', () => {
    expect(difficultyBand(1).id).toBe('warmup');
    expect(difficultyBand(3.9).label).toBe('Разогрев');
    expect(difficultyBand(4).id).toBe('comfort');
    expect(difficultyBand(9.9).label).toBe('Комфорт');
    expect(difficultyBand(10).id).toBe('challenge');
    expect(difficultyBand(17).label).toBe('Вызов');
    expect(difficultyBand(18).id).toBe('peak');
    expect(difficultyBandLabel(22)).toBe('Пик');
  });

  test('session content uses band label instead of raw level number', () => {
    const c = buildSessionContent({
      blockIndex: 2,
      difficulty: 6.4,
      domain: 'memory'
    });
    expect(c.metaLine).toBe('Блок 2 · Комфорт');
    expect(c.metaLine).not.toMatch(/уровень\s+\d/i);
    expect(c.hintLine).toMatch(/Комфорт|уверенный|память/i);
    expect(c.tip.length).toBeGreaterThan(20);
  });

  test('domain tips are stable (no Math.random) and domain-flavoured', () => {
    const a = domainSessionTip('attention', 5);
    const b = domainSessionTip('attention', 5);
    expect(a).toBe(b);
    expect(domainSessionTip('flexibility', 1)).toMatch(/правил/i);
    expect(domainSessionTip('logic', 2)).toMatch(/правил|ряд|вариант/i);
  });

  test('all band + tip copy is original (no Wikium/IQ tropes)', () => {
    const samples = [
      difficultyBand(1).hint,
      difficultyBand(8).hint,
      difficultyBand(12).hint,
      difficultyBand(20).hint,
      ...(['attention', 'memory', 'speed', 'flexibility', 'logic'] as const).flatMap((d) => [
        domainSessionTip(d, 1),
        domainSessionTip(d, 2)
      ]),
      buildSessionContent({ blockIndex: 1, difficulty: 12, domain: 'speed' }).hintLine
    ];
    for (const s of samples) {
      expect(assertOriginalCopy(s), s).toBe(true);
      expect(s).not.toMatch(CONTENT_BANNED);
    }
  });
});
