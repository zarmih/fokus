import { expect, test } from 'vitest';
import symbolStreamModule from '../src/exercises/symbol-stream';

test('symbol-stream manifest is well-formed', () => {
  expect(symbolStreamModule.manifest.id).toBe('symbol-stream');
  expect(symbolStreamModule.manifest.domain).toBe('attention');
  expect(symbolStreamModule.manifest.skills).toContain('sustained_attention');
});

test('symbol-stream render cleans up', () => {
  const el = document.createElement('div');
  const cleanup = symbolStreamModule.render(el, 1, () => {}, () => false) as () => void;
  expect(cleanup).toBeTypeOf('function');
  cleanup();
});
