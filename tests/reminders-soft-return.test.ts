import { describe, expect, test } from 'vitest';
import {
  buildReminderCopy,
  reminderSettingsBlurb,
  softReturnInstallCopy
} from '../src/core/reminders';

describe('reminders — soft-return / PWA deepen', () => {
  test('soft_return status yields soft_return kind and calm RU body', () => {
    const c = buildReminderCopy({
      playedToday: false,
      openMisses: 2,
      streakStatus: 'soft_return',
      streakCurrent: 0,
      gapDays: 2,
      softReturnActive: true
    });
    expect(c).not.toBeNull();
    expect(c!.kind).toBe('soft_return');
    expect(c!.tag).toBe('fokus-soft-return');
    expect(c!.title).toMatch(/мягкий возврат/i);
    expect(c!.body).not.toMatch(/не пропусти|last chance|wikium|прокачай/i);
  });

  test('long pause uses quiet soft copy and stops after >7 misses', () => {
    const long = buildReminderCopy({
      playedToday: false,
      openMisses: 7,
      streakStatus: 'fresh_start',
      streakCurrent: 0,
      gapDays: 7
    });
    expect(long!.kind).toBe('long_pause');
    expect(long!.tag).toBe('fokus-soft-return');

    const quiet = buildReminderCopy({
      playedToday: false,
      openMisses: 8,
      streakStatus: 'fresh_start',
      streakCurrent: 0,
      gapDays: 8
    });
    expect(quiet).toBeNull();
  });

  test('played today → no notification', () => {
    expect(
      buildReminderCopy({
        playedToday: true,
        openMisses: 0,
        streakStatus: 'active',
        streakCurrent: 3,
        gapDays: 0
      })
    ).toBeNull();
  });

  test('settings blurb mentions soft pause behaviour', () => {
    const b = reminderSettingsBlurb();
    expect(b).toMatch(/пауз/i);
    expect(b).toMatch(/без «не пропусти»|мягко/i);
  });

  test('PWA install copy deepens on soft-return', () => {
    const soft = softReturnInstallCopy(true);
    expect(soft.title).toMatch(/мягкий возврат/i);
    expect(soft.cta).toMatch(/мягкого старта/i);
    const normal = softReturnInstallCopy(false);
    expect(normal.title).toMatch(/главный экран/i);
    expect(normal.cta).not.toBe(soft.cta);
  });
});
