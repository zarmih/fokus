import { expect, test, vi } from 'vitest';
import cutBar from '../src/exercises/cut-bar';

test('cut-bar manifest is original Fokus speed exercise', () => {
  expect(cutBar.manifest.id).toBe('cut-bar');
  expect(cutBar.manifest.domain).toBe('speed');
  expect(cutBar.manifest.name).toMatch(/Рубеж/i);
  expect(cutBar.manifest.instruction).not.toMatch(/wikium|iq|прокачай мозг/i);
  expect(typeof cutBar.render).toBe('function');
});

test('cut-bar render ends with BlockResult shape', async () => {
  vi.useFakeTimers();
  const el = document.createElement('div');
  document.body.appendChild(el);
  let result: any = null;
  const finish = cutBar.render(el, 3, (r) => { result = r; }, () => true) as () => void;
  finish();
  expect(result).toBeTruthy();
  expect(result.accuracy).toBeGreaterThanOrEqual(0);
  expect(result.rounds).toBeGreaterThanOrEqual(0);
  vi.useRealTimers();
});
