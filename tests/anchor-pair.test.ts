import { expect, test, vi } from 'vitest';
import anchorPair from '../src/exercises/anchor-pair';

test('anchor-pair manifest is original Fokus memory exercise', () => {
  expect(anchorPair.manifest.id).toBe('anchor-pair');
  expect(anchorPair.manifest.domain).toBe('memory');
  expect(anchorPair.manifest.name).toMatch(/Якор/i);
  expect(anchorPair.manifest.instruction).not.toMatch(/wikium|lumosity|peak/i);
});

test('anchor-pair completes via finish callback', () => {
  vi.useFakeTimers();
  const el = document.createElement('div');
  document.body.appendChild(el);
  let result: any = null;
  const finish = anchorPair.render(el, 2, (r) => { result = r; }, () => true) as () => void;
  finish();
  expect(result.accuracy).toBeGreaterThanOrEqual(0);
  expect(typeof result.avgRtMs).toBe('number');
  vi.useRealTimers();
});
