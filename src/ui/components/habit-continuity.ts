import type { ContinuitySnapshot, GentleReturn } from '../../core/continuity';
import { domainLabel } from '../../core/labels';
import type { DayStreak } from '../../core/streak';
import { L, getLocale } from '../../core/i18n';

function daysWord(n: number): string {
  if (getLocale() === 'en') return n === 1 ? 'day' : 'days';
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
  const isEn = getLocale() === 'en';
  const names = ritual.familiarDomains
    .slice(0, 2)
    .map((id) => domainLabel(id))
    .filter(Boolean);
  if (names.length === 0) return isEn ? 'short familiar block' : 'короткий знакомый блок';
  return isEn ? `short block: ${names.join(' and ')}` : `короткий блок: ${names.join(' и ')}`;
}

export function streakAriaLabel(streak: DayStreak): string {
  const isEn = getLocale() === 'en';
  if (streak.status === 'empty') return isEn ? 'No streak yet' : 'Серии пока нет';
  if (streak.status === 'soft_return') {
    return isEn ? 'Short pause. Getting back into rhythm.' : `Короткая пауза. Возвращайтесь в ритм.`;
  }
  if (streak.status === 'fresh_start') return isEn ? 'Fresh start. Streak begins with today’s session' : 'Новый заход. Серия начнётся с сегодняшней сессии';
  if (streak.status === 'returned') {
    return isEn ? `Streak: ${streak.current} ${daysWord(streak.current)}. Fresh count after a short break` : `Серия ${streak.current} ${daysWord(streak.current)}. Новый отсчёт после короткой паузы`;
  }
  if (streak.status === 'open') {
    return isEn ? `Streak: ${streak.current} ${daysWord(streak.current)} in a row. Today locks in the habit` : `Серия ${streak.current} ${daysWord(streak.current)} подряд. Сегодня закрепит ритуал`;
  }
  return isEn ? `Streak: ${streak.current} ${daysWord(streak.current)} in a row` : `Серия ${streak.current} ${daysWord(streak.current)} подряд`;
}

export function streakChipCaption(streak: DayStreak): { num: string; lbl: string } {
  const isEn = getLocale() === 'en';
  switch (streak.status) {
    case 'empty':
      return { num: '0', lbl: isEn ? 'no streak' : 'нет серии' };
    case 'soft_return':
      return { num: '0', lbl: isEn ? 'soft return' : 'мягкий возврат' };
    case 'fresh_start':
      return { num: '0', lbl: isEn ? 'fresh start' : 'новый заход' };
    case 'returned':
      return { num: String(streak.current), lbl: isEn ? 'fresh count' : 'новый отсчёт' };
    case 'open':
      return { num: String(streak.current), lbl: isEn ? 'lock in today' : 'сегодня закрепит' };
    default:
      return {
        num: String(streak.current),
        lbl: streak.current === 0 ? (isEn ? 'start streak' : 'начни серию') : (isEn ? `${daysWord(streak.current)} in a row` : `${daysWord(streak.current)} подряд`)
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
  const isEn = getLocale() === 'en';
  const { streak, weekly, ritual, timeZoneSource } = snap;
  const zoneNote =
    timeZoneSource === 'utc-fallback'
      ? (isEn ? ' Days are counted in UTC — Europe/Moscow zone is unavailable here.' : ' День считается в UTC — зона Europe/Moscow в этой среде недоступна.')
      : '';

  if (streak.status === 'empty') {
    return isEn
      ? `After a few days, your habit rhythm will appear here: streak and a 0–1 score. Not IQ or "brain age".${zoneNote}`
      : `После нескольких дней здесь появится ритм привычки: серия подряд и оценка 0–1. Это не IQ и не «возраст мозга».${zoneNote}`;
  }

  if (streak.status === 'soft_return') {
    return isEn
      ? `A brief pause is fine. Your skill stays with you. Next step: ${familiarPhrase(ritual)} to get back in rhythm.${zoneNote}`
      : `Небольшая пауза — это нормально. Навык остаётся с вами. Ваш следующий шаг: ${familiarPhrase(ritual)}, чтобы вернуться в ритм.${zoneNote}`;
  }

  if (streak.status === 'fresh_start') {
    return isEn
      ? `Fresh start. Your built skill stays with you. Next step: complete today’s session at a comfortable pace.${zoneNote}`
      : `Новый заход. Накопленный навык остаётся с вами. Следующий шаг: пройдите сегодняшнюю сессию в комфортном темпе.${zoneNote}`;
  }

  if (streak.status === 'returned') {
    return isEn
      ? `Welcome back! Streak restarted: ${streak.current}. Keep training at your own pace.${zoneNote}`
      : `С возвращением! Новый отсчёт серии: ${streak.current}. Продолжайте тренировки в своём темпе.${zoneNote}`;
  }

  if (weekly.sufficient) {
    const gaps = isEn
      ? (weekly.gapCount === 0 ? 'no gaps in window' : weekly.gapCount === 1 ? 'one pause in window' : `${weekly.gapCount} pauses in window`)
      : (weekly.gapCount === 0 ? 'дыр в окне нет' : weekly.gapCount === 1 ? 'одна пауза в окне' : `${weekly.gapCount} паузы в окне`);
    const extra =
      screen === 'stats'
        ? (isEn ? ` ${weekly.completedDays} of ${weekly.eligibleDays} days, ${gaps}.` : ` ${weekly.completedDays} из ${weekly.eligibleDays} дней, ${gaps}.`)
        : '';
    return isEn
      ? `Weekly continuity: ${scoreText(weekly.score)} of 1. Days trained minus gap penalty.${extra} Not an ability rating.${zoneNote}`
      : `Непрерывность недели: ${scoreText(weekly.score)} из 1. Доля дней с сессией минус штраф за паузы.${extra} Не оценка способностей.${zoneNote}`;
  }

  if (streak.status === 'open') {
    return isEn
      ? `Streak of ${streak.current} ${daysWord(streak.current)} is active — today's session will keep it going.${zoneNote}`
      : `Серия ${streak.current} ${daysWord(streak.current)} пока жива — сегодняшний ритуал её продолжит.${zoneNote}`;
  }

  return isEn
    ? `Streak of ${streak.current} ${daysWord(streak.current)} in a row. Weekly score appears after a few days.${zoneNote}`
    : `Серия ${streak.current} ${daysWord(streak.current)} подряд. Оценка недели появится после нескольких дней ритуала.${zoneNote}`;
}

function renderMeter(score: number): string {
  const pct = Math.round(score * 100);
  return `
    <div class="continuity-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${L(`Непрерывность недели ${scoreText(score)} из 1`, `Weekly continuity ${scoreText(score)} of 1`)}">
      <div class="continuity-meter-fill" style="width: ${pct}%;"></div>
    </div>
  `;
}

function renderSettingsHint(snap: ContinuitySnapshot): string {
  const isEn = getLocale() === 'en';
  const zone =
    snap.timeZoneSource === 'utc-fallback'
      ? (isEn ? 'Civil day is counted in UTC: Europe/Moscow timezone is unavailable.' : 'Календарный день сейчас считается в UTC: зона Europe/Moscow недоступна в этой среде.')
      : (isEn ? `Civil day is counted in timezone ${snap.timeZone} (not in UTC if midnight differs).` : `Календарный день считается в зоне ${snap.timeZone} (не в UTC, если полночь расходится).`);
  const cap = streakChipCaption(snap.streak);
  const weeklyLine = snap.weekly.sufficient
    ? (isEn ? `Currently ${scoreText(snap.weekly.score)} of 1 (${snap.weekly.completedDays} of ${snap.weekly.eligibleDays} days).` : `Сейчас ${scoreText(snap.weekly.score)} из 1 (${snap.weekly.completedDays} из ${snap.weekly.eligibleDays} дней).`)
    : (isEn ? 'Index appears after 4 days from first session.' : 'Индекс появится после четырёх дней с первой сессии.');

  return `
    <div class="continuity-hint continuity-hint-settings" role="region" aria-label="${L('Как устроены серия и непрерывность', 'How streak and continuity work')}">
      <div class="continuity-hint-kicker">${L('Серия и непрерывность', 'Streak and continuity')}</div>
      <p class="continuity-hint-body">
        ${isEn
          ? `Streak is consecutive calendar days with a session. Current: ${cap.num} · ${cap.lbl}. A missed day resets the counter without exceptions.`
          : `Серия — подряд идущие календарные дни с сессией. Сейчас: ${cap.num} · ${cap.lbl}. Пропуск дня обнуляет счётчик без дополнительных условий.`}
      </p>
      <p class="continuity-hint-body">
        ${isEn
          ? 'After a 1–2 day pause, Fokus offers a shorter familiar block (under 5 minutes), no catching up.'
          : 'После паузы 1–2 дня Fokus предлагает более короткий знакомый блок (до 5 минут), без навёрстывания.'}
      </p>
      <p class="continuity-hint-body">
        ${isEn
          ? `Weekly continuity is a number from 0 to 1: fraction of days trained minus a small gap penalty. ${weeklyLine} This is habit rhythm, not IQ, "brain age", or miraculous progress.`
          : `Непрерывность недели — число от 0 до 1: доля дней с сессией минус небольшой штраф за дыры. ${weeklyLine} Это ритм привычки, не IQ, не «возраст мозга» и не чудо-прогресс.`}
      </p>
      <p class="continuity-hint-meta">${zone}</p>
    </div>
  `;
}
