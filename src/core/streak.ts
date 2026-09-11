/**
 * G8 session-write helper (unchanged): one calendar skip still increments the
 * stored DaySummary.streak. G11 honest UI does **not** use this number —
 * see computeDayStreak() and HABIT_STREAK_G11.md.
 */
export function nextStreak(prevDateStr: string | null, prevStreak: number, todayDateStr: string): {streak: number, skipped: boolean} {
  if (!prevDateStr) return {streak: 1, skipped: false};
  const prevDate = new Date(prevDateStr);
  const todayDate = new Date(todayDateStr);
  prevDate.setHours(0,0,0,0);
  todayDate.setHours(0,0,0,0);
  
  const diffTime = todayDate.getTime() - prevDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return {streak: prevStreak, skipped: false};
  if (diffDays === 1) return {streak: prevStreak + 1, skipped: false};
  if (diffDays === 2) return {streak: prevStreak + 1, skipped: true};
  return {streak: 1, skipped: false};
}

/** Preferred civil zone for day-played accounting. */
export const PREFERRED_TIME_ZONE = 'Europe/Moscow';

export type TimeZoneSource = 'explicit' | 'europe-moscow' | 'utc-fallback';

export interface ResolvedTimeZone {
  timeZone: string;
  source: TimeZoneSource;
}

const CIVIL_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function timeZoneSupported(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Europe/Moscow when the runtime IANA DB has it; otherwise UTC.
 * Callers may pass an explicit zone (tests). The fallback is documented, not silent.
 */
export function resolveFokusTimeZone(explicit?: string): ResolvedTimeZone {
  if (explicit && timeZoneSupported(explicit)) {
    return { timeZone: explicit, source: 'explicit' };
  }
  if (timeZoneSupported(PREFERRED_TIME_ZONE)) {
    return { timeZone: PREFERRED_TIME_ZONE, source: 'europe-moscow' };
  }
  return { timeZone: 'UTC', source: 'utc-fallback' };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** YYYY-MM-DD in `timeZone` for an instant. Date-only strings are returned as-is. */
export function calendarDayKey(instant: Date | string, timeZone: string): string {
  if (typeof instant === 'string') {
    const trimmed = instant.trim();
    const civil = trimmed.match(CIVIL_DAY);
    if (civil) return `${civil[1]}-${civil[2]}-${civil[3]}`;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      const prefix = trimmed.slice(0, 10);
      if (CIVIL_DAY.test(prefix)) return prefix;
      return trimmed.slice(0, 10);
    }
    instant = parsed;
  }
  if (Number.isNaN(instant.getTime())) return '1970-01-01';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(instant);
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function utcNoonMs(day: string): number {
  const m = day.match(CIVIL_DAY);
  if (!m) return 0;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/** Signed whole days between two civil dates (YYYY-MM-DD). */
export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((utcNoonMs(toDay) - utcNoonMs(fromDay)) / 86_400_000);
}

export function addCalendarDays(day: string, delta: number): string {
  const m = day.match(CIVIL_DAY);
  if (!m) return day;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + delta, 12, 0, 0));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export interface PlayedDaySignals {
  daySummaries?: { date: string }[];
  sessions?: { startedAt: string; finishedAt?: string | null }[];
  history?: { date: string }[];
}

/** Unique sorted civil days that already have a session / summary / history row. */
export function extractPlayedDays(signals: PlayedDaySignals, timeZone: string): string[] {
  const set = new Set<string>();
  const add = (raw?: string | null) => {
    if (!raw) return;
    const key = calendarDayKey(raw, timeZone);
    if (CIVIL_DAY.test(key)) set.add(key);
  };
  for (const row of signals.daySummaries || []) add(row.date);
  for (const row of signals.sessions || []) {
    add(row.startedAt);
    if (row.finishedAt) add(row.finishedAt);
  }
  for (const row of signals.history || []) add(row.date);
  return [...set].sort();
}

export type DayStreakStatus =
  | 'empty'
  | 'active'
  | 'open'
  | 'soft_return'
  | 'returned'
  | 'fresh_start';

export interface DayStreak {
  /** Consecutive played civil days ending today (or yesterday if today is still open). */
  current: number;
  longest: number;
  lastPlayedDay: string | null;
  playedToday: boolean;
  /** 0 = today, 1 = yesterday, …; null if never played. */
  daysSinceLastPlay: number | null;
  /**
   * Fully elapsed missed days since last play.
   * Yesterday-only (today still open) is 0 — the day is not over.
   */
  openMisses: number;
  status: DayStreakStatus;
}

export function longestConsecutive(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...new Set(days)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap === 0) continue;
    if (gap === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

function consecutiveEndingOn(played: Set<string>, endDay: string): number {
  if (!played.has(endDay)) return 0;
  let n = 0;
  let d = endDay;
  while (played.has(d)) {
    n += 1;
    d = addCalendarDays(d, -1);
  }
  return n;
}

/**
 * Honest day-played streak. A 1–2 day gap resets `current` to 0.
 * Soft recovery lives in continuity.ts (ritual bias), not in this number.
 */
export function computeDayStreak(playedDays: string[], today: string): DayStreak {
  const unique = [...new Set(playedDays)].sort();
  if (unique.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastPlayedDay: null,
      playedToday: false,
      daysSinceLastPlay: null,
      openMisses: 0,
      status: 'empty'
    };
  }

  const played = new Set(unique);
  const lastPlayedDay = unique[unique.length - 1];
  const playedToday = played.has(today);
  const daysSinceLastPlay = daysBetween(lastPlayedDay, today);
  // Yesterday (today still open) is not a completed miss. 2 days ago → 1 miss.
  const openMisses = playedToday ? 0 : Math.max(0, daysSinceLastPlay - 1);

  const endDay = playedToday ? today : addCalendarDays(today, -1);
  const current = consecutiveEndingOn(played, endDay);
  const longest = longestConsecutive(unique);

  const yesterday = addCalendarDays(today, -1);
  const hadRecentBeforeGap = played.has(addCalendarDays(today, -2)) || played.has(addCalendarDays(today, -3));
  const returnedToday = playedToday && !played.has(yesterday) && hadRecentBeforeGap;

  let status: DayStreakStatus;
  if (returnedToday) status = 'returned';
  else if (playedToday) status = 'active';
  else if (daysSinceLastPlay === 1) status = 'open';
  else if (openMisses >= 1 && openMisses <= 2) status = 'soft_return';
  else status = 'fresh_start';

  return {
    current,
    longest,
    lastPlayedDay,
    playedToday,
    daysSinceLastPlay,
    openMisses,
    status
  };
}
