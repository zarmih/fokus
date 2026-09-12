import { expect, test } from 'vitest';
import symbolRecallModule from '../src/exercises/symbol-recall';
import dualMatchModule from '../src/exercises/dual-match';
import trafficLightModule from '../src/exercises/traffic-light';
import { BlockResult } from '../src/exercises/contract';

test('symbol recall manifest and render', () => {
  expect(symbolRecallModule.manifest.id).toBe('symbol-recall');
  const el = document.createElement('div');
  let result: BlockResult | null = null;
  const cleanup = symbolRecallModule.render(
    el,
    1,
    (res) => { result = res; },
    () => false
  );
  expect(el.innerHTML).toContain('Было');
  if (typeof cleanup === 'function') cleanup();
});

test('dual match manifest and render', () => {
  expect(dualMatchModule.manifest.id).toBe('dual-match');
  const el = document.createElement('div');
  let result: BlockResult | null = null;
  const cleanup = dualMatchModule.render(
    el,
    1,
    (res) => { result = res; },
    () => false
  );
  expect(el.innerHTML).toContain('МАТЧ');
  if (typeof cleanup === 'function') cleanup();
});

test('traffic light manifest and render', () => {
  expect(trafficLightModule.manifest.id).toBe('traffic-light');
  const el = document.createElement('div');
  let result: BlockResult | null = null;
  const cleanup = trafficLightModule.render(
    el,
    1,
    (res) => { result = res; },
    () => false
  );
  expect(el.innerHTML).toContain('НАЖАТЬ');
  if (typeof cleanup === 'function') cleanup();
});
