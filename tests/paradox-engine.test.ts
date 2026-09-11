import { expect, test } from 'vitest';
import { paradoxEngineModule } from '../src/exercises/paradox-engine/index';

test('paradox-engine module is defined', () => {
  expect(paradoxEngineModule).toBeDefined();
  expect(paradoxEngineModule.manifest.id).toBe('paradox-engine');
  expect(paradoxEngineModule.render).toBeTypeOf('function');
});
