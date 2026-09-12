import { expect, test } from 'vitest';
import emojiMathModule from './emoji-math';

test('emoji-math manifest', () => {
  expect(emojiMathModule.manifest.id).toBe('emoji-math');
  expect(emojiMathModule.manifest.name).toBe('Эмодзи Математика');
});
