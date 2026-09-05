import { expect, test } from 'vitest';
import { registry } from '../src/exercises/registry';
import { dispatch } from '../src/exercises/dispatch';

test('registry contains all exercises', () => {
  const ids = registry.map(r => r.manifest.id);
  expect(ids).toContain('grid-memory');
  expect(ids).toContain('sequence');
  expect(ids).toContain('stroop');
  expect(ids).toContain('odd-one');
  expect(ids).toContain('switch-rule');
  expect(ids).toContain('pattern-next');
  expect(ids).toContain('pairs');
  expect(ids).toContain('pulley');
  expect(ids).toContain('swings');
});

test('dispatch maps id to module', () => {
  expect(dispatch['swings']).toBeDefined();
  expect(dispatch['swings'].manifest.id).toBe('swings');
});
