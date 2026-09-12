import { expect, test } from 'vitest';
import sizeStroopModule from './size-stroop';

test('size-stroop manifest', () => {
  expect(sizeStroopModule.manifest.id).toBe('size-stroop');
  expect(sizeStroopModule.manifest.name).toBe('Ловушка Размера');
});
