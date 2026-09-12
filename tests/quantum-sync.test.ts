import { expect, test } from 'vitest';
import quantumSyncModule from '../src/exercises/quantum-sync';

test('quantum-sync manifest is correct', () => {
  const { manifest } = quantumSyncModule;
  expect(manifest.id).toBe('quantum-sync');
  expect(manifest.domain).toBe('attention');
  expect(manifest.skills).toContain('sustained_attention');
  expect(manifest.metricModel).toBe('speed-accuracy');
});

test('quantum-sync exports render function', () => {
  expect(typeof quantumSyncModule.render).toBe('function');
});
