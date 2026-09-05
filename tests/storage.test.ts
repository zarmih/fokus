import { expect, test } from 'vitest';
import { storage } from '../src/core/storage';

test('storage default profile', () => {
  const p = storage.getProfile();
  expect(p.locale).toBe('ru');
});
