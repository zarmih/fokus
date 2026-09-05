import { expect, test } from 'vitest';
import { buildSession } from '../src/core/session-builder';

test('buildSession returns items', () => {
  expect(buildSession(300, [], []).length).toBeGreaterThan(0);
});
