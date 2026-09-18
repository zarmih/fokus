import { expect, test } from 'vitest';
import awColorDriftModule from '../src/exercises/aw-color-drift';

test('aw-color-drift manifest is valid', () => {
  expect(awColorDriftModule.manifest.id).toBe('aw-color-drift');
  expect(awColorDriftModule.manifest.name).toBe('Цветовой дрейф');
});

test('aw-color-drift render does not throw', () => {
  const el = document.createElement('div');
  const cleanup = awColorDriftModule.render(el, 1, () => {}, () => false);
  if (typeof cleanup === 'function') {
    cleanup();
  }
});
