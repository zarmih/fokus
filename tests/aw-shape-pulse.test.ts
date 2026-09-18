import { expect, test } from 'vitest';
import awShapePulseModule from '../src/exercises/aw-shape-pulse';

test('aw-shape-pulse manifest is valid', () => {
  expect(awShapePulseModule.manifest.id).toBe('aw-shape-pulse');
  expect(awShapePulseModule.manifest.name).toBe('Пульс фигур');
});

test('aw-shape-pulse render does not throw', () => {
  const el = document.createElement('div');
  const cleanup = awShapePulseModule.render(el, 1, () => {}, () => false);
  if (typeof cleanup === 'function') {
    cleanup();
  }
});
