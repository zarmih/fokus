import { expect, test } from 'vitest';
import { registry } from '../src/exercises/registry';
import { dispatch } from '../src/exercises/dispatch';
import { catalog } from '../src/exercises/catalog';

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
  expect(ids).toContain('math-sprint');
});

test('dispatch maps id to module', () => {
  expect(dispatch['swings']).toBeDefined();
  expect(dispatch['swings'].manifest.id).toBe('swings');
});

test('lightweight catalog covers every registry id', () => {
  expect(catalog.map(c => c.manifest.id).sort()).toEqual(registry.map(r => r.manifest.id).sort());
});
