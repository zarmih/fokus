import { expect, test } from 'vitest';
import { ColorFrequencyEngine } from '../src/exercises/color-frequency';

test('color frequency generates valid puzzle', () => {
  const engine = new ColorFrequencyEngine();
  const res = engine.generate(1);
  
  expect(res.dots.length).toBeGreaterThan(10);
  expect(res.selectedColors.length).toBeGreaterThanOrEqual(2);
  
  // Verify winning color is actually the most frequent
  const counts: Record<string, number> = {};
  res.dots.forEach(d => {
    counts[d] = (counts[d] || 0) + 1;
  });
  
  let maxCount = -1;
  let maxColor = '';
  Object.keys(counts).forEach(k => {
    if (counts[k] > maxCount) {
      maxCount = counts[k];
      maxColor = k;
    }
  });
  
  expect(maxColor).toBe(res.winningColor);
});

test('color frequency submit', () => {
  const engine = new ColorFrequencyEngine();
  expect(engine.submit('#fff', '#fff')).toBe(true);
  expect(engine.submit('#000', '#fff')).toBe(false);
});
