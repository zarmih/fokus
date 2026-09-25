import { expect, test } from 'vitest';
import symbolMatchModule from '../src/exercises/symbol-match';

test('symbol-match has correct manifest', () => {
  expect(symbolMatchModule.manifest.id).toBe('symbol-match');
  expect(symbolMatchModule.manifest.domain).toBe('attention');
  expect(symbolMatchModule.render).toBeTypeOf('function');
});
