/**
 * G23 next-session load advisor.
 *
 * Pure: no DOM, no storage, no exercises, no registry.
 * Composes with G8 recovery (EWMA load), G4 retention (fatigue / neglect / gap),
 * optional G15 skip/churn + reengagement floor, optional G16 fortnight focus.
 * Does not recompute duel matchmaking or fortnight EWMA.
 */

import type { DaySummary, DomainIndex, Session } from './types';
import { domainLabel } from './labels';
import {
  estimateRecovery,
  type RecoveryRecommendation,
  type RecoverySnapshot
} from './recovery';
import {
  assessRetention,
  type RetentionSnapshot
} from './retention';

/** Tomorrow / next-session load. `normal` is G8 `steady`; `stretch` is G8 `push-hard`. */
export type TomorrowLoadBand = 'rest-light' | 'normal' | 'stretch';

/**
 * G20 situation ids we tag so ritual-copy can consume this card later.
 * We do not fork the G20 template catalog.
 */
export type AdvisorSituation =
  | 'fatigue_rest'
  | 'fatigue_pre'
  | 'focus_day'
  | 'day_done'
  | 'post_miss_comeback';

export type AdvisorQuietReason = 'uncalibrated' | 'insufficient-sessions';
export type AdvisorFocusSource =
  | 'fortnight'
  | 'neglect'
  | 'weak'
  | 'goal'
  | 'contrast'
  | 'continue';

export const MIN_ADVISOR_SESSIONS = 2;
export const FATIGUE_LOUD = 55;
export const SKIP_REST = 0.55;
export const SKIP_NO_STRETCH = 0.4;
export const CHURN_REST = 0.5;
export const LONG_GAP_DAYS = 5;
export const REENTRY_GAP_DAYS = 2;
export const CLEAN_REST_QUALITY = 62;

/** Claims and FOMO we never emit. Same spirit as G20; not a copy-catalog fork. */
export const FORBIDDEN_ADVISOR_COPY_RE =
  /повышает IQ|вырастет IQ|станет гением|гарантированно|лечит СДВГ|прокачает мозг|прокачай мозг|супермозг|нейрофитнес|возраст мозга|не пропусти|last chance|you're on fire|you’re on fire|отработай|штраф|brain age|percentile/i;

export interface FortnightFocusHint {
  domainId: string;
  why?: string;
  reasonKind?: string;
}

export interface AdvisorFocus {
  domainId: string;
  label: string;
  reason: string;
  source: AdvisorFocusSource;
}

export interface AdvisorCopy {
  title: string;
  body: string;
  tone: 'habit' | 'focus' | 'recovery';
  situation: AdvisorSituation;
}

export interface RetentionAdvice {
  asOf: string;
  ready: boolean;
  quietReason: AdvisorQuietReason | null;
  band: TomorrowLoadBand;
  confidence: RecoverySnapshot['confidence'];
  loadEwma: number;
  qualityEwma: number;
  focuses: AdvisorFocus[];
  copy: AdvisorCopy;
  reasons: string[];
  /** Hours-until-tomorrow is not a second EWMA — we decide from today's signals. */
  playedToday: boolean;
  gapDays: number;
}

export interface RetentionAdvisorInput {
  sessions: Session[];
  daySummaries: DaySummary[];
  domains: DomainIndex[];
  playedToday: boolean;
  streak: number;
  skippedYesterday?: boolean;
  calibrated?: boolean;
  primaryGoal?: string;
  nowIso?: string;
  plannedDurationSec?: number;
  sessionLengthSec?: number;
  shieldCharges?: number;
  /** Optional G8 snapshot if the caller already computed it. */
  recovery?: RecoverySnapshot;
  /** Optional G4/G15 snapshot if the caller already computed it. */
  retention?: RetentionSnapshot;
  /** Optional G16 fortnight focus — used as-is, never recomputed here. */
  fortnightFocus?: FortnightFocusHint | null;
  /** Exercise id → domain. From catalog manifests on the screen; core stays catalog-free. */
  domainByExercise?: Record<string, string>;
}

/** Duck-typed G15 extras so this module still compiles before that PR lands. */
interface G15RiskModel {
  skipProbability?: number;
  churnProbability?: number;
}

interface G15Floor {
  multiplier?: number;
}

interface G15Reengagement {
  floor?: G15Floor;
}

type RetentionWithG15 = RetentionSnapshot & {
  riskModel?: G15RiskModel;
  reengagement?: G15Reengagement;
};

export function loadBandLabel(band: TomorrowLoadBand): string {
  if (band === 'rest-light') return 'короче';
  if (band === 'stretch') return 'можно сложнее';
  return 'обычный';
}

export function advisorConfidenceLabel(c: RecoverySnapshot['confidence']): string {
  if (c === 'high') return 'уверенная оценка';
  if (c === 'medium') return 'набираем данные';
  return 'мало наблюдений';
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function scoredSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => (s.items || []).length > 0);
}

function todaySessionCount(sessions: Session[], today: string): number {
  return scoredSessions(sessions).filter((s) => dayKey(s.startedAt) === today).length;
}

function lastSessionDomains(sessions: Session[], map: Record<string, string>): string[] {
  const done = [...scoredSessions(sessions)].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const last = done[done.length - 1];
  if (!last) return [];
  const ids: string[] = [];
  for (const item of last.items) {
    const d = map[item.exerciseId];
    if (d && !ids.includes(d)) ids.push(d);
  }
  return ids;
}

function signalScore(snap: RetentionSnapshot | undefined, id: string): number {
  return snap?.signals.find((s) => s.id === id)?.score ?? 0;
}

function readSkip(snap: RetentionSnapshot | undefined): number | null {
  const p = (snap as RetentionWithG15 | undefined)?.riskModel?.skipProbability;
  return typeof p === 'number' && Number.isFinite(p) ? p : null;
}

function readChurn(snap: RetentionSnapshot | undefined): number | null {
  const p = (snap as RetentionWithG15 | undefined)?.riskModel?.churnProbability;
  return typeof p === 'number' && Number.isFinite(p) ? p : null;
}

function readFloorMultiplier(snap: RetentionSnapshot | undefined): number | null {
  const m = (snap as RetentionWithG15 | undefined)?.reengagement?.floor?.multiplier;
  return typeof m === 'number' && Number.isFinite(m) ? m : null;
}

function mapRecoveryBand(rec: RecoveryRecommendation): TomorrowLoadBand {
  if (rec === 'rest-light') return 'rest-light';
  if (rec === 'push-hard') return 'stretch';
  return 'normal';
}

function situationFor(band: TomorrowLoadBand, playedToday: boolean, gapDays: number): AdvisorSituation {
  if (band === 'rest-light') return playedToday ? 'fatigue_rest' : 'fatigue_pre';
  if (band === 'stretch') return 'focus_day';
  if (!playedToday && gapDays >= 3) return 'post_miss_comeback';
  return playedToday ? 'day_done' : 'focus_day';
}

function toneFor(band: TomorrowLoadBand): AdvisorCopy['tone'] {
  if (band === 'rest-light') return 'recovery';
  if (band === 'stretch') return 'focus';
  return 'habit';
}

function focusPhrase(focuses: AdvisorFocus[]): string {
  if (focuses.length === 0) return '';
  if (focuses.length === 1) return `«${focuses[0].label}»`;
  return `«${focuses[0].label}» и «${focuses[1].label}»`;
}

export function composeAdvisorCopy(params: {
  band: TomorrowLoadBand;
  focuses: AdvisorFocus[];
  playedToday: boolean;
  gapDays: number;
}): AdvisorCopy {
  const situation = situationFor(params.band, params.playedToday, params.gapDays);
  const tone = toneFor(params.band);
  const focus = focusPhrase(params.focuses);
  const focusTail = focus ? ` Фокус: ${focus}.` : '';

  if (params.band === 'rest-light') {
    return {
      title: 'Завтра короче',
      body:
        (params.playedToday
          ? 'Нагрузка ещё высокая. Короткий ритуал завтра сохранит ритм лучше второго захода сегодня.'
          : 'Нагрузка за последние дни высокая. Завтра короткий подход — нормальный выбор, не откат.') +
        focusTail,
      tone,
      situation
    };
  }

  if (params.band === 'stretch') {
    return {
      title: 'Завтра можно чуть сложнее',
      body:
        'Качество ритуалов ровное, запас по нагрузке есть. Можно чуть длиннее обычного — без марафона.' +
        focusTail,
      tone,
      situation
    };
  }

  if (situation === 'post_miss_comeback') {
    return {
      title: 'Завтра обычный ритуал',
      body:
        'Пауза не обнуляет навык. Завтра обычная длина, без навёрстывания пропущенных дней.' + focusTail,
      tone,
      situation
    };
  }

  return {
    title: 'Завтра обычный ритуал',
    body:
      (params.playedToday
        ? 'Когнитивные навыки растут от регулярности, не от марафонов. Завтра — обычный набор блоков.'
        : 'Нагрузка и качество в норме. Завтра обычный ритуал — лучший следующий шаг.') + focusTail,
    tone,
    situation
  };
}

function pickFocuses(params: {
  band: TomorrowLoadBand;
  domains: DomainIndex[];
  retention?: RetentionSnapshot;
  fortnightFocus?: FortnightFocusHint | null;
  primaryGoal?: string;
  lastDomains: string[];
}): AdvisorFocus[] {
  const out: AdvisorFocus[] = [];
  const seen = new Set<string>();

  const add = (focus: AdvisorFocus | null | undefined) => {
    if (!focus || !focus.domainId || seen.has(focus.domainId) || out.length >= 2) return;
    seen.add(focus.domainId);
    out.push(focus);
  };

  const ready = params.domains.filter((d) => d.value > 0);

  if (params.fortnightFocus?.domainId) {
    add({
      domainId: params.fortnightFocus.domainId,
      label: domainLabel(params.fortnightFocus.domainId),
      reason: params.fortnightFocus.why || 'фокус двух недель — самая тихая область с данными',
      source: 'fortnight'
    });
  }

  const neglected = params.retention?.neglectedDomain;
  if (neglected) {
    add({
      domainId: neglected,
      label: domainLabel(neglected),
      reason: 'давно не было блоков в этой области',
      source: 'neglect'
    });
  }

  const weakest = [...ready].sort((a, b) => a.value - b.value)[0];
  if (weakest) {
    add({
      domainId: weakest.domain,
      label: domainLabel(weakest.domain),
      reason: 'сейчас самая тихая из областей с оценкой',
      source: 'weak'
    });
  }

  if (params.primaryGoal && params.primaryGoal !== 'balance') {
    add({
      domainId: params.primaryGoal,
      label: domainLabel(params.primaryGoal),
      reason: 'ваша цель в профиле',
      source: 'goal'
    });
  }

  if (params.band === 'stretch' && params.lastDomains[0]) {
    add({
      domainId: params.lastDomains[0],
      label: domainLabel(params.lastDomains[0]),
      reason: 'продолжить вчерашнюю область, раз запас есть',
      source: 'continue'
    });
  }

  if (params.band === 'rest-light' && params.lastDomains.length > 0 && out[0]?.source !== 'fortnight') {
    const last = params.lastDomains[0];
    const other = ready.find((d) => d.domain !== last && !seen.has(d.domain))
      || ready.find((d) => d.domain !== last);
    if (other && (out.length === 0 || out[0].domainId === last)) {
      const contrast: AdvisorFocus = {
        domainId: other.domain,
        label: domainLabel(other.domain),
        reason: 'другая область — разгрузка, не марафон в той же',
        source: 'contrast'
      };
      if (out[0]?.domainId === last) {
        seen.delete(last);
        out[0] = contrast;
        seen.add(other.domain);
        if (out[1]?.domainId === other.domain) out.splice(1, 1);
      } else {
        add(contrast);
      }
    }
  }

  return out.slice(0, 2);
}

function pickBand(params: {
  recovery: RecoverySnapshot;
  retention?: RetentionSnapshot;
  playedToday: boolean;
  todayCount: number;
  gapDays: number;
}): { band: TomorrowLoadBand; reasons: string[] } {
  const { recovery, retention, playedToday, todayCount, gapDays } = params;
  const reasons: string[] = [];
  const stretchBlocks: string[] = [];

  const fatigue = signalScore(retention, 'session_fatigue');
  const skip = readSkip(retention);
  const churn = readChurn(retention);
  const floorMul = readFloorMultiplier(retention);
  const lastQuality = recovery.lastQuality?.score ?? null;
  const lastTwoWeak =
    recovery.qualities.length >= 2 && recovery.qualities.slice(-2).every((r) => r.quality.score < 58);
  const qualityDrop =
    lastQuality !== null &&
    lastQuality < 70 &&
    lastQuality <= recovery.qualityEwma - 12;

  if (gapDays >= LONG_GAP_DAYS) reasons.push('long-gap');
  if ((skip !== null && skip >= SKIP_REST) || (churn !== null && churn >= CHURN_REST)) {
    reasons.push('skip-risk');
  }
  if (playedToday && (fatigue >= FATIGUE_LOUD || todayCount >= 2)) reasons.push('session-fatigue');
  if (lastTwoWeak) reasons.push('weak-pair');
  if (qualityDrop) reasons.push('quality-drop');
  if (recovery.consecutiveDays >= 5 && recovery.loadEwma >= 50) reasons.push('dense-week');
  if (recovery.loadEwma >= 68 && !(playedToday && recovery.recommendation === 'rest-light' && todayCount <= 1)) {
    reasons.push('high-load');
  }

  if (gapDays >= REENTRY_GAP_DAYS) stretchBlocks.push('reentry');
  if (skip !== null && skip >= SKIP_NO_STRETCH) stretchBlocks.push('skip-cap');
  if (floorMul !== null && floorMul < 1) stretchBlocks.push('difficulty-floor');
  if (recovery.consecutiveDays >= 4) stretchBlocks.push('streak-load');

  const cleanRestToday =
    playedToday &&
    recovery.recommendation === 'rest-light' &&
    (lastQuality ?? 0) >= CLEAN_REST_QUALITY &&
    todayCount <= 1 &&
    fatigue < FATIGUE_LOUD;

  let band = mapRecoveryBand(recovery.recommendation);

  if (reasons.length > 0 && !cleanRestToday) {
    band = 'rest-light';
  } else if (cleanRestToday && band === 'rest-light') {
    band = 'normal';
    reasons.push('rest-already-taken');
  }

  if (band === 'stretch' && stretchBlocks.length > 0) {
    band = 'normal';
    reasons.push(...stretchBlocks);
  }

  if (reasons.length === 0 && stretchBlocks.length === 0) {
    reasons.push(band === 'stretch' ? 'spare-capacity' : band === 'rest-light' ? 'recovery-gate' : 'steady');
  }

  return { band, reasons };
}

/**
 * Predict tomorrow's load band and 1–2 domain focuses from local history.
 * Silent below two scored sessions or before calibration.
 */
export function adviseNextLoad(input: RetentionAdvisorInput): RetentionAdvice {
  const nowIso = input.nowIso || new Date().toISOString();
  const today = dayKey(nowIso);
  const sessions = input.sessions || [];
  const scored = scoredSessions(sessions);
  const planned = input.plannedDurationSec ?? input.sessionLengthSec ?? 300;

  const emptyCopy = composeAdvisorCopy({ band: 'normal', focuses: [], playedToday: input.playedToday, gapDays: 0 });

  if (input.calibrated === false) {
    return {
      asOf: nowIso,
      ready: false,
      quietReason: 'uncalibrated',
      band: 'normal',
      confidence: 'low',
      loadEwma: 0,
      qualityEwma: 0,
      focuses: [],
      copy: emptyCopy,
      reasons: ['uncalibrated'],
      playedToday: input.playedToday,
      gapDays: 0
    };
  }

  if (scored.length < MIN_ADVISOR_SESSIONS) {
    return {
      asOf: nowIso,
      ready: false,
      quietReason: 'insufficient-sessions',
      band: 'normal',
      confidence: 'low',
      loadEwma: 0,
      qualityEwma: 0,
      focuses: [],
      copy: emptyCopy,
      reasons: ['insufficient-sessions'],
      playedToday: input.playedToday,
      gapDays: 0
    };
  }

  const recovery =
    input.recovery ||
    estimateRecovery({
      sessions,
      daySummaries: input.daySummaries,
      plannedDurationSec: planned,
      nowIso
    });

  let retention = input.retention;
  if (!retention) {
    try {
      retention = assessRetention({
        daySummaries: input.daySummaries,
        sessions,
        domains: input.domains,
        playedToday: input.playedToday,
        streak: input.streak,
        skippedYesterday: input.skippedYesterday,
        sessionLengthSec: input.sessionLengthSec ?? planned,
        shieldCharges: input.shieldCharges,
        now: new Date(nowIso)
      });
    } catch {
      retention = undefined;
    }
  }

  const gapDays = retention?.gapDays ?? 0;
  const todayCount = todaySessionCount(sessions, today);
  const { band, reasons } = pickBand({
    recovery,
    retention,
    playedToday: input.playedToday,
    todayCount,
    gapDays
  });

  const lastDomains = lastSessionDomains(sessions, input.domainByExercise || {});
  const focuses = pickFocuses({
    band,
    domains: input.domains,
    retention,
    fortnightFocus: input.fortnightFocus,
    primaryGoal: input.primaryGoal,
    lastDomains
  });

  const copy = composeAdvisorCopy({
    band,
    focuses,
    playedToday: input.playedToday,
    gapDays
  });

  return {
    asOf: nowIso,
    ready: true,
    quietReason: null,
    band,
    confidence: recovery.confidence,
    loadEwma: recovery.loadEwma,
    qualityEwma: recovery.qualityEwma,
    focuses,
    copy,
    reasons,
    playedToday: input.playedToday,
    gapDays
  };
}

export function sparkFromAdvisor(advice: RetentionAdvice): {
  title: string;
  body: string;
  tone: 'start' | 'habit' | 'focus' | 'recovery' | 'science' | 'time';
} | null {
  if (!advice.ready) return null;
  return {
    title: advice.copy.title,
    body: advice.copy.body,
    tone: advice.copy.tone
  };
}

export function collectAdvisorCopy(): string[] {
  const bands: TomorrowLoadBand[] = ['rest-light', 'normal', 'stretch'];
  const out: string[] = [];
  for (const band of bands) {
    for (const playedToday of [true, false]) {
      for (const gapDays of [0, 4]) {
        const copy = composeAdvisorCopy({
          band,
          focuses: [
            { domainId: 'memory', label: 'Память', reason: 'x', source: 'weak' },
            { domainId: 'attention', label: 'Внимание', reason: 'y', source: 'neglect' }
          ],
          playedToday,
          gapDays
        });
        out.push(copy.title, copy.body);
      }
    }
  }
  return out;
}
