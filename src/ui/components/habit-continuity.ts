import type { ContinuitySnapshot, GentleReturn } from '../../core/continuity';
import { domainLabel } from '../../core/labels';
import type { DayStreak } from '../../core/streak';

function daysWord(n: number): string {
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
  if (names.length === 0) return 'короткий знакомый блок';
  return `короткий блок: ${names.join(' и ')}`;
}

export function streakAriaLabel(streak: DayStreak): string {
  if (streak.status === 'empty') return 'Серии пока нет';
  if (streak.status === 'soft_return') {
    return `Пауза ${streak.openMisses} ${daysWord(streak.openMisses)}. Серия считается заново — без штрафа.`;
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
      <div class="continuity-hint-kicker">Непрерывность</div>
      <p class="continuity-hint-body">${body}</p>
      ${meter}
    </div>
  `;
}

function hintBody(snap: ContinuitySnapshot, screen: 'today' | 'stats'): string {
  const { streak, weekly, ritual, timeZoneSource } = snap;
  const zoneNote =
    timeZoneSource === 'utc-fallback'
      ? ' День считается в UTC — зона Europe/Moscow в этой среде недоступна.'
      : '';

  if (streak.status === 'empty') {
    return `После нескольких дней здесь появится ритм привычки: серия подряд и оценка 0–1. Это не IQ и не «возраст мозга».${zoneNote}`;
  }

  if (streak.status === 'soft_return') {
    const miss = `${ritual.openMisses} ${daysWord(ritual.openMisses)}`;
    return `Пауза ${miss} — обычная история. Сегодня ${familiarPhrase(ritual)}, без навёрстывания и без «заморозки серии».${zoneNote}`;
  }

  if (streak.status === 'fresh_start') {
    return `Новый заход. Серия считает только дни подряд — короткий перерыв её обнуляет, но ничего не «штрафует».${zoneNote}`;
  }

  if (streak.status === 'returned') {
    return `С возвращением. Серия снова с ${streak.current} — честный отсчёт, без купленной заморозки.${zoneNote}`;
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
  return `
    <div class="continuity-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Непрерывность недели ${scoreText(score)} из 1">
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
        Пропуск обнуляет счётчик. Это не штраф и не «заморозка серии» из платных приложений.
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
