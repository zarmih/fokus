import type { DomainIndex, Profile, Session } from './types';
import { DOMAIN_ORDER, domainLabel } from './labels';

/** First to this many points wins the bout. */
export const BOUT_TARGET_POINTS = 3;
/** Clock length for a standard bout. */
export const BOUT_DURATION_SEC = 60;
/** A round awards a point at or above this accuracy. */
export const POINT_ACCURACY_THRESHOLD = 0.8;
/** Friends can rematch after this pause — no rage-queue. */
export const REMATCH_COOLDOWN_MS = 15 * 60 * 1000;
/** Fokus Index gap (0–999) still considered a fair fight. */
export const FAIR_INDEX_GAP = 80;
export const FAIR_DOMAIN_GAP = 120;
export const MATCH_QUALITY_FAIR = 0.62;
export const MAX_PLAYABLE_INDEX_GAP = 280;
export const DUEL_LAST_SUMMARY_KEY = 'fokus.duel.lastSummary';

export interface Duelant {
  id: string;
  /** Spectator-safe display name (never an email). */
  alias: string;
  fokusIndex: number;
  domainAbility: Record<string, number>;
  lastBoutAt?: string | null;
  /** Recent mean accuracy 0–1. Internal — never copied into spectator structs. */
  recentAccuracy?: number;
  recentRtMs?: number;
  formSample?: number;
}

export type DuelReadinessBand = 'not_ready' | 'warming' | 'ready' | 'sharp';

export interface DuelForm {
  accuracy: number | null;
  rtMs: number | null;
  sample: number;
  domainAbility: number;
}

/**
 * Matchmaking-agnostic fairness of *this* player today.
 * Built from domain ability + recent RT/accuracy. Not Elo, not IQ.
 */
export interface DuelReadiness {
  /** 0–100 fairness / readiness score. */
  fairness: number;
  band: DuelReadinessBand;
  form: DuelForm;
  preferredDomain: string | null;
  /** Mirror match against own ticket would be a fair fight. */
  fairForSelf: boolean;
  evidence: string;
}

/** Spectator-safe ready chip: alias + band, no RT, no ids, no email. */
export interface SpectatorReadyChip {
  alias: string;
  ready: boolean;
  band: DuelReadinessBand;
  domain: string | null;
}

export interface MatchQuality {
  score: number;
  indexGap: number;
  domainGap: number;
  preferredDomain: string;
  fair: boolean;
  playable: boolean;
  /** Extra opening points for the weaker duelant (0 or 1). */
  handicap: number;
  weakerId: string;
}

export interface RankedOpponent {
  opponent: Duelant;
  quality: MatchQuality;
  rematch: RematchStatus;
}

export interface RematchStatus {
  allowed: boolean;
  remainingMs: number;
}

export interface BoutTick {
  playerId: string;
  accuracy: number;
  avgRtMs: number;
  atMs: number;
}

export type BoutReason = 'playing' | 'target' | 'time' | 'forfeit' | 'draw';

export interface BoutState {
  playerIds: [string, string];
  targetPoints: number;
  durationSec: number;
  points: Record<string, number>;
  startedAtMs: number;
  finished: boolean;
  winnerId: string | null;
  reason: BoutReason;
  lastTickAt: number;
}

export interface SpectatorFighter {
  alias: string;
  points: number;
}

export interface SpectatorSummary {
  boutId: string;
  domain: string;
  durationSec: number;
  outcome: 'win' | 'draw';
  winnerAlias: string | null;
  fighters: [SpectatorFighter, SpectatorFighter];
  closeFinish: boolean;
  /** null = unknown (friend-code room, not matchmade). */
  fairMatch: boolean | null;
  /** Optional G15 band. Never includes RT or account ids. */
  readinessBand?: DuelReadinessBand | null;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function pairId(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

export function newBoutId(now: Date = new Date()): string {
  return `bout-${now.getTime().toString(36)}`;
}

/** Strip emails / oversized strings so spectators never see account identifiers. */
export function safeAlias(raw: string | undefined | null, fallback = 'Игрок'): string {
  const text = (raw || '').trim();
  if (!text) return fallback;
  if (text.includes('@')) {
    const local = text.split('@')[0].replace(/[._+]/g, ' ').trim();
    return (local || fallback).slice(0, 24);
  }
  return text.replace(/\s+/g, ' ').slice(0, 24);
}

export function duelantFromLocal(params: {
  profile: Pick<Profile, 'name' | 'displayName'>;
  fokusIndex: number;
  domains: DomainIndex[];
  lastBoutAt?: string | null;
  sessions?: Session[];
}): Duelant {
  const alias = safeAlias(params.profile.displayName || params.profile.name || 'Вы', 'Вы');
  const domainAbility: Record<string, number> = {};
  params.domains.forEach((d) => {
    if (d.value > 0) domainAbility[d.domain] = d.value;
  });
  const form = recentFormFromSessions(params.sessions || []);
  return {
    id: 'local',
    alias,
    fokusIndex: params.fokusIndex,
    domainAbility,
    lastBoutAt: params.lastBoutAt ?? null,
    recentAccuracy: form.accuracy ?? undefined,
    recentRtMs: form.rtMs ?? undefined,
    formSample: form.sample || undefined
  };
}

export function recentFormFromSessions(sessions: Session[], lookback = 4): DuelForm {
  const recent = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-lookback);
  if (recent.length === 0) {
    return { accuracy: null, rtMs: null, sample: 0, domainAbility: 0 };
  }
  const items = recent.flatMap((s) => s.items);
  const accs = items.map((i) => i.accuracy).filter((n) => Number.isFinite(n));
  const rts = items.map((i) => i.avgRtMs).filter((n) => n > 0);
  return {
    accuracy: accs.length ? accs.reduce((s, n) => s + n, 0) / accs.length : null,
    rtMs: rts.length ? Math.round(rts.reduce((s, n) => s + n, 0) / rts.length) : null,
    sample: recent.length,
    domainAbility: 0
  };
}

export function preferredDuelDomain(a: Duelant, b: Duelant): string {
  const shared = DOMAIN_ORDER.filter((id) => id in a.domainAbility && id in b.domainAbility);
  const pool = shared.length > 0 ? shared : [...DOMAIN_ORDER];
  let best = pool[0];
  let bestGap = Number.POSITIVE_INFINITY;
  for (const id of pool) {
    const gap = Math.abs((a.domainAbility[id] ?? 0) - (b.domainAbility[id] ?? 0));
    if (gap < bestGap) {
      bestGap = gap;
      best = id;
    }
  }
  return best;
}

export function matchQuality(a: Duelant, b: Duelant, domain?: string): MatchQuality {
  const preferredDomain = domain && DOMAIN_ORDER.includes(domain as (typeof DOMAIN_ORDER)[number])
    ? domain
    : preferredDuelDomain(a, b);
  const indexGap = Math.abs(a.fokusIndex - b.fokusIndex);
  const domainGap = Math.abs((a.domainAbility[preferredDomain] ?? 0) - (b.domainAbility[preferredDomain] ?? 0));
  const indexScore = clamp(1 - indexGap / 200, 0, 1);
  const domainScore = clamp(1 - domainGap / 300, 0, 1);
  const hasForm = (a.formSample ?? 0) >= 2 && (b.formSample ?? 0) >= 2
    && typeof a.recentAccuracy === 'number' && typeof b.recentAccuracy === 'number';
  let score = 0.65 * indexScore + 0.35 * domainScore;
  if (hasForm) {
    const accGap = Math.abs((a.recentAccuracy ?? 0) - (b.recentAccuracy ?? 0));
    const rtGap = Math.abs((a.recentRtMs ?? 700) - (b.recentRtMs ?? 700));
    const accScore = clamp(1 - accGap / 0.35, 0, 1);
    const rtScore = clamp(1 - rtGap / 800, 0, 1);
    score = 0.5 * indexScore + 0.25 * domainScore + 0.15 * accScore + 0.1 * rtScore;
  }
  const fair = score >= MATCH_QUALITY_FAIR && indexGap <= FAIR_INDEX_GAP + 40 && domainGap <= FAIR_DOMAIN_GAP + 80;
  const playable = indexGap <= MAX_PLAYABLE_INDEX_GAP;
  const weakerId = a.fokusIndex <= b.fokusIndex ? a.id : b.id;
  const handicap = !fair && playable && indexGap > FAIR_INDEX_GAP ? 1 : 0;
  return {
    score: Math.round(score * 1000) / 1000,
    indexGap,
    domainGap,
    preferredDomain,
    fair,
    playable,
    handicap,
    weakerId
  };
}

export function rematchStatus(lastBoutAt: string | null | undefined, now: Date = new Date(), cooldownMs = REMATCH_COOLDOWN_MS): RematchStatus {
  if (!lastBoutAt) return { allowed: true, remainingMs: 0 };
  const then = Date.parse(lastBoutAt);
  if (Number.isNaN(then)) return { allowed: true, remainingMs: 0 };
  const remainingMs = Math.max(0, then + cooldownMs - now.getTime());
  return { allowed: remainingMs === 0, remainingMs };
}

export function rankOpponents(self: Duelant, pool: Duelant[], now: Date = new Date()): RankedOpponent[] {
  return pool
    .filter((opp) => opp.id !== self.id)
    .map((opponent) => ({
      opponent,
      quality: matchQuality(self, opponent),
      rematch: rematchStatus(latestBout(self.lastBoutAt, opponent.lastBoutAt), now)
    }))
    .filter((row) => row.quality.playable)
    .sort((a, b) => {
      if (a.rematch.allowed !== b.rematch.allowed) return a.rematch.allowed ? -1 : 1;
      if (a.quality.fair !== b.quality.fair) return a.quality.fair ? -1 : 1;
      return b.quality.score - a.quality.score;
    });
}

export function awardsPoint(accuracy: number, threshold = POINT_ACCURACY_THRESHOLD): boolean {
  return accuracy >= threshold;
}

export function createBout(
  playerIds: [string, string],
  opts?: {
    targetPoints?: number;
    durationSec?: number;
    startedAtMs?: number;
    openingPoints?: Record<string, number>;
  }
): BoutState {
  const points: Record<string, number> = {
    [playerIds[0]]: opts?.openingPoints?.[playerIds[0]] ?? 0,
    [playerIds[1]]: opts?.openingPoints?.[playerIds[1]] ?? 0
  };
  return {
    playerIds,
    targetPoints: opts?.targetPoints ?? BOUT_TARGET_POINTS,
    durationSec: opts?.durationSec ?? BOUT_DURATION_SEC,
    points,
    startedAtMs: opts?.startedAtMs ?? 0,
    finished: false,
    winnerId: null,
    reason: 'playing',
    lastTickAt: opts?.startedAtMs ?? 0
  };
}

export function openingPoints(quality: MatchQuality, playerIds: [string, string]): Record<string, number> {
  const pts: Record<string, number> = { [playerIds[0]]: 0, [playerIds[1]]: 0 };
  if (quality.handicap > 0) pts[quality.weakerId] = quality.handicap;
  return pts;
}

export function applyTick(state: BoutState, tick: BoutTick): BoutState {
  if (state.finished) return state;
  if (!state.playerIds.includes(tick.playerId)) return state;
  const next: BoutState = {
    ...state,
    points: { ...state.points },
    lastTickAt: tick.atMs
  };
  if (awardsPoint(tick.accuracy)) {
    next.points[tick.playerId] = (next.points[tick.playerId] ?? 0) + 1;
  }
  return settleTarget(next);
}

export function setPoints(state: BoutState, playerId: string, points: number): BoutState {
  if (state.finished) return state;
  if (!state.playerIds.includes(playerId)) return state;
  return assignPoints(state, { [playerId]: points });
}

export function assignPoints(state: BoutState, points: Record<string, number>): BoutState {
  if (state.finished) return state;
  const nextPoints = { ...state.points };
  for (const [id, value] of Object.entries(points)) {
    if (state.playerIds.includes(id)) nextPoints[id] = Math.max(0, Math.round(value));
  }
  return settleTarget({ ...state, points: nextPoints });
}

export function closeOnTime(state: BoutState, nowMs: number): BoutState {
  if (state.finished) return state;
  const elapsed = (nowMs - state.startedAtMs) / 1000;
  if (elapsed < state.durationSec) return state;
  const [a, b] = state.playerIds;
  const pa = state.points[a] ?? 0;
  const pb = state.points[b] ?? 0;
  if (pa === pb) {
    return { ...state, finished: true, winnerId: null, reason: 'draw', lastTickAt: nowMs };
  }
  return {
    ...state,
    finished: true,
    winnerId: pa > pb ? a : b,
    reason: 'time',
    lastTickAt: nowMs
  };
}

export function forfeit(state: BoutState, playerId: string): BoutState {
  if (state.finished) return state;
  const winnerId = state.playerIds.find((id) => id !== playerId) ?? null;
  return { ...state, finished: true, winnerId, reason: 'forfeit' };
}

export function spectatorSummary(params: {
  boutId: string;
  domain: string;
  durationSec: number;
  state: BoutState;
  aliases: Record<string, string>;
  fairMatch: boolean | null;
  readinessBand?: DuelReadinessBand | null;
}): SpectatorSummary {
  const [idA, idB] = params.state.playerIds;
  const fighters: [SpectatorFighter, SpectatorFighter] = [
    { alias: safeAlias(params.aliases[idA], 'Игрок 1'), points: params.state.points[idA] ?? 0 },
    { alias: safeAlias(params.aliases[idB], 'Игрок 2'), points: params.state.points[idB] ?? 0 }
  ];
  const gap = Math.abs(fighters[0].points - fighters[1].points);
  const winnerAlias = params.state.winnerId
    ? safeAlias(params.aliases[params.state.winnerId], fighters[0].points >= fighters[1].points ? fighters[0].alias : fighters[1].alias)
    : null;
  return {
    boutId: params.boutId,
    domain: params.domain,
    durationSec: params.durationSec,
    outcome: params.state.reason === 'draw' || !params.state.winnerId ? 'draw' : 'win',
    winnerAlias: params.state.reason === 'draw' ? null : winnerAlias,
    fighters,
    closeFinish: gap <= 1,
    fairMatch: params.fairMatch,
    readinessBand: params.readinessBand ?? null
  };
}

export function serializeSpectatorSummary(summary: SpectatorSummary): string {
  return JSON.stringify({
    boutId: summary.boutId,
    domain: summary.domain,
    durationSec: summary.durationSec,
    outcome: summary.outcome,
    winnerAlias: summary.winnerAlias,
    fighters: summary.fighters,
    closeFinish: summary.closeFinish,
    fairMatch: summary.fairMatch,
    readinessBand: parseReadinessBand(summary.readinessBand)
  });
}

export function parseSpectatorSummary(raw: string | null | undefined): SpectatorSummary | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SpectatorSummary>;
    if (!data || typeof data.boutId !== 'string') return null;
    if (!Array.isArray(data.fighters) || data.fighters.length !== 2) return null;
    const [a, b] = data.fighters;
    if (!a || !b || typeof a.alias !== 'string' || typeof b.alias !== 'string') return null;
    return {
      boutId: data.boutId,
      domain: typeof data.domain === 'string' ? data.domain : 'attention',
      durationSec: typeof data.durationSec === 'number' ? data.durationSec : BOUT_DURATION_SEC,
      outcome: data.outcome === 'draw' ? 'draw' : 'win',
      winnerAlias: data.winnerAlias ?? null,
      fighters: [
        { alias: safeAlias(a.alias), points: Number(a.points) || 0 },
        { alias: safeAlias(b.alias), points: Number(b.points) || 0 }
      ],
      closeFinish: !!data.closeFinish,
      fairMatch: typeof data.fairMatch === 'boolean' ? data.fairMatch : null,
      readinessBand: parseReadinessBand(data.readinessBand)
    };
  } catch {
    return null;
  }
}

function parseReadinessBand(raw: unknown): DuelReadinessBand | null {
  if (raw === 'not_ready' || raw === 'warming' || raw === 'ready' || raw === 'sharp') return raw;
  return null;
}

export function describeMatch(quality: MatchQuality): string {
  const domain = domainLabel(quality.preferredDomain);
  if (!quality.playable) {
    return `Разрыв Fokus Index слишком велик для честной схватки в «${domain}».`;
  }
  if (quality.fair) {
    return `Близкий уровень · «${domain}» · разрыв индекса ${quality.indexGap}.`;
  }
  if (quality.handicap > 0) {
    return `Неравный уровень · «${domain}». Слабейший начинает с ${quality.handicap} очка — без бонусов-ускорителей.`;
  }
  return `Схватка возможна в «${domain}», но это не зеркальный уровень.`;
}

export function assessDuelReadiness(params: {
  domains: DomainIndex[];
  sessions: Session[];
  fokusIndex: number;
}): DuelReadiness {
  const form = recentFormFromSessions(params.sessions);
  const readyDomains = params.domains.filter((d) => d.value > 0);
  const abilityMean = readyDomains.length
    ? readyDomains.reduce((sum, d) => sum + d.value, 0) / readyDomains.length
    : 0;
  form.domainAbility = Math.round(abilityMean);

  const abilityNorm = clamp(abilityMean / 900, 0, 1);
  const acc = form.accuracy ?? 0.5;
  const rtScore = form.rtMs == null ? 0.5 : clamp(1 - (form.rtMs - 400) / 1500, 0, 1);
  const items = params.sessions.slice(-4).flatMap((s) => s.items);
  const accs = items.map((i) => i.accuracy).filter((n) => Number.isFinite(n));
  const stability = accs.length >= 3 ? 1 - Math.min(1, coeffVar(accs)) : 0.5;

  let fairness = 100 * (0.4 * abilityNorm + 0.3 * acc + 0.2 * rtScore + 0.1 * stability);
  if (form.sample < 2) fairness *= 0.55;
  if (readyDomains.length < 2) fairness *= 0.85;
  fairness = clamp(Math.round(fairness), 0, 100);

  const band = readinessBandFrom(fairness, form.sample);
  const preferred = strongestDomain(params.domains);
  const fairForSelf = fairness >= 55 && form.sample >= 2 && readyDomains.length >= 2;

  return {
    fairness,
    band,
    form,
    preferredDomain: preferred,
    fairForSelf,
    evidence: `fi=${params.fokusIndex} acc=${form.accuracy?.toFixed(2) ?? 'n/a'} rt=${form.rtMs ?? 'n/a'} n=${form.sample}`
  };
}

export function spectatorReadyChip(alias: string, readiness: DuelReadiness): SpectatorReadyChip {
  return {
    alias: safeAlias(alias),
    ready: readiness.band === 'ready' || readiness.band === 'sharp',
    band: readiness.band,
    domain: readiness.preferredDomain
  };
}

export function readinessLabel(band: DuelReadinessBand): string {
  switch (band) {
    case 'not_ready':
      return 'Пока рано';
    case 'warming':
      return 'Форма греется';
    case 'ready':
      return 'К схватке';
    case 'sharp':
      return 'Форма собрана';
  }
}

function readinessBandFrom(fairness: number, sample: number): DuelReadinessBand {
  if (sample < 1 || fairness < 35) return 'not_ready';
  if (fairness < 55) return 'warming';
  if (fairness < 80) return 'ready';
  return 'sharp';
}

function strongestDomain(domains: DomainIndex[]): string | null {
  const ready = domains.filter((d) => d.value > 0);
  if (!ready.length) return null;
  const sorted = [...ready].sort((a, b) => b.value - a.value);
  const id = sorted[0].domain;
  return DOMAIN_ORDER.includes(id as (typeof DOMAIN_ORDER)[number]) ? id : sorted[0].domain;
}

function coeffVar(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, n) => s + n, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((s, n) => s + (n - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function formatCooldown(remainingMs: number): string {
  const sec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s} с`;
  return `${m} мин ${s.toString().padStart(2, '0')} с`;
}

function settleTarget(state: BoutState): BoutState {
  const [a, b] = state.playerIds;
  const pa = state.points[a] ?? 0;
  const pb = state.points[b] ?? 0;
  if (pa >= state.targetPoints || pb >= state.targetPoints) {
    if (pa === pb) {
      return { ...state, finished: true, winnerId: null, reason: 'draw' };
    }
    return {
      ...state,
      finished: true,
      winnerId: pa > pb ? a : b,
      reason: 'target'
    };
  }
  return state;
}

function latestBout(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}
