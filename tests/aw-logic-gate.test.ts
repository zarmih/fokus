import { expect, test } from 'vitest';
import awLogicGateModule from '../src/exercises/aw-logic-gate';

test('aw-logic-gate manifest is valid', () => {
  expect(awLogicGateModule.manifest.id).toBe('aw-logic-gate');
  expect(awLogicGateModule.manifest.name).toBe('Логический шлюз');
});

test('aw-logic-gate render does not throw', () => {
  const el = document.createElement('div');
  const cleanup = awLogicGateModule.render(el, 1, () => {}, () => false);
  if (typeof cleanup === 'function') {
    cleanup();
  }
});
