import { expect, test } from 'vitest';
import { fractalSymmetryModule } from '../src/exercises/fractal-symmetry/index';

test('fractal-symmetry module is defined', () => {
  expect(fractalSymmetryModule).toBeDefined();
  expect(fractalSymmetryModule.manifest.id).toBe('fractal-symmetry');
  expect(fractalSymmetryModule.render).toBeTypeOf('function');
});
