/**
 * Ritual / day copy intelligence (G20).
 *
 * Pure template catalog + situation picker. No DOM, no storage, no exercises.
 * Screens render the result; they do not invent sentences.
 */

export type CopySituation =
  | 'uncalibrated'
  | 'fatigue_rest'
  | 'day_done'
  | 'post_miss_forgiven'
  | 'post_miss_comeback'
  | 'fatigue_pre'
  | 'streak_milestone'
  | 'streak_fragile'
  | 'streak_building'
  | 'domain_wait'
  | 'chrono_window'
  | 'focus_day'
  | 'streak_hold'
  | 'science_default';

export type CopyTone = 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';

export type RecoveryTone = 'rest-light' | 'steady' | 'push-hard';

export const SITUATION_PRIORITY: CopySituation[] = [
  'uncalibrated',
  'fatigue_rest',
  'day_done',
  'post_miss_forgiven',
  'post_miss_comeback',
  'fatigue_pre',
  'streak_milestone',
  'streak_fragile',
  'streak_building',
  'domain_wait',
  'chrono_window',
  'focus_day',
  'streak_hold',
  'science_default'
];

export const MILESTONE_STREAKS = [7, 14, 30] as const;

/** Claims and FOMO we never emit. Tests scan the catalog against this. */
export const FORBIDDEN_COPY_RE =
  /повышает IQ|вырастет IQ|станет гением|гарантированно|лечит СДВГ|прокачает мозг|прокачай мозг|супермозг|нейрофитнес|возраст мозга|не пропусти|last chance|you're on fire|you’re on fire|отработай|штраф/i;

export interface RitualCopyInput {
  calibrated: boolean;
  playedToday: boolean;
  streak: number;
  skippedYesterday?: boolean;
  historyDays?: number;
  gapDays?: number;
  fatigueScore?: number;
  neglectScore?: number;
  recovery?: RecoveryTone | null;
  loadEwma?: number;
  lastQuality?: number | null;
  hour?: number;
  /** Display label already resolved (e.g. «Внимание»). */
  domain?: string;
  minutes?: number;
  chrono?: string;
  chronoMatch?: boolean;
  asOf?: Date | string;
  /** Optional anti-repeat: skip this catalog id if another variant exists. */
  lastTemplateId?: string;
}

export interface RitualCopySlots {
  streak: number;
  streakDays: string;
  domain: string;
  minutes: number;
  chrono: string;
  gapDays: string;
}

export interface CopyTemplate {
  id: string;
  situation: CopySituation;
  tone: CopyTone;
  title: string;
  body: string;
  cardKicker?: string;
  cardTitle?: string;
  cardBody?: string;
}

export interface RitualCopy {
  situation: CopySituation;
  templateId: string;
  tone: CopyTone;
  title: string;
  body: string;
  cardKicker: string;
  cardTitle: string;
  cardBody: string;
  reason: string;
  slots: RitualCopySlots;
}

const FATIGUE_LOUD = 55;
const NEGLECT_LOUD = 70;
const LOAD_REST = 68;
const EVENING_HOUR = 16;

export function ruCount(n: number, one: string, few: string, many: string): string {
  const n10 = Math.abs(n) % 10;
  const n100 = Math.abs(n) % 100;
  if (n10 === 1 && n100 !== 11) return `${n} ${one}`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function asDate(value?: Date | string): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

export function localDayKey(value?: Date | string): string {
  const d = asDate(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fillSlots(template: string, slots: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = slots[key];
    return v == null ? '' : String(v);
  });
}

export function slotKeysOf(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

function templateNeeds(t: CopyTemplate): string[] {
  return [
    ...slotKeysOf(t.title),
    ...slotKeysOf(t.body),
    ...slotKeysOf(t.cardKicker || ''),
    ...slotKeysOf(t.cardTitle || ''),
    ...slotKeysOf(t.cardBody || '')
  ];
}

function asSlotMap(slots: RitualCopySlots): Record<string, string | number> {
  return {
    streak: slots.streak,
    streakDays: slots.streakDays,
    domain: slots.domain,
    minutes: slots.minutes,
    chrono: slots.chrono,
    gapDays: slots.gapDays
  };
}

function slotsReady(needed: string[], slots: RitualCopySlots): boolean {
  const map = asSlotMap(slots);
  return needed.every((k) => {
    const v = map[k];
    if (v == null) return false;
    if (typeof v === 'string') return v.length > 0;
    return true;
  });
}

export function buildSlots(input: RitualCopyInput): RitualCopySlots {
  const streak = Math.max(0, input.streak || 0);
  const minutes = input.minutes && input.minutes > 0 ? Math.round(input.minutes) : 5;
  const gap = Math.max(0, input.gapDays || 0);
  return {
    streak,
    streakDays: ruCount(streak, 'день', 'дня', 'дней'),
    domain: input.domain || '',
    minutes,
    chrono: input.chrono || '',
    gapDays: gap > 0 ? ruCount(gap, 'день', 'дня', 'дней') : ''
  };
}

export function isFatigued(input: RitualCopyInput): boolean {
  if ((input.fatigueScore ?? 0) >= FATIGUE_LOUD) return true;
  if (input.recovery === 'rest-light' && input.playedToday && (input.lastQuality ?? 100) < 62) return true;
  return false;
}

export function isPendingForgivenMiss(input: RitualCopyInput): boolean {
  if (input.playedToday) return false;
  if (input.skippedYesterday && input.streak > 0) return true;
  if ((input.gapDays ?? 0) === 2 && (input.historyDays ?? 0) > 0) return true;
  return false;
}

export function pickSituation(input: RitualCopyInput): { situation: CopySituation; reason: string } {
  if (!input.calibrated) {
    return { situation: 'uncalibrated', reason: 'no-calibration' };
  }
  if (input.playedToday && isFatigued(input)) {
    return { situation: 'fatigue_rest', reason: `fatigue=${input.fatigueScore ?? 'gate'}` };
  }
  if (input.playedToday) {
    return { situation: 'day_done', reason: 'played-today' };
  }
  if (isPendingForgivenMiss(input)) {
    return { situation: 'post_miss_forgiven', reason: `forgiven gap=${input.gapDays ?? 1} streak=${input.streak}` };
  }
  if ((input.historyDays ?? 0) > 0 && (input.streak === 0 || (input.gapDays ?? 0) >= 3)) {
    return { situation: 'post_miss_comeback', reason: `comeback gap=${input.gapDays ?? 'n/a'}` };
  }
  if (input.recovery === 'rest-light' || (input.loadEwma ?? 0) >= LOAD_REST) {
    return { situation: 'fatigue_pre', reason: `recovery=${input.recovery ?? 'load'} load=${input.loadEwma ?? 0}` };
  }
  if ((MILESTONE_STREAKS as readonly number[]).includes(input.streak)) {
    return { situation: 'streak_milestone', reason: `milestone=${input.streak}` };
  }
  const hour = input.hour ?? asDate(input.asOf).getHours();
  if (input.streak >= 7 && hour >= EVENING_HOUR) {
    return { situation: 'streak_fragile', reason: `streak=${input.streak} hour=${hour}` };
  }
  if (input.streak >= 2 && input.streak < 7) {
    return { situation: 'streak_building', reason: `streak=${input.streak}` };
  }
  if ((input.neglectScore ?? 0) >= NEGLECT_LOUD && input.domain) {
    return { situation: 'domain_wait', reason: `neglect=${input.neglectScore}` };
  }
  if (input.chronoMatch && input.chrono) {
    return { situation: 'chrono_window', reason: `chrono=${input.chrono}` };
  }
  if (input.domain) {
    return { situation: 'focus_day', reason: `domain=${input.domain}` };
  }
  if (input.streak >= 7) {
    return { situation: 'streak_hold', reason: `streak=${input.streak}` };
  }
  return { situation: 'science_default', reason: 'default' };
}

export const COPY_TEMPLATES: CopyTemplate[] = [
  // — uncalibrated —
  {
    id: 'uncal-setup',
    situation: 'uncalibrated',
    tone: 'start',
    title: 'Сначала настройка',
    body: '90 секунд калибровки — и Fokus подстроит сложность под вас, а не наоборот.',
    cardKicker: 'Первый шаг',
    cardTitle: 'Калибровка уровня',
    cardBody: 'Короткие блоки, стартовая сложность. Это настройка, не экзамен.'
  },
  {
    id: 'uncal-short',
    situation: 'uncalibrated',
    tone: 'start',
    title: 'Короткий старт',
    body: 'Калибровка занимает полторы минуты. Fokus подберёт уровень по ответам, без сравнения с другими.',
    cardKicker: 'Первый шаг',
    cardTitle: 'Калибровка уровня',
    cardBody: 'Полторы минуты — и появится персональный ритуал.'
  },
  {
    id: 'uncal-one-step',
    situation: 'uncalibrated',
    tone: 'start',
    title: 'Один шаг до ритуала',
    body: 'После калибровки Fokus соберёт сессию под вас. Оценка — черновик сложности, не диагноз.',
    cardKicker: 'Первый шаг',
    cardTitle: 'Калибровка уровня',
    cardBody: 'Сначала короткая настройка, потом обычный ритуал.'
  },

  // — fatigue after playing —
  {
    id: 'fat-rest-form',
    situation: 'fatigue_rest',
    tone: 'habit',
    title: 'Форма уже есть',
    body: 'Ещё один заход сегодня скорее смажет точность, чем усилит навык. Завтра ритуал будет чище.',
    cardKicker: 'Сегодня',
    cardTitle: 'План выполнен',
    cardBody: 'Дополнительный заход сейчас не обязателен. Завтрашний ритуал будет чище.'
  },
  {
    id: 'fat-rest-enough',
    situation: 'fatigue_rest',
    tone: 'habit',
    title: 'Хватит на сегодня',
    body: 'Нагрузка высокая. Лучше остановиться, чем дожимать. Завтра сложность снова попадёт в зону.',
    cardKicker: 'Сегодня',
    cardTitle: 'План выполнен',
    cardBody: 'Усталость уже видна. Завтра короткий подход сильнее второго захода сейчас.'
  },
  {
    id: 'fat-rest-clean',
    situation: 'fatigue_rest',
    tone: 'habit',
    title: 'Чисто важнее длинно',
    body: 'По сессии уже видно утомление. Короткий отдых до завтра сохранит ритм лучше марафона.',
    cardKicker: 'Сегодня',
    cardTitle: 'План выполнен',
    cardBody: 'Ритуал закрыт. Завтра Fokus соберёт более чистый подход.'
  },

  // — day done —
  {
    id: 'done-plan',
    situation: 'day_done',
    tone: 'habit',
    title: 'План выполнен',
    body: 'Когнитивные навыки растут от регулярности, не от марафонов. Завтра Fokus соберёт новую сессию.',
    cardKicker: 'Сегодня',
    cardTitle: 'План выполнен',
    cardBody: 'Дополнительная сессия не ломает прогресс — но лучший эффект даёт завтрашний ритуал.'
  },
  {
    id: 'done-closed',
    situation: 'day_done',
    tone: 'habit',
    title: 'Ритуал закрыт',
    body: 'Сегодняшнее уже сделано. Завтра короткий подход сильнее, чем ещё один сейчас.',
    cardKicker: 'Сегодня',
    cardTitle: 'Ритуал закрыт',
    cardBody: 'Привычка держится ритмом. Завтрашний ритуал важнее второго захода.'
  },
  {
    id: 'done-enough',
    situation: 'day_done',
    tone: 'habit',
    title: 'На сегодня достаточно',
    body: 'Короткий ежедневный ритуал делает своё дело. Завтра — новый набор блоков, без дожима сегодня.',
    cardKicker: 'Сегодня',
    cardTitle: 'План выполнен',
    cardBody: 'Лучший следующий шаг — завтра, а не ещё одна сессия сейчас.'
  },

  // — forgiven miss —
  {
    id: 'miss-held',
    situation: 'post_miss_forgiven',
    tone: 'recovery',
    title: 'Серия на месте',
    body: 'Один пропуск Fokus уже простил. Пять минут сегодня закрепят привычку сильнее, чем час раз в неделю.',
    cardKicker: 'Серия на месте',
    cardTitle: 'Короткий ритуал',
    cardBody: 'Вчерашний пропуск уже закрыт. Навёрстывать не нужно — сегодня обычный подход.'
  },
  {
    id: 'miss-kept',
    situation: 'post_miss_forgiven',
    tone: 'recovery',
    title: 'Пропуск не обнуляет',
    body: 'Один день без сессии Fokus уже заложил. Сегодня просто обычный ритуал — навёрстывать вчера не нужно.',
    cardKicker: 'После пропуска',
    cardTitle: 'Обычный ритуал',
    cardBody: 'Серия жива. Короткий блок сегодня важнее длинного нагона.'
  },
  {
    id: 'miss-near',
    situation: 'post_miss_forgiven',
    tone: 'recovery',
    title: 'Ритм рядом',
    body: 'Один пропущенный день уже заложен. Короткий блок сегодня важнее любой попытки нагнать объём.',
    cardKicker: 'Серия на месте',
    cardTitle: 'Короткий ритуал',
    cardBody: 'Пропуск прощён. Сегодня {minutes} минут — и ритм снова ровный.'
  },

  // — comeback after a real gap —
  {
    id: 'back-easier',
    situation: 'post_miss_comeback',
    tone: 'recovery',
    title: 'Вернуться легче, чем начать',
    body: 'Короткий блок внимания вернёт ритм. Не нужно навёрстывать пропущенные дни.',
    cardKicker: 'Короткий возврат',
    cardTitle: 'С сегодняшнего дня',
    cardBody: 'Пауза не обнуляет навык. Пять минут сегодня важнее любой отработки.'
  },
  {
    id: 'back-today',
    situation: 'post_miss_comeback',
    tone: 'recovery',
    title: 'С сегодняшнего дня',
    body: 'Пауза не обнуляет навык. Пять минут сегодня важнее накопленных пропусков.',
    cardKicker: 'Короткий возврат',
    cardTitle: 'Вернуться',
    cardBody: 'Пропущенные дни не копим. Короткий ритуал — нормальный возврат.'
  },
  {
    id: 'back-gap',
    situation: 'post_miss_comeback',
    tone: 'recovery',
    title: 'Ритм с нуля не нужен',
    body: 'Пауза в {gapDays} не сбрасывает навык. Короткий ритуал сегодня — без навёрстывания.',
    cardKicker: 'Короткий возврат',
    cardTitle: 'Снова короткий формат',
    cardBody: 'Не копим пропуски и не удлиняем сессию «за все дни сразу».'
  },

  // — pre-session fatigue / rest-light —
  {
    id: 'pre-shorter',
    situation: 'fatigue_pre',
    tone: 'recovery',
    title: 'Сегодня короче',
    body: 'Последние ритуалы были плотными. Короткий подход сохранит форму лучше длинного захода.',
    cardKicker: 'Сегодня легче',
    cardTitle: 'Короткий ритуал',
    cardBody: 'Нагрузка высокая. Короткий ритуал — нормальный выбор, не откат.'
  },
  {
    id: 'pre-light',
    situation: 'fatigue_pre',
    tone: 'recovery',
    title: 'Лёгкий день',
    body: 'Нагрузка за последние дни высокая. Короткий ритуал — нормальный выбор, не откат.',
    cardKicker: 'Сегодня короче',
    cardTitle: 'Лёгкий день',
    cardBody: 'Пять минут в спокойном темпе лучше, чем дожимать вчерашний объём.'
  },
  {
    id: 'pre-hold',
    situation: 'fatigue_pre',
    tone: 'recovery',
    title: 'Без дожима',
    body: 'Качество на фоне нагрузки просело. Сегодня лучше короче и без гонки за сложностью.',
    cardKicker: 'Сегодня легче',
    cardTitle: 'Спокойный ритуал',
    cardBody: 'Форма держится ритмом. Короткий подход сегодня — это не шаг назад.'
  },

  // — streak milestones 7 / 14 / 30 —
  {
    id: 'mile-days',
    situation: 'streak_milestone',
    tone: 'habit',
    title: '{streakDays} подряд',
    body: 'Регулярность важнее интенсивности: короткая сессия каждый день сильнее редких длинных.',
    cardKicker: 'Тренировка дня',
    cardTitle: '{streakDays} подряд',
    cardBody: 'Отметка серии — про привычку, не про рекорд. Сегодня обычный ритуал.'
  },
  {
    id: 'mile-mark',
    situation: 'streak_milestone',
    tone: 'habit',
    title: 'Отметка {streak}',
    body: 'Серия — про привычку, не про рекорд. Сегодня обычный ритуал, без марафона.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Обычный ритуал',
    cardBody: '{streakDays} уже есть. Короткий подход закрепляет ритм лучше длинного забега.'
  },
  {
    id: 'mile-rhythm',
    situation: 'streak_milestone',
    tone: 'habit',
    title: '{streakDays} ритма',
    body: 'Это привычка короткого ритуала, не зал для мозга. Сегодня тот же формат, что вчера.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Держать формат',
    cardBody: 'Отметку не нужно «отмечать» часом. {minutes} минут достаточно.'
  },

  // — long streak, evening, not played —
  {
    id: 'frag-with-you',
    situation: 'streak_fragile',
    tone: 'habit',
    title: 'Серия ещё с вами',
    body: 'Fokus не считает поздний вечер провалом. Короткий блок закрепит ритм без марафона.',
    cardKicker: 'Короткий вечер',
    cardTitle: 'Серия на месте',
    cardBody: 'Поздний час не ломает серию. {minutes} минут спокойнее, чем откладывать на «когда-нибудь».'
  },
  {
    id: 'frag-shorter',
    situation: 'streak_fragile',
    tone: 'habit',
    title: 'Короче обычного',
    body: '{streakDays} уже есть. Вечерний короткий ритуал достаточный — паника не нужна.',
    cardKicker: 'Короткий вечер',
    cardTitle: 'Короче обычного',
    cardBody: 'Серия держится привычкой. Короткий блок сегодня — нормально.'
  },
  {
    id: 'frag-return',
    situation: 'streak_fragile',
    tone: 'habit',
    title: 'Короткий возврат',
    body: 'Поздний час не обнуляет {streakDays}. Пять минут сейчас закрепят ритм без гонки.',
    cardKicker: 'Серия на месте',
    cardTitle: 'Короткий блок',
    cardBody: 'Fokus прощает один пропуск. Сегодня можно короче обычного.'
  },

  // — early streak 2–6 —
  {
    id: 'build-count',
    situation: 'streak_building',
    tone: 'habit',
    title: 'Ритм копится',
    body: 'Уже {streakDays} подряд. Короткий ритуал сегодня закрепит привычку без гонки.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'День за днём',
    cardBody: 'Серия ещё короткая — так и должно быть. Регулярность важнее длины.'
  },
  {
    id: 'build-day',
    situation: 'streak_building',
    tone: 'habit',
    title: 'День за днём',
    body: 'Серия ещё короткая — так и должно быть. Регулярность важнее длины сессии.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Короткий ритуал',
    cardBody: 'Несколько дней подряд уже что-то значат. Сегодня тот же короткий формат.'
  },
  {
    id: 'build-habit',
    situation: 'streak_building',
    tone: 'habit',
    title: 'Привычка в работе',
    body: '{streakDays} подряд — это уже ритм, не подвиг. Сегодня обычные {minutes} минут.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Привычка в работе',
    cardBody: 'Не растягивайте сессию, потому что «пошло». Короткий формат и есть цель.'
  },

  // — neglected domain (loud signal from retention) —
  {
    id: 'dom-wait',
    situation: 'domain_wait',
    tone: 'focus',
    title: 'Область ждала',
    body: '«{domain}» давно не была в плане. Сегодня её можно подтянуть без отдельного марафона.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Сместить акцент',
    cardBody: 'Не отдельный курс — просто один блок «{domain}» в обычном ритуале.'
  },
  {
    id: 'dom-quiet',
    situation: 'domain_wait',
    tone: 'focus',
    title: 'Тихий домен',
    body: '«{domain}» давно не попадала в сессию. Короткий акцент сегодня, без навёрстывания недели.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Сегодня — {domain}',
    cardBody: 'Один акцент в обычной длительности. Ошибаться нормально.'
  },
  {
    id: 'dom-mix',
    situation: 'domain_wait',
    tone: 'focus',
    title: 'Смешать план',
    body: 'План можно чуть шире: «{domain}» ждала своего блока. Это баланс ритуала, не слабое место личности.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Чуть шире',
    cardBody: '«{domain}» вернётся в смесь сама. Не нужно отдельного марафона.'
  },

  // — chronotype window —
  {
    id: 'time-window',
    situation: 'chrono_window',
    tone: 'time',
    title: 'Ваше сильное окно',
    body: 'По прошлым сессиям вы сильнее {chrono}. Сегодня хорошее время для сложного блока.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Удачный час',
    cardBody: 'Сейчас ваше окно. Можно взять обычную длительность, без спешки.'
  },
  {
    id: 'time-hour',
    situation: 'chrono_window',
    tone: 'time',
    title: 'Удачный час',
    body: 'Обычно вы точнее {chrono}. Можно взять обычную длительность, без спешки.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Своё время',
    cardBody: 'Сильное окно — не повод удлинять сессию. Обычный ритуал достаточен.'
  },
  {
    id: 'time-own',
    situation: 'chrono_window',
    tone: 'time',
    title: 'Своё время',
    body: 'Сейчас ваше сильное окно ({chrono}). Сложность подстроится по точности — ошибаться нормально.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Ваше окно',
    cardBody: 'Хороший час для ритуала. Не обязательно сложнее обычного.'
  },

  // — focus of the day —
  {
    id: 'focus-day',
    situation: 'focus_day',
    tone: 'focus',
    title: 'Фокус дня',
    body: 'Сегодня упор на «{domain}». Сложность подстроится по точности — ошибаться нормально.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Сегодня — {domain}',
    cardBody: 'Один акцент, без марафона. Ошибки в зоне вызова — часть настройки.'
  },
  {
    id: 'focus-named',
    situation: 'focus_day',
    tone: 'focus',
    title: 'Сегодня — {domain}',
    body: 'Один акцент, без марафона. Ошибки в зоне вызова — часть настройки, не провал.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Узкий акцент',
    cardBody: 'В плане «{domain}». Перенос в быт скромный — зато задача на экране конкретная.'
  },
  {
    id: 'focus-narrow',
    situation: 'focus_day',
    tone: 'focus',
    title: 'Узкий акцент',
    body: 'В плане «{domain}». Перенос в быт скромный — зато задача на экране конкретная.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Фокус дня',
    cardBody: 'Сложность живая. Ошибаться нормально — так Fokus попадает в зону вызова.'
  },

  // — long streak, daytime, no other hook —
  {
    id: 'hold-still',
    situation: 'streak_hold',
    tone: 'habit',
    title: '{streakDays} подряд',
    body: 'Серия на месте. Fokus уже умеет прощать один пропуск — не разменивайте ритм на марафон.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Держать ритм',
    cardBody: 'Обычный короткий ритуал. Серию не нужно «защищать» длинной сессией.'
  },
  {
    id: 'hold-habit',
    situation: 'streak_hold',
    tone: 'habit',
    title: 'Ритм держится',
    body: '{streakDays} — это привычка, не рекордная таблица. Сегодня тот же короткий формат.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Обычный ритуал',
    cardBody: 'Регулярность важнее интенсивности. {minutes} минут достаточно.'
  },
  {
    id: 'hold-format',
    situation: 'streak_hold',
    tone: 'habit',
    title: 'Тот же формат',
    body: 'Серия жива, потому что ритуал короткий. Сегодня не удлиняйте его «за заслуги».',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Короткий ритуал',
    cardBody: '{streakDays} подряд уже есть. Обычный подход — лучший следующий шаг.'
  },

  // — default science voice —
  {
    id: 'sci-short',
    situation: 'science_default',
    tone: 'science',
    title: 'Короткий ритуал',
    body: 'Тренируем конкретные задачи. Перенос в жизнь скромный — зато привычка внимания остаётся.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Короткий ритуал',
    cardBody: 'Обычный набор блоков. Сложность подстроится по точности.'
  },
  {
    id: 'sci-five',
    situation: 'science_default',
    tone: 'science',
    title: 'Пять минут внимания',
    body: 'Fokus не обещает чудо. Короткая регулярная практика держит форму лучше редких забегов.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Пять минут внимания',
    cardBody: 'Конкретные задачи на экране. Без чуда и без марафона.'
  },
  {
    id: 'sci-task',
    situation: 'science_default',
    tone: 'science',
    title: 'Задача, не подвиг',
    body: 'Сегодня обычный ритуал. Сложность живая, ошибаться нормально, без сравнения с другими.',
    cardKicker: 'Тренировка дня',
    cardTitle: 'Обычный ритуал',
    cardBody: 'Короткий подход. Регулярность важнее длины.'
  }
];

const POOL: Record<CopySituation, CopyTemplate[]> = SITUATION_PRIORITY.reduce((acc, s) => {
  acc[s] = COPY_TEMPLATES.filter((t) => t.situation === s);
  return acc;
}, {} as Record<CopySituation, CopyTemplate[]>);

export function templatesFor(situation: CopySituation): CopyTemplate[] {
  return POOL[situation] || [];
}

export function eligibleTemplates(situation: CopySituation, slots: RitualCopySlots): CopyTemplate[] {
  return templatesFor(situation).filter((t) => slotsReady(templateNeeds(t), slots));
}

export function selectTemplate(
  situation: CopySituation,
  slots: RitualCopySlots,
  seed: string,
  lastTemplateId?: string
): CopyTemplate {
  const pool = eligibleTemplates(situation, slots);
  const fallbackPool = pool.length > 0 ? pool : templatesFor(situation);
  const catalog = fallbackPool.length > 0 ? fallbackPool : templatesFor('science_default');
  if (catalog.length === 0) {
    return COPY_TEMPLATES[COPY_TEMPLATES.length - 1];
  }
  let idx = hash32(`${seed}|${situation}`) % catalog.length;
  if (lastTemplateId && catalog.length > 1) {
    const same = catalog[idx]?.id === lastTemplateId;
    if (same) idx = (idx + 1) % catalog.length;
  }
  return catalog[idx];
}

function applyTemplate(t: CopyTemplate, slots: RitualCopySlots): Omit<RitualCopy, 'situation' | 'reason'> {
  const map = asSlotMap(slots);
  const title = fillSlots(t.title, map);
  const body = fillSlots(t.body, map);
  return {
    templateId: t.id,
    tone: t.tone,
    title,
    body,
    cardKicker: t.cardKicker ? fillSlots(t.cardKicker, map) : title,
    cardTitle: t.cardTitle ? fillSlots(t.cardTitle, map) : title,
    cardBody: t.cardBody ? fillSlots(t.cardBody, map) : body,
    slots
  };
}

export function composeRitualCopy(input: RitualCopyInput): RitualCopy {
  const hour = input.hour ?? asDate(input.asOf).getHours();
  const normalized: RitualCopyInput = { ...input, hour };
  const { situation, reason } = pickSituation(normalized);
  const slots = buildSlots(normalized);
  const chosen = selectTemplate(situation, slots, localDayKey(input.asOf), input.lastTemplateId);
  const filled = applyTemplate(chosen, slots);
  return {
    situation,
    reason,
    ...filled
  };
}

export function collectCatalogCopy(sample?: Partial<RitualCopySlots>): string[] {
  const slots: RitualCopySlots = {
    streak: 7,
    streakDays: '7 дней',
    domain: 'Внимание',
    minutes: 5,
    chrono: 'утром',
    gapDays: '3 дня',
    ...sample
  };
  const out: string[] = [];
  for (const t of COPY_TEMPLATES) {
    const filled = applyTemplate(t, slots);
    out.push(t.id, filled.title, filled.body, filled.cardKicker, filled.cardTitle, filled.cardBody);
  }
  return out;
}

export function toCoachSpark(copy: RitualCopy): { title: string; body: string; tone: CopyTone } {
  return { title: copy.title, body: copy.body, tone: copy.tone };
}
