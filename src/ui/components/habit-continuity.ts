import type { ContinuitySnapshot, GentleReturn } from '../../core/continuity';
import { L, getLocale } from '../../core/i18n';
import { domainLabel } from '../../core/labels';
import type { DayStreak } from '../../core/streak';

function daysWord(n: number): string {
  if (getLocale() === 'en') {
    return n === 1 ? 'day' : 'days';
  }
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return 'дней';
  if (d === 1) return 'день';
  if (d >= 2 && d <= 4) return 'дня';
  return 'дней';
}

function scoreText(score: number): string {
  return score.toFixed(2);
}

function familiarPhrase(ritual: GentleReturn): string {
  const names = ritual.familiarDomains
    .slice(0, 2)
    .map((id) => domainLabel(id))
    .filter(Boolean);
  if (getLocale() === 'en') {
    if (names.length === 0) return 'a short familiar session';
    return `a short session: ${names.join(' and ')}`;
  }
  if (names.length === 0) return 'короткий знакомый блок';
  return `короткий блок: ${names.join(' и ')}`;
}

export function streakAriaLabel(streak: DayStreak): string {
  if (getLocale() === 'en') {
    if (streak.status === 'empty') return 'No streak yet';
    if (streak.status === 'soft_return') {
      return 'Short break. Get back into your rhythm.';
    }
    if (streak.status === 'fresh_start') return 'Fresh start. Streak begins with today’s session';
    if (streak.status === 'returned') {
      return `Streak of ${streak.current} ${daysWord(streak.current)}. New count after a short break`;
    }
    if (streak.status === 'open') {
      return `Streak of ${streak.current} ${daysWord(streak.current)} in a row. Today locks in the ritual`;
    }
    return `Streak of ${streak.current} ${daysWord(streak.current)} in a row`;
  }
  if (streak.status === 'empty') return 'Серии пока нет';
  if (streak.status === 'soft_return') {
    return `Короткая пауза. Возвращайтесь в ритм.`;
  }
  if (streak.status === 'fresh_start') return 'Новый заход. Серия начнётся с сегодняшней сессии';
  if (streak.status === 'returned') {
    return `Серия ${streak.current} ${daysWord(streak.current)}. Новый отсчёт после короткой паузы`;
  }
  if (streak.status === 'open') {
    return `Серия ${streak.current} ${daysWord(streak.current)} подряд. Сегодня закрепит ритуал`;
  }
  return `Серия ${streak.current} ${daysWord(streak.current)} подряд`;
}

export function streakChipCaption(streak: DayStreak): { num: string; lbl: string } {
  if (getLocale() === 'en') {
    switch (streak.status) {
      case 'empty':
        return { num: '0', lbl: 'no streak' };
      case 'soft_return':
        return { num: '0', lbl: 'gentle return' };
      case 'fresh_start':
        return { num: '0', lbl: 'fresh start' };
      case 'returned':
        return { num: String(streak.current), lbl: 'new count' };
      case 'open':
        return { num: String(streak.current), lbl: 'locks in today' };
      default:
        return {
          num: String(streak.current),
          lbl: streak.current === 0 ? 'start a streak' : `${daysWord(streak.current)} in a row`
        };
    }
  }
  switch (streak.status) {
    case 'empty':
      return { num: '0', lbl: 'нет серии' };
    case 'soft_return':
      return { num: '0', lbl: 'мягкий возврат' };
    case 'fresh_start':
      return { num: '0', lbl: 'новый заход' };
    case 'returned':
      return { num: String(streak.current), lbl: 'новый отсчёт' };
    case 'open':
      return { num: String(streak.current), lbl: 'сегодня закрепит' };
    default:
      return {
        num: String(streak.current),
        lbl: streak.current === 0 ? 'начни серию' : `${daysWord(streak.current)} подряд`
      };
  }
}

export function renderStreakChip(snap: ContinuitySnapshot, variant: 'pill' | 'badge' = 'pill'): string {
  const cap = streakChipCaption(snap.streak);
  const label = streakAriaLabel(snap.streak);
  if (variant === 'badge') {
    return `<span class="habit-chip-num" aria-hidden="true">${cap.num}</span>`;
  }
  return `
    <div class="stat-pill habit-chip" data-status="${snap.streak.status}" aria-label="${label}">
      <div class="stat-num">${cap.num}</div>
      <div class="stat-lbl">${cap.lbl}</div>
    </div>
  `;
}

export function renderContinuityHint(
  snap: ContinuitySnapshot,
  screen: 'today' | 'stats' | 'settings'
): string {
  if (screen === 'settings') return renderSettingsHint(snap);

  const body = hintBody(snap, screen);
  const meter =
    screen === 'stats' && snap.weekly.sufficient
      ? renderMeter(snap.weekly.score)
      : '';

  return `
    <div class="continuity-hint" role="status" data-status="${snap.streak.status}">
      <div class="continuity-hint-kicker">${L('Непрерывность', 'Continuity')}</div>
      <p class="continuity-hint-body">${body}</p>
      ${meter}
    </div>
  `;
}

function hintBody(snap: ContinuitySnapshot, screen: 'today' | 'stats'): string {
  const { streak, weekly, ritual, timeZoneSource } = snap;
  if (getLocale() === 'en') {
    const zoneNote =
      timeZoneSource === 'utc-fallback'
        ? ' Day is tracked in UTC — Europe/Moscow timezone is unavailable in this environment.'
        : '';

    if (streak.status === 'empty') {
      return `After a few days, your habit rhythm will appear here: streak count and a 0–1 score. No IQ tropes, no "brain age".${zoneNote}`;
    }

    if (streak.status === 'soft_return') {
      return `A short break is completely normal. Your progress stays with you. Next step: ${familiarPhrase(ritual)} to get back into rhythm.${zoneNote}`;
    }

    if (streak.status === 'fresh_start') {
      return `A fresh start. Your accumulated skills remain with you. Next step: complete today’s session at a comfortable pace.${zoneNote}`;
    }

    if (streak.status === 'returned') {
      return `Welcome back! New streak count: ${streak.current}. Continue training at your own pace.${zoneNote}`;
    }

    if (weekly.sufficient) {
      const gaps =
        weekly.gapCount === 0
          ? 'no gaps in window'
          : weekly.gapCount === 1
            ? 'one break in window'
            : `${weekly.gapCount} breaks in window`;
      const extra =
        screen === 'stats'
          ? ` ${weekly.completedDays} of ${weekly.eligibleDays} days, ${gaps}.`
          : '';
      return `Weekly continuity: ${scoreText(weekly.score)} out of 1. Session days share minus break penalty.${extra} Not a score of ability.${zoneNote}`;
    }

    if (streak.status === 'open') {
      return `Streak of ${streak.current} ${daysWord(streak.current)} is active — today’s ritual will keep it going.${zoneNote}`;
    }

    return `Streak of ${streak.current} ${daysWord(streak.current)} in a row. Weekly score will appear after a few days.${zoneNote}`;
  }

  const zoneNote =
    timeZoneSource === 'utc-fallback'
      ? ' День считается в UTC — зона Europe/Moscow в этой среде недоступна.'
      : '';

  if (streak.status === 'empty') {
    return `После нескольких дней здесь появится ритм привычки: серия подряд и оценка 0–1. Это не IQ и не «возраст мозга».${zoneNote}`;
  }

  if (streak.status === 'soft_return') {
    return `Небольшая пауза — это нормально. Навык остаётся с вами. Ваш следующий шаг: ${familiarPhrase(ritual)}, чтобы вернуться в ритм.${zoneNote}`;
  }

  if (streak.status === 'fresh_start') {
    return `Новый заход. Накопленный навык остаётся с вами. Следующий шаг: пройдите сегодняшнюю сессию в комфортном темпе.${zoneNote}`;
  }

  if (streak.status === 'returned') {
    return `С возвращением! Новый отсчёт серии: ${streak.current}. Продолжайте тренировки в своём темпе.${zoneNote}`;
  }

  if (weekly.sufficient) {
    const gaps =
      weekly.gapCount === 0
        ? 'дыр в окне нет'
        : weekly.gapCount === 1
          ? 'одна пауза в окне'
          : `${weekly.gapCount} паузы в окне`;
    const extra =
      screen === 'stats'
        ? ` ${weekly.completedDays} из ${weekly.eligibleDays} дней, ${gaps}.`
        : '';
    return `Непрерывность недели: ${scoreText(weekly.score)} из 1. Доля дней с сессией минус штраф за паузы.${extra} Не оценка способностей.${zoneNote}`;
  }

  if (streak.status === 'open') {
    return `Серия ${streak.current} ${daysWord(streak.current)} пока жива — сегодняшний ритуал её продолжит.${zoneNote}`;
  }

  return `Серия ${streak.current} ${daysWord(streak.current)} подряд. Оценка недели появится после нескольких дней ритуала.${zoneNote}`;
}

function renderMeter(score: number): string {
  const pct = Math.round(score * 100);
  const aria = L(`Непрерывность недели ${scoreText(score)} из 1`, `Weekly continuity ${scoreText(score)} out of 1`);
  return `
    <div class="continuity-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${aria}">
      <div class="continuity-meter-fill" style="width: ${pct}%;"></div>
    </div>
  `;
}

function renderSettingsHint(snap: ContinuitySnapshot): string {
  const zone =
    snap.timeZoneSource === 'utc-fallback'
      ? 'Календарный день сейчас считается в UTC: зона Europe/Moscow недоступна в этой среде.'
      : `Календарный день считается в зоне ${snap.timeZone} (не в UTC, если полночь расходится).`;
  const cap = streakChipCaption(snap.streak);
  const weeklyLine = snap.weekly.sufficient
    ? `Сейчас ${scoreText(snap.weekly.score)} из 1 (${snap.weekly.completedDays} из ${snap.weekly.eligibleDays} дней).`
    : 'Индекс появится после четырёх дней с первой сессии.';

  return `
    <div class="continuity-hint continuity-hint-settings" role="region" aria-label="Как устроены серия и непрерывность">
      <div class="continuity-hint-kicker">Серия и непрерывность</div>
      <p class="continuity-hint-body">
        Серия — подряд идущие календарные дни с сессией. Сейчас: ${cap.num} · ${cap.lbl}.
        Пропуск дня обнуляет счётчик без дополнительных условий.
      </p>
      <p class="continuity-hint-body">
        После паузы 1–2 дня Fokus предлагает более короткий знакомый блок (до 5 минут), без навёрстывания.
      </p>
      <p class="continuity-hint-body">
        Непрерывность недели — число от 0 до 1: доля дней с сессией минус небольшой штраф за дыры.
        ${weeklyLine}
        Это ритм привычки, не IQ, не «возраст мозга» и не чудо-прогресс.
      </p>
      <p class="continuity-hint-meta">${zone}</p>
    </div>
  `;
}
