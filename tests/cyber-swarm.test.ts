import { expect, test } from 'vitest';
import { cyberSwarmModule } from '../src/exercises/cyber-swarm/index';

test('cyber-swarm module is defined', () => {
  expect(cyberSwarmModule).toBeDefined();
  expect(cyberSwarmModule.manifest.id).toBe('cyber-swarm');
  expect(cyberSwarmModule.render).toBeTypeOf('function');
});
