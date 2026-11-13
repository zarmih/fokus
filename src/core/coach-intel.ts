import { ANALYTICS_METHODOLOGY_VERSION } from './analytics/methodology';
import { L, getLocale } from './i18n';
import type { DaySummary, DomainIndex } from './types';
import { computeFokusIndex } from './fokus-index';
import { DOMAIN_ORDER, domainLabel } from './labels';
import { addCalendarDays, calendarDayKey, resolveFokusTimeZone, PREFERRED_TIME_ZONE } from './streak';

export const HISTORY_WINDOWS = [14, 30] as const;
export type HistoryWindow = (typeof HISTORY_WINDOWS)[number];
export const MILESTONE_DAYS = [7, 14, 30] as const;
export type MilestoneDays = (typeof MILESTONE_DAYS)[number];

export interface IndexDay {
  date: string;
  played: boolean;
  skipped: boolean;
  streak: number;
  fokusIndex: number | null;
  /**
   * Index stored under an older methodology. It stays in history but is never drawn on the same
   * scale, compared, or used for deltas and personal bests with the current methodology.
   */
  legacyFokusIndex?: number | null;
  byDomain: Record<string, number | null>;
  personalBest: boolean;
}

export interface SparkPoint {
  date: string;
  value: number | null;
  t: number;
  y: number | null;
  personalBest: boolean;
}

export interface SparklineModel {
  window: HistoryWindow;
  points: SparkPoint[];
  min: number | null;
  max: number | null;
  first: number | null;
  last: number | null;
  delta: number | null;
  deltaLabel: string;
  personalBestIndex: number | null;
  /** Played days whose stored index uses an older methodology: kept, but not plotted or compared. */
  legacyDays: number;
}

export interface DomainBreakdown {
  id: string;
  current: number;
  ready: boolean;
  windowDelta: number | null;
  first: number | null;
  last: number | null;
  spark: number[];
}

export interface Adherence {
  window: HistoryWindow;
  playedDays: number;
  missedDays: number;
  forgivenSkips: number;
  currentStreak: number;
  longestStreak: number;
  adherencePct: number;
  comeback: boolean;
  gapDays: number;
}

export interface Milestone {
  days: MilestoneDays;
  reached: boolean;
  reachedAt: string | null;
  current: number;
}

export interface PersonalBest {
  value: number;
  date: string;
  isLatest: boolean;
}

export interface CoachTip {
  kind: 'domain' | 'adherence' | 'comeback' | 'streak' | 'milestone' | 'best' | 'science';
  title: string;
  body: string;
  domainId?: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
}

export interface CoachIntel {
  asOf: string;
  window: HistoryWindow;
  ready: boolean;
  days: IndexDay[];
  sparkline: SparklineModel;
  domains: DomainBreakdown[];
  adherence: Adherence;
  milestones: Milestone[];
  personalBest: PersonalBest | null;
  tips: CoachTip[];
  weakDomainId: string | null;
}

interface DayBucket {
  date: string;
  totalScore: number;
  domainDeltas: Record<string, number>;
  domainValues?: Record<string, number>;
  streak: number;
  skipped: boolean;
  fokusIndex: number | null;
  /** Methodology version of the stored Fokus Index (undefined = computed now, current version). */
  fokusIndexMethod?: number;
  played: boolean;
}

/**
 * Civil YYYY-MM-DD for coach-intel day bucketing in Fokus TZ (Europe/Moscow).
 * Plain YYYY-MM-DD / date-only civil keys stay as stored (day summaries);
 * Date and full ISO timestamps use calendarDayKey so near-midnight UTC
 * does not drift from the product day.
 */
export function toDateKey(iso: string | Date): string {
  if (typeof iso === 'string') {
    const trimmed = iso.trim();
    // Plain YYYY-MM-DD (summary.date civil keys) — keep as stored product day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const zone = resolveFokusTimeZone().timeZone || PREFERRED_TIME_ZONE;
  return calendarDayKey(iso, zone);
}

export function addDays(dateKey: string, days: number): string {
  return addCalendarDays(toDateKey(dateKey), days);
}

export function enumerateDays(endKey: string, window: number): string[] {
  const end = toDateKey(endKey);
  const days: string[] = [];
  for (let i = window - 1; i >= 0; i--) days.push(addDays(end, -i));
  return days;
}

function dateOrdinal(iso: string): number {
  const key = toDateKey(iso);
  const [y, m, d] = key.split('-').map(Number);
  return y * 400 + m * 32 + d;
}

export function collapseSummaries(summaries: DaySummary[]): DayBucket[] {
  const byDate = new Map<string, DayBucket>();
  const ordered = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of ordered) {
    const date = toDateKey(s.date);
    const prev = byDate.get(date);
    const deltas = { ...(prev?.domainDeltas || {}) };
    for (const [k, v] of Object.entries(s.domainDeltas || {})) {
      deltas[k] = (deltas[k] || 0) + v;
    }
    const own = typeof s.fokusIndex === 'number' && s.fokusIndex > 0;
    const fokus = own ? s.fokusIndex! : prev?.fokusIndex ?? null;
    const fokusIndexMethod = own ? s.fokusIndexMethod : prev?.fokusIndexMethod;
    const snapshot = s.domainValues && Object.keys(s.domainValues).length > 0
      ? { ...s.domainValues }
      : prev?.domainValues;
    byDate.set(date, {
      date,
      totalScore: (prev?.totalScore || 0) + (s.totalScore || 0),
      domainDeltas: deltas,
      domainValues: snapshot,
      streak: s.streak,
      skipped: !!(prev?.skipped || s.skipped),
      fokusIndex: fokus,
      fokusIndexMethod,
      // A day summary is written after a session — skipped means a forgiven gap, not an empty day.
      played: true
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function cloneValues(src: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(src)) out[k] = src[k];
  return out;
}

function indexFromValues(values: Record<string, number>): number | null {
  const domains: DomainIndex[] = Object.entries(values)
    .filter(([, v]) => v > 0)
    .map(([domain, value]) => ({ domain, value, updatedAt: '' }));
  if (domains.length === 0) return null;
  const fi = computeFokusIndex(domains);
  return fi.value > 0 ? fi.value : null;
}

export function reconstructDomainSnapshots(
  buckets: DayBucket[],
  currentDomains: DomainIndex[]
): DayBucket[] {
  const running: Record<string, number> = {};
  for (const d of currentDomains) {
    if (d.value > 0) running[d.domain] = d.value;
  }

  const played = [...buckets].filter((b) => b.played).reverse();
  for (const b of played) {
    if (b.domainValues && Object.keys(b.domainValues).length > 0) {
      for (const k of Object.keys(running)) delete running[k];
      for (const [k, v] of Object.entries(b.domainValues)) {
        if (v > 0) running[k] = v;
      }
    } else if (Object.keys(running).length > 0) {
      b.domainValues = cloneValues(running);
    }
    for (const [k, dlt] of Object.entries(b.domainDeltas || {})) {
      if (running[k] != null) running[k] = running[k] - dlt;
    }
  }
  return buckets;
}

function windowDeltaLabel(delta: number | null, window: HistoryWindow, samples: number): string {
  if (delta === null || samples < 3) return 'мало данных';
  if (Math.abs(delta) <= 8) return `на уровне ${window} дней`;
  if (delta > 0) return `+${delta} за ${window} дней`;
  return `${delta} за ${window} дней`;
}

export function buildSparkline(days: IndexDay[], window: HistoryWindow): SparklineModel {
  const numbered = days
    .map((d, i) => ({ i, v: d.fokusIndex }))
    .filter((x): x is { i: number; v: number } => x.v != null && x.v > 0);
  const min = numbered.length ? Math.min(...numbered.map((x) => x.v)) : null;
  const max = numbered.length ? Math.max(...numbered.map((x) => x.v)) : null;
  const first = numbered.length ? numbered[0].v : null;
  const last = numbered.length ? numbered[numbered.length - 1].v : null;
  const delta = first != null && last != null ? last - first : null;
  const n = Math.max(1, days.length - 1);

  let pbIndex: number | null = null;
  if (max != null) {
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].fokusIndex === max && days[i].personalBest) {
        pbIndex = i;
        break;
      }
    }
  }

  const points: SparkPoint[] = days.map((d, i) => {
    let y: number | null = null;
    if (d.fokusIndex != null && min != null && max != null) {
      y = max === min ? 0.5 : 1 - (d.fokusIndex - min) / (max - min);
    }
    return {
      date: d.date,
      value: d.fokusIndex,
      t: n === 0 ? 0 : i / n,
      y,
      personalBest: d.personalBest
    };
  });

  return {
    window,
    points,
    min,
    max,
    first,
    last,
    delta,
    deltaLabel: windowDeltaLabel(delta, window, numbered.length),
    personalBestIndex: pbIndex,
    legacyDays: days.filter((d) => d.legacyFokusIndex != null).length
  };
}

function longestStreakIn(days: IndexDay[]): number {
  return days.reduce((m, d) => (d.played ? Math.max(m, d.streak) : m), 0);
}

function currentStreakIn(days: IndexDay[], asOf: string): number {
  const today = toDateKey(asOf);
  const yesterday = addDays(today, -1);
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].played) continue;
    if (days[i].date === today || days[i].date === yesterday) return days[i].streak;
    return 0;
  }
  return 0;
}

export function detectComeback(
  days: IndexDay[],
  asOf: string
): { comeback: boolean; gapDays: number } {
  const today = toDateKey(asOf);
  const yesterday = addDays(today, -1);
  let last = -1;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].played) {
      last = i;
      break;
    }
  }
  if (last < 0) return { comeback: false, gapDays: days.length };

  const lastDate = days[last].date;
  if (lastDate !== today && lastDate !== yesterday) {
    return { comeback: false, gapDays: days.length - 1 - last };
  }

  let i = last;
  let hole = 0;
  while (i >= 0) {
    if (days[i].played) {
      hole = 0;
      i--;
      continue;
    }
    if (i > 0 && days[i - 1].played && hole === 0) {
      hole = 1;
      i--;
      continue;
    }
    break;
  }

  let gap = 0;
  let j = i;
  while (j >= 0 && !days[j].played) {
    gap++;
    j--;
  }
  const hadHistory = j >= 0 && days[j].played;
  return { comeback: hadHistory && gap >= 3, gapDays: gap };
}

export function computeAdherence(days: IndexDay[], window: HistoryWindow, asOf: string): Adherence {
  const playedDays = days.filter((d) => d.played).length;
  const missedDays = days.filter((d) => !d.played).length;
  const forgivenSkips = days.filter((d) => d.skipped).length;
  const { comeback, gapDays } = detectComeback(days, asOf);
  return {
    window,
    playedDays,
    missedDays,
    forgivenSkips,
    currentStreak: currentStreakIn(days, asOf),
    longestStreak: longestStreakIn(days),
    adherencePct: days.length === 0 ? 0 : Math.round((playedDays / days.length) * 100),
    comeback,
    gapDays
  };
}

export function computeMilestones(days: IndexDay[], currentStreak: number): Milestone[] {
  return MILESTONE_DAYS.map((n) => {
    const hit = days.find((d) => d.played && d.streak >= n);
    return {
      days: n,
      reached: currentStreak >= n || !!hit,
      reachedAt: hit ? hit.date : null,
      current: currentStreak
    };
  });
}

export function findPersonalBest(days: IndexDay[]): PersonalBest | null {
  let best: PersonalBest | null = null;
  let lastPlayed: IndexDay | null = null;
  for (const d of days) {
    if (d.played) lastPlayed = d;
    if (d.fokusIndex == null) continue;
    if (!best || d.fokusIndex >= best.value) {
      best = { value: d.fokusIndex, date: d.date, isLatest: false };
    }
  }
  if (!best) return null;
  best.isLatest = !!lastPlayed && lastPlayed.date === best.date;
  return best;
}

const DOMAIN_TIPS: Record<string, string[]> = {
  attention: [
    'Уберите телефон из поля зрения на один рабочий блок — даже молчащий экран делит внимание.',
    'Замечайте момент, когда мысль уходит при чтении, и мягко возвращайте её к строке.',
    'Следите за дыханием ровно одну минуту. Если отвлеклись — начните сначала без самокритики.',
    'Выберите один рутинный процесс и делайте его с полным погружением.',
    'В разговоре попробуйте не обдумывать ответ, пока собеседник не закончит фразу.',
    'Короткая пауза в 30 секунд между задачами помогает переключиться.',
    'Правило 20-20-20: каждые 20 минут смотрите на 20 метров вдаль в течение 20 секунд. Снимает зрительное утомление и восстанавливает фокус.',
    'Монозадачность — ваш лучший друг. Попробуйте закрыть все вкладки, кроме одной, на следующие 15 минут.'
  ],
  memory: [
    'Держите короткий список в уме, пока не дойдёте до места — без подглядывания в телефон.',
    'Перед сном восстановите день в обратном порядке: это дешёвая тренировка припоминания.',
    'После прочтения текста попробуйте пересказать главную мысль своими словами.',
    'Если нужно не забыть действие, ярко представьте себя в момент его выполнения.',
    'Связывайте новое с уже знакомыми образами — так его проще вспомнить.',
    'При знакомстве мысленно повторите имя человека три раза. Ассоциируйте его с кем-то знакомым.',
    'Попробуйте вспомнить номера телефонов самых близких людей. Память — это мышца, которой нужна нагрузка.'
  ],
  speed: [
    'Перед сложной задачей — две минуты ходьбы. Обработка чуть быстрее, когда тело в тонусе.',
    'На рутинном действии поставьте мягкий таймер и уложитесь чуть раньше обычного.',
    'Если задача пугает, дайте себе ровно 5 минут на её быстрое и черновое начало.',
    'Запишите отвлекающие мысли на стикер, чтобы не тратить ресурс на их удержание.',
    'Ускоряйте темп при чтении простых писем, скользя по строкам, а не проговаривая слова.',
    'Установите лимит времени на мелкие решения: например, 30 секунд на выбор блюда в кафе.'
  ],
  flexibility: [
    'Смените порядок утренних дел на один день. Мозгу полезно ломать привычный маршрут.',
    'Когда правило меняется — пауза на вдох, потом действие. Переключение стоит секунды.',
    'Задайте себе вопрос: «Что, если моя первая реакция на эту проблему — не единственно верная?»',
    'Попробуйте выполнить часть утренней рутины неведущей рукой.',
    'Если разговор зашёл в тупик, попробуйте искренне встать на сторону собеседника.',
    'Попробуйте поехать на работу или дойти до магазина новым маршрутом.'
  ],
  logic: [
    'Прежде чем открыть ответ, дайте себе полминуты вывести его самостоятельно.',
    'Объясните сложную рабочую мысль человеку не из вашей сферы — одним абзацем.',
    'Разбейте задачу на шаги. Первый шаг должен занимать не больше пяти минут.',
    'Ищите не подтверждение своей идеи, а факты, которые могли бы её опровергнуть.',
    'Если решение не приходит, переформулируйте задачу от обратного: как её точно провалить?',
    'Попробуйте оценить ситуацию с позиции стороннего наблюдателя. Дистанция помогает видеть главное.'
  ]
};

const DOMAIN_TIPS_EN: Record<string, string[]> = {
  attention: [
    'Put your phone screen-down for 20 minutes of deep focus — a quiet screen splits attention.',
    'Notice when your mind wanders while reading, and gently bring it back to the line.',
    'Focus on your breath for one minute. If distracted, start again without self-criticism.',
    'Choose one routine activity and do it with complete presence.',
    'In conversation, hold back on planning your reply until the speaker has finished.',
    'Take a 30-second pause between tasks to help your attention reset.',
    'The 20-20-20 rule: every 20 minutes look 20 feet away for 20 seconds to ease visual fatigue.',
    'Single-tasking is your best friend: close all tabs except one for the next 15 minutes.'
  ],
  memory: [
    'Keep a short mental list without checking your phone until you arrive.',
    'Recall the key events of your day in reverse order before sleeping.',
    'After reading a text, try retelling the core idea in your own words.',
    'If you need to remember an action, vividly picture yourself doing it.',
    'Link new information to familiar images — it makes recall much easier.',
    'When meeting someone, mentally repeat their name three times and anchor it to something familiar.',
    'Recall phone numbers of those close to you. Memory is a muscle that needs exercise.'
  ],
  speed: [
    'Take a two-minute walk before a demanding task — processing is sharper when the body is active.',
    'Set a gentle timer for a routine task and finish slightly faster than usual.',
    'If a task feels overwhelming, give yourself 5 minutes for a quick rough start.',
    'Jot down distracting thoughts on a note so you do not hold them in working memory.',
    'Skim simple messages smoothly rather than pronouncing each word.',
    'Set a 30-second decision timer for low-stakes choices.'
  ],
  flexibility: [
    'Switch the order of your morning routine for one day to break automatic habits.',
    'When rules change, pause for one breath, then act. Switching takes a moment.',
    'Ask yourself: "What if my first reaction is not the only valid one?"',
    'Try doing part of your morning routine with your non-dominant hand.',
    'If a discussion stalls, genuinely try taking the other person’s side.',
    'Take a different route on your daily commute or walk.'
  ],
  logic: [
    'Give yourself half a minute to derive an answer before looking it up.',
    'Explain a complex work idea to someone outside your field in one clear paragraph.',
    'Break a task down so the very first step takes no more than five minutes.',
    'Look for counter-evidence rather than just confirming initial assumptions.',
    'If stuck, reframe the problem from the reverse: how would you guarantee failure?',
    'Evaluate the situation as an outside observer — distance clarifies what matters.'
  ]
};

const DEFAULT_TIPS_EN = [
  'Consistency matters more than intensity. Short workouts beat rare marathons.',
  'Quality sleep is essential for consolidating new skills.',
  'Errors near your limit indicate that you are training in your growth zone.',
  'Aim for return rather than perfection: restarting after a pause is the real habit.',
  'Deep focus requires rest. If tired, wrapping up early is the right call.',
  'A short break is normal. A brief, familiar session is all you need.'
];

export function getWeeklyDomainTips(domainId: string): string[] {
  if (getLocale() === 'en') {
    return DOMAIN_TIPS_EN[domainId] || DEFAULT_TIPS_EN;
  }
  return DOMAIN_TIPS[domainId] || [
    'Регулярность важнее интенсивности. Короткие тренировки работают лучше долгих марафонов.',
    'Качественный сон — лучшее, что можно сделать для закрепления любого навыка.',
    'Ошибки на пределе возможностей — это сигнал, что зона роста найдена правильно.',
    'Не пытайтесь быть идеальным каждый день. Важен только возврат к практике после пропуска.',
    'Высокая концентрация требует отдыха. Если чувствуете усталость, лучше закончить сессию пораньше.',
    'Пауза в пару дней — нормально. Начнём с короткой знакомой тренировки.'
  ];
}

function pickTip(pool: string[], asOf: string): string {
  if (pool.length === 0) return '';
  return pool[Math.abs(dateOrdinal(asOf)) % pool.length];
}

export function weakDomainsOf(domains: DomainBreakdown[]): DomainBreakdown[] {
  const ready = domains.filter((d) => d.ready);
  if (ready.length === 0) return [];
  return [...ready].sort((a, b) => a.current - b.current);
}

function buildTips(
  intel: Omit<CoachIntel, 'tips'>,
  asOf: string,
  trajectory?: import('./ability-trajectory').AbilityTrajectory
): CoachTip[] {
  const tips: CoachTip[] = [];
  const { adherence, milestones, personalBest, weakDomainId, sparkline } = intel;

  if (adherence.comeback) {
    tips.push({
      kind: 'comeback',
      title: L('С возвращением', 'Welcome back'),
      body: L(
        'Долгая пауза не обнуляет навык. Короткий блок вернёт ритм — навёрстывать пропущенное не нужно. Ваш прогресс сохранён.',
        'A long pause does not erase your skills. A short session will restore your rhythm — no need to make up for lost time. Your progress is preserved.'
      ),
      tone: 'recovery'
    });
  }

  const justHit = milestones.find((m) => m.reached && adherence.currentStreak === m.days);
  if (justHit) {
    tips.push({
      kind: 'milestone',
      title: L(`${justHit.days} дней подряд`, `${justHit.days} days in a row`),
      body: L(
        'Отличная серия. Но помните, что пропуск одного дня — это не катастрофа, а повод отдохнуть. Fokus за честный подход и долгосрочный ритм.',
        'Great streak. Remember that missing a day is not a failure, but an opportunity to rest. Fokus believes in an honest approach and long-term rhythm.'
      ),
      tone: 'habit'
    });
  } else if (adherence.currentStreak >= 7 && !adherence.comeback) {
    tips.push({
      kind: 'streak',
      title: L(`${adherence.currentStreak} дней подряд`, `${adherence.currentStreak} days in a row`),
      body: L(
        'Вы держите хороший ритм. Если почувствуете усталость, не бойтесь пропустить день — ваша честная серия будет защищена.',
        'You are maintaining a strong rhythm. If you feel tired, do not hesitate to take a day off — your streak is protected.'
      ),
      tone: 'habit'
    });
  }

  if (personalBest && personalBest.isLatest) {
    tips.push({
      kind: 'best',
      title: L('Личный рекорд Fokus Index', 'Personal record: Fokus Index'),
      body: L(
        `${personalBest.value} — лучшая оценка за ${sparkline.window} дней. Результаты плавают день ото дня, и это естественная динамика.`,
        `${personalBest.value} — your best score in ${sparkline.window} days. Performance naturally fluctuates day to day.`
      ),
      tone: 'science'
    });
  }

  let domainTipAdded = false;

  if (trajectory && trajectory.ready) {
    const falling = trajectory.domains.find(d => d.trend === 'falling');
    const risingWeak = trajectory.domains.find(d => d.trend === 'rising' && d.theta < 0.4);
    const stagnantWeak = trajectory.domains.find(d => d.trend === 'stable' && d.theta < 0.3);
    const strongStable = trajectory.domains.find(d => d.trend === 'stable' && d.theta > 0.7);

    if (falling) {
      tips.push({
        kind: 'domain',
        title: L(`Цикл адаптации · ${domainLabel(falling.domain)}`, `Adaptation cycle · ${domainLabel(falling.domain)}`),
        body: L(
          `Показатели пошли на спад. Fokus временно снизит сложность, чтобы вы восстановили точность без лишнего напряжения.`,
          `Scores have dipped slightly. Fokus temporarily eases difficulty so you can rebuild accuracy without unnecessary strain.`
        ),
        domainId: falling.domain,
        tone: 'recovery'
      });
      domainTipAdded = true;
    } else if (risingWeak) {
      tips.push({
        kind: 'domain',
        title: L(`Уверенный старт · ${domainLabel(risingWeak.domain)}`, `Steady start · ${domainLabel(risingWeak.domain)}`),
        body: L(
          `Наметился стабильный рост. Фокус на регулярности даёт плоды, держите заданный темп.`,
          `Positive momentum is building. Consistency pays off, keep this pace.`
        ),
        domainId: risingWeak.domain,
        tone: 'focus'
      });
      domainTipAdded = true;
    } else if (stagnantWeak) {
      tips.push({
        kind: 'domain',
        title: L(`Зона роста · ${domainLabel(stagnantWeak.domain)}`, `Growth area · ${domainLabel(stagnantWeak.domain)}`),
        body: L(
          `Эта область пока поддаётся сложнее. Короткие регулярные подходы дадут самый заметный эффект.`,
          `This area is currently more challenging. Short, regular practice will yield the most noticeable effect.`
        ),
        domainId: stagnantWeak.domain,
        tone: 'focus'
      });
      domainTipAdded = true;
    } else if (strongStable && !adherence.comeback) {
      tips.push({
        kind: 'domain',
        title: L(`Устойчивая база · ${domainLabel(strongStable.domain)}`, `Strong foundation · ${domainLabel(strongStable.domain)}`),
        body: L(
          `Ваша стабильная сильная сторона. Fokus будет поддерживать этот уровень без изнурительных пиковых нагрузок.`,
          `Your reliable strength. Fokus will sustain this level without grueling peak loads.`
        ),
        domainId: strongStable.domain,
        tone: 'science'
      });
      domainTipAdded = true;
    }
  }

  if (!domainTipAdded) {
    const weak = intel.domains.find((d) => d.id === weakDomainId);
    if (weak) {
      const spread = intel.domains.filter((d) => d.ready).reduce((m, d) => Math.max(m, d.current), 0) - weak.current;
      const concrete = pickTip(getWeeklyDomainTips(weak.id), asOf);
      const lead = L(
        spread >= 40
          ? `«${domainLabel(weak.id)}» пока слабее остальных.`
          : `Сейчас фокус на «${domainLabel(weak.id)}».`,
        spread >= 40
          ? `"${domainLabel(weak.id)}" is currently trailing other areas.`
          : `Focus is currently on "${domainLabel(weak.id)}".`
      );
      tips.push({
        kind: 'domain',
        title: L(`Зона роста · ${domainLabel(weak.id)}`, `Growth area · ${domainLabel(weak.id)}`),
        body: `${lead} ${concrete}`,
        domainId: weak.id,
        tone: 'focus'
      });
    }
  }

  if (adherence.adherencePct < 50 && adherence.playedDays > 0 && !adherence.comeback) {
    tips.push({
      kind: 'adherence',
      title: L('Ритм важнее серии', 'Rhythm over streak'),
      body: L(
        `${adherence.playedDays} из ${adherence.window} дней. Одна лёгкая сессия сегодня закрепит привычку лучше, чем час раз в неделю. Никакого чувства вины.`,
        `${adherence.playedDays} of ${adherence.window} days. One light session today builds habit better than an hour once a week. Zero guilt.`
      ),
      tone: 'recovery'
    });
  } else if (adherence.playedDays >= 5 && adherence.window === 14) {
    tips.push({
      kind: 'adherence',
      title: L('Привычка держится', 'Habit is holding'),
      body: L(
        `${adherence.playedDays} тренировок за ${adherence.window} дней. Навыки растут от регулярности, не от марафонов.`,
        `${adherence.playedDays} sessions in ${adherence.window} days. Skills develop from regularity, not marathons.`
      ),
      tone: 'habit'
    });
  } else if (adherence.playedDays >= 10 && adherence.window === 30) {
    tips.push({
      kind: 'adherence',
      title: L('Привычка держится', 'Habit is holding'),
      body: L(
        `${adherence.playedDays} тренировок за 30 дней. Регулярность важнее длины одной тренировки.`,
        `${adherence.playedDays} sessions in 30 days. Consistency matters more than the length of a single session.`
      ),
      tone: 'habit'
    });
  }

  if (adherence.gapDays > 0 && adherence.gapDays <= 2 && tips.every((t) => t.kind !== 'comeback' && t.kind !== 'adherence')) {
    tips.push({
      kind: 'adherence',
      title: L('Мягкий возврат', 'Soft return'),
      body: L(
        'Пауза позади. Накопленный навык остался с вами. Сегодняшний короткий блок поможет плавно вернуться в ритм без надрывов.',
        'Break is behind you. Retained skills remain. Today’s short block will gently ease you back into rhythm.'
      ),
      tone: 'recovery'
    });
  }

  if (tips.length === 0 && intel.ready) {
    tips.push({
      kind: 'science',
      title: L('Короткий ритуал', 'Short ritual'),
      body: L(
        'Регулярные сессии помогают плавно входить в рабочий ритм.',
        'Regular sessions help smoothly settle into a productive rhythm.'
      ),
      tone: 'science'
    });
  }

  const domain = tips.filter((t) => t.kind === 'domain');
  const rest = tips.filter((t) => t.kind !== 'domain');
  return [...rest.slice(0, 2), ...domain.slice(0, 1)].slice(0, 3);
}

export function buildCoachIntel(input: {
  summaries: DaySummary[];
  domains: DomainIndex[];
  window?: HistoryWindow;
  asOf?: string;
  trajectory?: import('./ability-trajectory').AbilityTrajectory;
}): CoachIntel {
  const window: HistoryWindow = input.window === 30 ? 30 : 14;
  const asOf = input.asOf || new Date().toISOString();
  const asOfKey = toDateKey(asOf);
  const calendar = enumerateDays(asOfKey, window);
  const buckets = reconstructDomainSnapshots(collapseSummaries(input.summaries), input.domains);
  const byDate = new Map(buckets.map((b) => [b.date, b]));

  let lastKnown: Record<string, number> = {};
  const days: IndexDay[] = calendar.map((date) => {
    const b = byDate.get(date);
    if (b?.domainValues && Object.keys(b.domainValues).length > 0) {
      lastKnown = b.domainValues;
    }
    const byDomain: Record<string, number | null> = {};
    for (const id of DOMAIN_ORDER) {
      const snap = b?.domainValues?.[id] ?? lastKnown[id];
      byDomain[id] = typeof snap === 'number' && snap > 0 ? snap : null;
    }
    let fokus = b?.fokusIndex ?? null;
    const legacy = fokus != null && b?.fokusIndexMethod != null && b.fokusIndexMethod < ANALYTICS_METHODOLOGY_VERSION;
    const legacyFokusIndex = legacy && b?.played ? fokus : null;
    if (legacy) fokus = null;
    if (fokus == null && !legacy && b?.played && b.domainValues) {
      fokus = indexFromValues(b.domainValues);
    }
    return {
      date,
      played: !!b?.played,
      skipped: !!b?.skipped,
      streak: b?.streak || 0,
      fokusIndex: b?.played ? fokus : null,
      legacyFokusIndex,
      byDomain,
      personalBest: false
    };
  });

  const pb = findPersonalBest(days);
  if (pb) {
    for (const d of days) {
      if (d.date === pb.date && d.fokusIndex === pb.value) d.personalBest = true;
    }
  }

  const sparkline = buildSparkline(days, window);

  const domains: DomainBreakdown[] = DOMAIN_ORDER.map((id) => {
    const live = input.domains.find((d) => d.domain === id);
    const series = days
      .map((d) => d.byDomain[id])
      .filter((v): v is number => v != null && v > 0);
    const first = series.length ? series[0] : null;
    const last = series.length ? series[series.length - 1] : null;
    const current = live && live.value > 0 ? live.value : last || 0;
    return {
      id,
      current,
      ready: current > 0,
      windowDelta: first != null && last != null ? Math.round(last - first) : null,
      first,
      last,
      spark: series
    };
  });

  const ranked = weakDomainsOf(domains);
  const weakest = ranked[0] || null;
  const weakDomainId = weakest ? weakest.id : null;

  const adherence = computeAdherence(days, window, asOf);
  const milestones = computeMilestones(days, adherence.currentStreak);
  const ready = adherence.playedDays > 0;

  const intel: Omit<CoachIntel, 'tips'> = {
    asOf: asOfKey,
    window,
    ready,
    days,
    sparkline,
    domains,
    adherence,
    milestones,
    personalBest: pb,
    weakDomainId: ready ? weakDomainId : null
  };

  return { ...intel, tips: ready ? buildTips(intel, asOf, input.trajectory) : [] };
}
