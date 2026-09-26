import { expect, test } from 'vitest';
import letterNumberSwitchModule from '../src/exercises/letter-number-switch';

test('letter-number-switch has correct manifest', () => {
  expect(letterNumberSwitchModule.manifest.id).toBe('letter-number-switch');
  expect(letterNumberSwitchModule.manifest.domain).toBe('flexibility');
  expect(letterNumberSwitchModule.render).toBeTypeOf('function');
});
