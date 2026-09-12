import { expect, test } from 'vitest';
import mod from '../src/exercises/logic-grid';

test('logic-grid loads', () => {
  expect(mod.manifest.id).toBe('logic-grid');
  expect(mod.manifest.domain).toBe('memory');
});
