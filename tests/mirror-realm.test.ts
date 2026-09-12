import { expect, test } from 'vitest';
import mirrorRealmModule from '../src/exercises/mirror-realm';

test('mirror-realm manifest is correct', () => {
  const { manifest } = mirrorRealmModule;
  expect(manifest.id).toBe('mirror-realm');
  expect(manifest.domain).toBe('flexibility');
  expect(manifest.skills).toContain('task_switching');
  expect(manifest.metricModel).toBe('speed-accuracy');
});

test('mirror-realm exports render function', () => {
  expect(typeof mirrorRealmModule.render).toBe('function');
});
