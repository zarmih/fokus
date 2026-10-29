import { expect, test } from 'vitest';
import { formatProgressHistoryWhen } from '../src/ui/screens/progress';
import { PREFERRED_TIME_ZONE } from '../src/core/streak';

test('formatProgressHistoryWhen: UTC evening maps to Moscow morning next day', () => {
  // 2026-10-28 21:30 UTC = 2026-10-29 00:30 Europe/Moscow
  const formatted = formatProgressHistoryWhen(
    '2026-10-28T21:30:00.000Z',
    PREFERRED_TIME_ZONE
  );

  // Moscow civil day/time — not UTC 28 Oct evening
  expect(formatted).toMatch(/29/);
  expect(formatted).toMatch(/10/);
  expect(formatted).toMatch(/2026/);
  expect(formatted).toMatch(/00:30|0:30/);
  expect(formatted).not.toMatch(/^28\./);
  expect(formatted).not.toMatch(/21:30/);
});

test('formatProgressHistoryWhen: before Moscow midnight stays previous civil day', () => {
  // 2026-10-28 20:30 UTC = 2026-10-28 23:30 Europe/Moscow
  const formatted = formatProgressHistoryWhen(
    '2026-10-28T20:30:00.000Z',
    PREFERRED_TIME_ZONE
  );

  expect(formatted).toMatch(/28/);
  expect(formatted).toMatch(/23:30/);
  expect(formatted).not.toMatch(/29/);
});
