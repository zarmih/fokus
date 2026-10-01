import { expect, test, vi } from 'vitest';
import tideGate from '../src/exercises/tide-gate';

test('tide-gate manifest is original Fokus attention exercise', () => {
  expect(tideGate.manifest.id).toBe('tide-gate');
  expect(tideGate.manifest.domain).toBe('attention');
  expect(tideGate.manifest.name).toMatch(/Прилив|ворот/i);
  expect(tideGate.manifest.instruction).not.toMatch(/wikium|iq|прокачай мозг/i);
  expect(typeof tideGate.render).toBe('function');
});

test('tide-gate render ends with BlockResult shape', async () => {
  vi.useFakeTimers();
  const el = document.createElement('div');
  document.body.appendChild(el);
  let result: any = null;
  const finish = tideGate.render(el, 3, (r) => { result = r; }, () => true) as () => void;
  finish();
  expect(result).toBeTruthy();
  expect(result.accuracy).toBeGreaterThanOrEqual(0);
  expect(result.rounds).toBeGreaterThanOrEqual(0);
  vi.useRealTimers();
});
