import { expect, test, vi } from 'vitest';
import slipMark from '../src/exercises/slip-mark';

test('slip-mark manifest is original Fokus speed exercise', () => {
  expect(slipMark.manifest.id).toBe('slip-mark');
  expect(slipMark.manifest.domain).toBe('speed');
  expect(slipMark.manifest.name).toMatch(/Метка|сквозняке/i);
  expect(slipMark.manifest.instruction).not.toMatch(/wikium|iq|прокачай мозг/i);
  expect(typeof slipMark.render).toBe('function');
});

test('slip-mark render ends with BlockResult shape', async () => {
  vi.useFakeTimers();
  const el = document.createElement('div');
  document.body.appendChild(el);
  let result: any = null;
  const finish = slipMark.render(el, 3, (r) => { result = r; }, () => true) as () => void;
  finish();
  expect(result).toBeTruthy();
  expect(result.accuracy).toBeGreaterThanOrEqual(0);
  expect(result.rounds).toBeGreaterThanOrEqual(0);
  vi.useRealTimers();
});
