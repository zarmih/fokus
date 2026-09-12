import { expect, test } from 'vitest';
import mirrorMovesModule from './mirror-moves';

test('mirror-moves manifest', () => {
  expect(mirrorMovesModule.manifest.id).toBe('mirror-moves');
  expect(mirrorMovesModule.manifest.name).toBe('Зеркальные Шаги');
});
