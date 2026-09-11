import type { CognitiveDomain, DaySummary, DomainIndex, Session } from './types';
import { DOMAIN_ORDER } from './labels';
import { t, getLocale, type Locale } from './i18n';
import { ruPlural } from './transfer';
import {
  buildTransferSurface,
  type TransferSurface
} from './transfer-insights';

export const WEEK_LENGTH = 7;

export const WEEKLY_I18N_KEYS = [
  'weekly.title',
  'weekly.cta',
  'weekly.empty_title',
  'weekly.empty_body',
  'weekly.days',
  'weekly.sessions',
  'weekly.exercises',
  'weekly.changed_title',
  'weekly.changed_empty',
  'weekly.next_step',
  'weekly.narrative_kicker',
  'weekly.domains_kicker',
  'weekly.domains_title',
  'weekly.streak_kicker',
  'weekly.share_kicker',
  'weekly.share_title',
  'weekly.share_download',
  'weekly.share_local_note',
  'weekly.share_footer',
  'weekly.share_disclaimer',
  'weekly.share.days',
  'weekly.share.sessions',
  'weekly.share.domains',
  'weekly.share.streak',
  'weekly.share.none',
  'weekly.trained',
  'weekly.quiet',
  'weekly.cal_played',
  'weekly.cal_missed',
  'weekly.cal_forgiven',
  'weekly.a11y_report',
  'weekly.a11y_share',
  'weekly.a11y_calendar',
  'weekly.nar.empty.headline',
  'weekly.nar.empty.p1',
  'weekly.nar.empty.p2',
  'weekly.nar.warming.headline',
  'weekly.nar.warming.p1',
  'weekly.nar.warming.p2',
  'weekly.nar.habit.headline',
  'weekly.nar.habit.p1',
  'weekly.nar.habit.p2',
  'weekly.nar.forgiven.headline',
  'weekly.nar.forgiven.p1',
  'weekly.nar.forgiven.p2',
  'weekly.nar.broken.headline',
  'weekly.nar.broken.p1',
  'weekly.nar.broken.p2',
  'weekly.nar.sparse.headline',
  'weekly.nar.sparse.p1',
  'weekly.nar.sparse.p2',
  'weekly.nar.mix.p2',
  'weekly.nar.narrow.p2',
  'weekly.nar.balanced.p2',
  'weekly.nar.transfer_hook',
  'weekly.nar.focus_hook',
  'weekly.honesty.empty',
  'weekly.honesty.intact',
  'weekly.honesty.forgiven',
  'weekly.honesty.broken',
  'weekly.honesty.sparse',
  'weekly.honesty.share.intact',
  'weekly.honesty.share.forgiven',
  'weekly.honesty.share.broken',
  'weekly.honesty.share.sparse',
  'weekly.honesty.share.empty',
  'domain.attention',
  'domain.memory',
  'domain.speed',
  'domain.flexibility',
  'domain.logic'
] as const;

export type StreakHonestyKind = 'empty' | 'intact' | 'forgiven' | 'broken' | 'sparse';
export type WeekMixKind = 'empty' | 'warming' | 'narrow' | 'skewed' | 'balanced';
export type CalendarDayState = 'played' | 'missed' | 'forgiven';
export type NarrativeVoice = 'empty' | 'warming' | 'habit' | 'forgiven' | 'broken' | 'sparse';

export interface WeekCalendarDay {
  date: string;
  state: CalendarDayState;
}

export interface DomainWeekLoad {
  id: CognitiveDomain;
  blocks: number;
  load: number;
  delta: number;
  trained: boolean;
}

export interface WeeklyStreakHonesty {
  kind: StreakHonestyKind;
  productStreak: number;
  livePlayed: number;
  liveForgiven: number;
  playedDays: number;
  missedDays: number;
  forgivenSkips: number;
  consecutivePlayed: number;
  allowsInARow: boolean;
  calendar: WeekCalendarDay[];
  note: string;
  shareLine: string;
}

export interface WeeklyNarrative {
  voice: NarrativeVoice;
  headline: string;
  paragraphs: string[];
}

export interface WeeklyShareLine {
  label: string;
  value: string;
}

export interface WeeklySharePayload {
  headline: string;
  period: string;
  lines: WeeklyShareLine[];
  footer: string;
  disclaimer: string;
  filename: string;
}

export interface WeeklyGlance {
  activeDays: number;
  sessions: number;
  exercises: number;
  minutes: number;
}

export interface WeeklyReport {
  asOf: string;
  from: string;
  to: string;
  periodLabel: string;
  empty: boolean;
  locale: Locale;
  glance: WeeklyGlance;
  domains: DomainWeekLoad[];
  trainedDomainIds: CognitiveDomain[];
  neglectedDomainIds: CognitiveDomain[];
  mix: WeekMixKind;
  streak: WeeklyStreakHonesty;
  narrative: WeeklyNarrative;
  transfer: TransferSurface;
  share: WeeklySharePayload;
}

export interface WeeklyReportInput {
  sessions: Session[];
  daySummaries: DaySummary[];
  domains: DomainIndex[];
  now?: Date;
  domainByExercise?: Record<string, string>;
  locale?: Locale;
}

export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function addDaysKey(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function weekDateKeys(now: Date): string[] {
  const end = now.toISOString().slice(0, 10);
  const keys: string[] = [];
  for (let i = WEEK_LENGTH - 1; i >= 0; i--) keys.push(addDaysKey(end, -i));
  return keys;
}

function inWeek(iso: string, keys: string[]): boolean {
  const set = new Set(keys);
  return set.has(dateKey(iso));
}

function tx(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  return t(key, vars, locale);
}

export function domainName(id: string, locale?: Locale): string {
  const key = `domain.${id}`;
  const loc = locale || getLocale();
  const label = t(key, undefined, loc);
  return label === key ? id : label;
}

function unitDays(n: number, locale: Locale): string {
  if (locale === 'en') return n === 1 ? '1 day' : `${n} days`;
  return ruPlural(n, 'день', 'дня', 'дней');
}

function unitSessions(n: number, locale: Locale): string {
  if (locale === 'en') return n === 1 ? '1 session' : `${n} sessions`;
  return ruPlural(n, 'сессия', 'сессии', 'сессий');
}

function formatPeriod(from: string, to: string, locale: Locale): string {
  const loc = locale === 'en' ? 'en-GB' : 'ru-RU';
  const fmt = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `${fmt.format(new Date(`${from}T12:00:00Z`))} — ${fmt.format(new Date(`${to}T12:00:00Z`))}`;
}

function isDomainId(id: string): id is CognitiveDomain {
  return (DOMAIN_ORDER as readonly string[]).includes(id);
}

export function collectPlayedDates(sessions: Session[], summaries: DaySummary[], weekKeys: string[]): Set<string> {
  const played = new Set<string>();
  const week = new Set(weekKeys);
  for (const s of sessions) {
    if (!s.items || s.items.length === 0) continue;
    const key = dateKey(s.startedAt);
    if (week.has(key)) played.add(key);
  }
  for (const d of summaries) {
    if (d.skipped) continue;
    if ((d.totalScore || 0) <= 0) continue;
    const key = dateKey(d.date);
    if (week.has(key)) played.add(key);
  }
  return played;
}

export function buildWeekCalendar(
  weekKeys: string[],
  played: Set<string>,
  skippedReturnDates: Set<string>
): WeekCalendarDay[] {
  return weekKeys.map((date) => {
    if (played.has(date)) return { date, state: 'played' as const };
    const next = addDaysKey(date, 1);
    if (skippedReturnDates.has(next)) return { date, state: 'forgiven' as const };
    return { date, state: 'missed' as const };
  });
}

function longestConsecutivePlayed(calendar: WeekCalendarDay[]): number {
  let best = 0;
  let run = 0;
  for (const day of calendar) {
    if (day.state === 'played') {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function liveRun(calendar: WeekCalendarDay[]): { played: number; forgiven: number } {
  let idx = calendar.length - 1;
  if (idx < 0) return { played: 0, forgiven: 0 };
  if (calendar[idx].state !== 'played') idx -= 1;
  if (idx < 0 || calendar[idx].state !== 'played') return { played: 0, forgiven: 0 };

  let played = 0;
  let forgiven = 0;
  for (let i = idx; i >= 0; i--) {
    if (calendar[i].state === 'played') {
      played += 1;
      continue;
    }
    if (calendar[i].state === 'forgiven') {
      forgiven += 1;
      continue;
    }
    break;
  }
  return { played, forgiven };
}

function productStreakOn(summaries: DaySummary[], lastPlayed: string | null): number {
  if (!lastPlayed) return 0;
  const hits = summaries
    .filter((d) => dateKey(d.date) === lastPlayed)
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = hits[hits.length - 1];
  return last && last.streak > 0 ? last.streak : 0;
}

export function assessStreakHonesty(opts: {
  weekKeys: string[];
  played: Set<string>;
  summaries: DaySummary[];
  locale: Locale;
}): WeeklyStreakHonesty {
  const { weekKeys, played, summaries, locale } = opts;
  const skippedReturnDates = new Set(
    summaries.filter((d) => d.skipped && inWeek(d.date, weekKeys)).map((d) => dateKey(d.date))
  );
  const calendar = buildWeekCalendar(weekKeys, played, skippedReturnDates);
  const asOf = weekKeys[weekKeys.length - 1];
  const yesterday = addDaysKey(asOf, -1);
  const lastPlayed = [...played].sort().reverse()[0] || null;
  const live = liveRun(calendar);
  const consecutivePlayed = longestConsecutivePlayed(calendar);
  const playedDays = played.size;
  const forgivenSkips = calendar.filter((d) => d.state === 'forgiven').length;
  const missedDays = calendar.filter((d) => d.state === 'missed').length;
  const streakAlive = !!lastPlayed && (lastPlayed === asOf || lastPlayed === yesterday);
  const product = streakAlive ? productStreakOn(summaries, lastPlayed) : 0;
  const productStreak = product > 0 ? product : live.played;

  let kind: StreakHonestyKind;
  if (playedDays === 0) kind = 'empty';
  else if (live.forgiven > 0) kind = 'forgiven';
  else if (!streakAlive) kind = 'broken';
  else if (live.played >= 2 && live.forgiven === 0) kind = 'intact';
  else kind = 'sparse';

  const allowsInARow = kind === 'intact';
  const playedPhrase = unitDays(playedDays, locale);
  const livePhrase = unitDays(live.played, locale);

  const note =
    kind === 'empty'
      ? tx(locale, 'weekly.honesty.empty')
      : kind === 'intact'
        ? tx(locale, 'weekly.honesty.intact', { streak: productStreak, livePhrase })
        : kind === 'forgiven'
          ? tx(locale, 'weekly.honesty.forgiven', { streak: productStreak, live: live.played })
          : kind === 'broken'
            ? tx(locale, 'weekly.honesty.broken', { playedPhrase })
            : tx(locale, 'weekly.honesty.sparse', { streak: productStreak, playedPhrase });

  const shareLine =
    kind === 'empty'
      ? tx(locale, 'weekly.honesty.share.empty')
      : kind === 'intact'
        ? tx(locale, 'weekly.honesty.share.intact', { n: live.played })
        : kind === 'forgiven'
          ? tx(locale, 'weekly.honesty.share.forgiven', { n: productStreak })
          : kind === 'broken'
            ? tx(locale, 'weekly.honesty.share.broken', { n: playedDays })
            : tx(locale, 'weekly.honesty.share.sparse', { n: playedDays });

  return {
    kind,
    productStreak,
    livePlayed: live.played,
    liveForgiven: live.forgiven,
    playedDays,
    missedDays,
    forgivenSkips,
    consecutivePlayed,
    allowsInARow,
    calendar,
    note,
    shareLine
  };
}

export function assessDomainWeek(
  sessions: Session[],
  summaries: DaySummary[],
  weekKeys: string[],
  domainByExercise?: Record<string, string>
): DomainWeekLoad[] {
  const blocks: Record<string, number> = {};
  const load: Record<string, number> = {};
  const delta: Record<string, number> = {};

  for (const s of sessions) {
    if (!inWeek(s.startedAt, weekKeys)) continue;
    for (const item of s.items || []) {
      const domain = domainByExercise?.[item.exerciseId];
      if (!domain || !isDomainId(domain)) continue;
      blocks[domain] = (blocks[domain] || 0) + 1;
    }
  }

  for (const d of summaries) {
    if (!inWeek(d.date, weekKeys)) continue;
    for (const [k, v] of Object.entries(d.domainDeltas || {})) {
      if (!isDomainId(k) || !Number.isFinite(v)) continue;
      load[k] = (load[k] || 0) + Math.abs(v);
      delta[k] = (delta[k] || 0) + v;
    }
  }

  return DOMAIN_ORDER.map((id) => {
    const b = blocks[id] || 0;
    const l = load[id] || 0;
    return {
      id,
      blocks: b,
      load: l,
      delta: delta[id] || 0,
      trained: b > 0 || l > 0
    };
  });
}

export function assessWeekMix(domains: DomainWeekLoad[], sessionCount: number): WeekMixKind {
  const trained = domains.filter((d) => d.trained);
  if (trained.length === 0) return 'empty';
  if (sessionCount < 2 || trained.length === 1 && sessionCount < 3) return 'warming';

  const scores = trained.map((d) => Math.max(d.blocks, d.load));
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (trained.length === 1) return 'narrow';
  if (trained.length >= 2) {
    const sorted = [...trained].sort((a, b) => Math.max(b.blocks, b.load) - Math.max(a.blocks, a.load));
    const top = Math.max(sorted[0].blocks, sorted[0].load);
    const second = Math.max(sorted[1].blocks, sorted[1].load);
    if (top > 0 && second * 1.6 < top) return 'skewed';
  }
  if (trained.length >= 3 && max > 0 && min * 1.35 >= max) return 'balanced';
  if (trained.length >= 3) return 'balanced';
  return 'warming';
}

function mixParagraph(mix: WeekMixKind, domains: DomainWeekLoad[], locale: Locale): string | null {
  const trained = [...domains].filter((d) => d.trained).sort((a, b) => Math.max(b.blocks, b.load) - Math.max(a.blocks, a.load));
  if (mix === 'narrow' && trained[0]) {
    return tx(locale, 'weekly.nar.narrow.p2', { domain: domainName(trained[0].id, locale) });
  }
  if (mix === 'skewed' && trained.length >= 2) {
    const weak = [...trained].sort((a, b) => Math.max(a.blocks, a.load) - Math.max(b.blocks, b.load))[0];
    return tx(locale, 'weekly.nar.mix.p2', {
      strong: domainName(trained[0].id, locale),
      weak: domainName(weak.id, locale)
    });
  }
  if (mix === 'balanced') return tx(locale, 'weekly.nar.balanced.p2');
  return null;
}

function composeNarrative(
  locale: Locale,
  glance: WeeklyGlance,
  streak: WeeklyStreakHonesty,
  mix: WeekMixKind,
  domains: DomainWeekLoad[],
  transfer: TransferSurface
): WeeklyNarrative {
  const trained = domains.filter((d) => d.trained);
  const domainList =
    trained.length > 0
      ? trained.map((d) => domainName(d.id, locale)).join(', ')
      : tx(locale, 'weekly.share.none');
  const daysPhrase = unitDays(glance.activeDays, locale);
  const sessionsPhrase = unitSessions(glance.sessions, locale);
  const playedPhrase = unitDays(streak.playedDays, locale);

  let voice: NarrativeVoice;
  if (streak.kind === 'empty' || glance.sessions === 0) voice = 'empty';
  else if (streak.kind === 'forgiven') voice = 'forgiven';
  else if (streak.kind === 'broken') voice = 'broken';
  else if (glance.activeDays <= 2) voice = 'warming';
  else if (streak.kind === 'intact' && streak.livePlayed >= 5) voice = 'habit';
  else if (streak.kind === 'intact' && glance.activeDays >= 5) voice = 'habit';
  else voice = 'sparse';

  const headline =
    voice === 'empty'
      ? tx(locale, 'weekly.nar.empty.headline')
      : voice === 'forgiven'
        ? tx(locale, 'weekly.nar.forgiven.headline')
        : voice === 'broken'
          ? tx(locale, 'weekly.nar.broken.headline')
          : voice === 'warming'
            ? tx(locale, 'weekly.nar.warming.headline')
            : voice === 'habit'
              ? tx(locale, 'weekly.nar.habit.headline', { daysPhrase: unitDays(streak.livePlayed, locale) })
              : tx(locale, 'weekly.nar.sparse.headline');

  const p1 =
    voice === 'empty'
      ? tx(locale, 'weekly.nar.empty.p1')
      : voice === 'forgiven'
        ? tx(locale, 'weekly.nar.forgiven.p1', { streak: streak.productStreak, playedPhrase })
        : voice === 'broken'
          ? tx(locale, 'weekly.nar.broken.p1', { playedPhrase })
          : voice === 'warming'
            ? tx(locale, 'weekly.nar.warming.p1', { daysPhrase, sessionsPhrase })
            : voice === 'habit'
              ? tx(locale, 'weekly.nar.habit.p1', { daysPhrase, sessionsPhrase, domains: domainList })
              : tx(locale, 'weekly.nar.sparse.p1', { playedPhrase, sessionsPhrase });

  const defaultP2 =
    voice === 'empty'
      ? tx(locale, 'weekly.nar.empty.p2')
      : voice === 'forgiven'
        ? tx(locale, 'weekly.nar.forgiven.p2')
        : voice === 'broken'
          ? tx(locale, 'weekly.nar.broken.p2')
          : voice === 'warming'
            ? tx(locale, 'weekly.nar.warming.p2')
            : voice === 'habit'
              ? tx(locale, 'weekly.nar.habit.p2')
              : tx(locale, 'weekly.nar.sparse.p2');

  const mixP2 = voice === 'empty' || voice === 'warming' ? null : mixParagraph(mix, domains, locale);
  let p2 = mixP2 || defaultP2;

  if (voice !== 'empty' && transfer.focus) {
    p2 = `${p2} ${tx(locale, 'weekly.nar.focus_hook', { domain: domainName(transfer.focus.domain, locale) })}`;
  } else if (voice !== 'empty' && locale === 'ru' && transfer.insight.kind !== 'warming_up') {
    p2 = `${p2} ${tx(locale, 'weekly.nar.transfer_hook', { title: transfer.insight.title })}`;
  }

  return { voice, headline, paragraphs: [p1, p2] };
}

export function formatWeeklyShareText(report: WeeklyReport): string {
  const lines = [
    'Fokus',
    report.share.headline,
    report.share.period,
    ...report.share.lines.map((row) => `${row.label}: ${row.value}`),
    report.share.footer,
    report.share.disclaimer
  ];
  return lines.join('\n');
}

function buildShare(
  locale: Locale,
  periodLabel: string,
  glance: WeeklyGlance,
  domains: DomainWeekLoad[],
  streak: WeeklyStreakHonesty,
  narrative: WeeklyNarrative
): WeeklySharePayload {
  const trained = domains.filter((d) => d.trained).map((d) => domainName(d.id, locale));
  return {
    headline: narrative.headline,
    period: periodLabel,
    lines: [
      { label: tx(locale, 'weekly.share.days'), value: `${glance.activeDays} / ${WEEK_LENGTH}` },
      { label: tx(locale, 'weekly.share.sessions'), value: String(glance.sessions) },
      {
        label: tx(locale, 'weekly.share.domains'),
        value: trained.length ? trained.join(', ') : tx(locale, 'weekly.share.none')
      },
      { label: tx(locale, 'weekly.share.streak'), value: streak.shareLine }
    ],
    footer: tx(locale, 'weekly.share_footer'),
    disclaimer: tx(locale, 'weekly.share_disclaimer'),
    filename: 'fokus-week.png'
  };
}

export function collectWeeklyCopy(report: WeeklyReport): string[] {
  return [
    report.narrative.headline,
    ...report.narrative.paragraphs,
    report.streak.note,
    report.streak.shareLine,
    ...report.share.lines.map((l) => `${l.label} ${l.value}`),
    report.share.footer,
    report.share.disclaimer,
    report.transfer.insight.title,
    report.transfer.insight.body,
    report.transfer.insight.action
  ];
}

export function buildWeeklyReport(input: WeeklyReportInput): WeeklyReport {
  const now = input.now || new Date();
  const locale: Locale = input.locale === 'en' || input.locale === 'ru' ? input.locale : getLocale();
  const weekKeys = weekDateKeys(now);
  const from = weekKeys[0];
  const to = weekKeys[weekKeys.length - 1];
  const sessions = (input.sessions || []).filter((s) => inWeek(s.startedAt, weekKeys));
  const summaries = (input.daySummaries || []).filter((d) => inWeek(d.date, weekKeys));
  const played = collectPlayedDates(input.sessions || [], input.daySummaries || [], weekKeys);

  const exercises = new Set<string>();
  let durationSec = 0;
  for (const s of sessions) {
    durationSec += s.durationSec || 0;
    for (const item of s.items || []) exercises.add(item.exerciseId);
  }

  const glance: WeeklyGlance = {
    activeDays: played.size,
    sessions: sessions.length,
    exercises: exercises.size,
    minutes: Math.round(durationSec / 60)
  };

  const domainLoads = assessDomainWeek(sessions, summaries, weekKeys, input.domainByExercise);
  const trainedDomainIds = domainLoads.filter((d) => d.trained).map((d) => d.id);
  const neglectedDomainIds = domainLoads.filter((d) => !d.trained).map((d) => d.id);
  const mix = assessWeekMix(domainLoads, glance.sessions);
  const streak = assessStreakHonesty({ weekKeys, played, summaries, locale });
  const empty = glance.sessions === 0 && glance.activeDays === 0;

  const transfer = buildTransferSurface({
    sessions: input.sessions || [],
    daySummaries: input.daySummaries || [],
    domains: input.domains || [],
    now,
    domainByExercise: input.domainByExercise,
    prefer: 'week'
  });

  const periodLabel = formatPeriod(from, to, locale);
  const narrative = composeNarrative(locale, glance, streak, mix, domainLoads, transfer);
  const share = buildShare(locale, periodLabel, glance, domainLoads, streak, narrative);

  return {
    asOf: now.toISOString(),
    from,
    to,
    periodLabel,
    empty,
    locale,
    glance,
    domains: domainLoads,
    trainedDomainIds,
    neglectedDomainIds,
    mix,
    streak,
    narrative,
    transfer,
    share
  };
}

/** Consecutive wording is only honest when the live run has no forgiven hole. */
export function consecutiveClaimAllowed(streak: WeeklyStreakHonesty): boolean {
  return streak.allowsInARow;
}
