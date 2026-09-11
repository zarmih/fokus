import type { DaySummary, ExerciseState, Session } from './types';
import { calculateEMA } from './domains';
import { type TrainingPlan } from './session-builder';
import { planForNow } from './adaptive-plan';
import {
  clamp,
  mean,
  scoreSessions,
  type ScoredSession,
  type SessionQuality
} from './sessionQuality';

export type RecoveryRecommendation = 'rest-light' | 'steady' | 'push-hard';

export interface RitualCatalogItem {
  manifest: { id: string; domain: string; skills?: string[] };
}

export interface RecoveryGate {
  active: boolean;
  targetDurationSec: number | null;
  avoidDomains: string[];
  preferLowerDifficulty: boolean;
  reason: string;
}

export interface RecoveryHint {
  title: string;
  body: string;
  tone: RecoveryRecommendation;
}

export interface RecoverySnapshot {
  qualities: ScoredSession[];
  loadEwma: number;
  qualityEwma: number;
  qualityDelta: number | null;
  lastQuality: SessionQuality | null;
  recommendation: RecoveryRecommendation;
  hint: RecoveryHint;
  confidence: 'low' | 'medium' | 'high';
  consecutiveDays: number;
  gate: RecoveryGate;
  durationSec: number;
}

const LOAD_ALPHA = 0.4;
const QUALITY_ALPHA = 0.35;
const REST_LIGHT_LOAD = 68;
const PUSH_HARD_LOAD = 38;

export function sessionLoad(session: Session, quality: SessionQuality, sameDayCount: number, lifestyle?: DaySummary['lifestyle']): number {
  const durationLoad = clamp(session.durationSec / 600, 0, 1) * 35;
  const difficultyLoad = clamp(quality.sample.meanLevel / 12, 0, 1) * 25;
  const volumeLoad = Math.min(Math.max(0, sameDayCount - 1), 3) * 8;
  const struggleLoad = quality.score < 50 ? 18 : quality.score < 62 ? 8 : 0;
  const churnLoad = quality.sample.interrupted ? 10 : 0;
  const sleepLoad = lifestyle?.sleep === 'low' ? 12 : 0;
  const stressLoad = lifestyle?.stress === 'high' ? 10 : 0;
  return clamp(durationLoad + difficultyLoad + volumeLoad + struggleLoad + churnLoad + sleepLoad + stressLoad, 0, 100);
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function hoursBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, (b - a) / (1000 * 60 * 60));
}

function addUtcDays(isoDay: string, delta: number): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function consecutiveTrainingDays(summaries: DaySummary[], nowIso: string): number {
  const active = new Set(
    summaries.filter((d) => !d.skipped && d.totalScore > 0).map((d) => dayKey(d.date))
  );
  let key = dayKey(nowIso);
  if (!active.has(key)) key = addUtcDays(key, -1);
  let count = 0;
  for (let i = 0; i < 14; i++) {
    if (!active.has(key)) break;
    count++;
    key = addUtcDays(key, -1);
  }
  return count;
}

function lifestyleFor(session: Session, summaries: DaySummary[]): DaySummary['lifestyle'] | undefined {
  const key = dayKey(session.startedAt);
  const hit = [...summaries].reverse().find((d) => dayKey(d.date) === key);
  return hit?.lifestyle;
}

function recentDomainsFrom(sessions: Session[], catalog: RitualCatalogItem[], lastN = 1): string[] {
  const recent = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-lastN);
  const domains = new Set<string>();
  recent.forEach((s) => {
    s.items.forEach((item) => {
      const man = catalog.find((c) => c.manifest.id === item.exerciseId)?.manifest;
      if (man?.domain) domains.add(man.domain);
    });
  });
  return [...domains];
}

function restDecay(load: number, hoursSinceLast: number): number {
  if (hoursSinceLast <= 36) return load;
  const restFactor = clamp((hoursSinceLast - 36) / 72, 0, 1);
  return load * (1 - restFactor) + 28 * restFactor;
}

export function estimateRecovery(params: {
  sessions: Session[];
  daySummaries?: DaySummary[];
  plannedDurationSec: number;
  recoveryHintsEnabled?: boolean;
  nowIso?: string;
  catalog?: RitualCatalogItem[];
}): RecoverySnapshot {
  const nowIso = params.nowIso || new Date().toISOString();
  const summaries = params.daySummaries || [];
  const scored = scoreSessions(params.sessions).slice(-8);
  const enabled = params.recoveryHintsEnabled !== false;

  let loadEwma = 0;
  let qualityEwma = 0;
  const dayCounts: Record<string, number> = {};

  scored.forEach((row, idx) => {
    const session = params.sessions.find((s) => s.id === row.sessionId) || params.sessions[idx];
    const key = dayKey(row.startedAt);
    dayCounts[key] = (dayCounts[key] || 0) + 1;
    const load = session
      ? sessionLoad(session, row.quality, dayCounts[key], lifestyleFor(session, summaries))
      : 40;
    if (idx === 0) {
      loadEwma = load;
      qualityEwma = row.quality.score;
    } else {
      loadEwma = calculateEMA(loadEwma, load, LOAD_ALPHA);
      qualityEwma = calculateEMA(qualityEwma, row.quality.score, QUALITY_ALPHA);
    }
  });

  const lastRow = scored.length ? scored[scored.length - 1] : null;
  if (lastRow) {
    loadEwma = restDecay(loadEwma, hoursBetween(lastRow.startedAt, nowIso));
  }

  const lastQuality = lastRow?.quality || null;
  const prevQuality = scored.length >= 2 ? scored[scored.length - 2].quality.score : null;
  const qualityDelta = lastQuality && prevQuality !== null ? lastQuality.score - prevQuality : null;

  const consecutiveDays = consecutiveTrainingDays(summaries, nowIso);
  const lastTwoWeak =
    scored.length >= 2 &&
    scored.slice(-2).every((r) => r.quality.score < 58);

  const lastLifestyle = summaries.length ? summaries[summaries.length - 1].lifestyle : undefined;
  const lifestyleStrain =
    (lastLifestyle?.sleep === 'low' || lastLifestyle?.stress === 'high') &&
    (loadEwma >= 45 || (lastQuality && lastQuality.score < 65));

  let recommendation: RecoveryRecommendation = 'steady';
  let confidence: RecoverySnapshot['confidence'] = scored.length >= 4 ? 'high' : scored.length >= 2 ? 'medium' : 'low';

  const qualityDrop =
    lastQuality !== null && lastQuality.score < 70 && lastQuality.score <= qualityEwma - 12;

  if (scored.length >= 2) {
    if (
      loadEwma >= REST_LIGHT_LOAD ||
      qualityDrop ||
      lastTwoWeak ||
      (consecutiveDays >= 5 && loadEwma >= 50) ||
      lifestyleStrain
    ) {
      recommendation = 'rest-light';
    } else if (
      loadEwma <= PUSH_HARD_LOAD &&
      qualityEwma >= 72 &&
      (qualityDelta === null || qualityDelta >= -3) &&
      consecutiveDays <= 3
    ) {
      recommendation = 'push-hard';
    }
  }

  const hint = hintFor(recommendation, {
    sample: scored.length,
    loadEwma,
    qualityEwma,
    lastScore: lastQuality?.score ?? null,
    consecutiveDays
  });

  const avoidDomains = params.catalog
    ? recentDomainsFrom(params.sessions, params.catalog, 1)
    : [];

  const shorter = shorterDuration(params.plannedDurationSec);
  const gateActive = enabled && recommendation === 'rest-light';
  const gate: RecoveryGate = gateActive
    ? {
        active: true,
        targetDurationSec: shorter,
        avoidDomains,
        preferLowerDifficulty: true,
        reason: hint.body
      }
    : {
        active: false,
        targetDurationSec: null,
        avoidDomains: [],
        preferLowerDifficulty: false,
        reason: ''
      };

  return {
    qualities: scored,
    loadEwma: Math.round(loadEwma),
    qualityEwma: Math.round(qualityEwma),
    qualityDelta,
    lastQuality,
    recommendation,
    hint,
    confidence,
    consecutiveDays,
    gate,
    durationSec: gateActive && gate.targetDurationSec ? gate.targetDurationSec : params.plannedDurationSec
  };
}

function shorterDuration(planned: number): number {
  if (planned > 300) return 300;
  return planned;
}

function hintFor(
  rec: RecoveryRecommendation,
  ctx: { sample: number; loadEwma: number; qualityEwma: number; lastScore: number | null; consecutiveDays: number }
): RecoveryHint {
  if (ctx.sample < 2) {
    return {
      title: 'Пока мало данных',
      body: 'Качество сессии появится после нескольких ритуалов. Это не балл способностей, а то, насколько чисто прошёл подход.',
      tone: 'steady'
    };
  }
  if (rec === 'rest-light') {
    if (ctx.lastScore !== null && ctx.lastScore < 60) {
      return {
        title: 'Сегодня короче',
        body: 'Последние ритуалы были плотными, а качество просело. Пять минут в другой области сохранят форму лучше, чем ещё один длинный заход.',
        tone: 'rest-light'
      };
    }
    return {
      title: 'Сегодня короче',
      body: 'Нагрузка за последние дни высокая. Короткий ритуал — нормальный выбор, не откат.',
      tone: 'rest-light'
    };
  }
  if (rec === 'push-hard') {
    return {
      title: 'Можно чуть сложнее',
      body: 'Качество ритуалов ровное, запас по нагрузке есть. Сегодня можно оставить вашу обычную длительность.',
      tone: 'push-hard'
    };
  }
  return {
    title: 'Держать ритм',
    body: 'Нагрузка и качество в норме. Обычный ритуал — лучший следующий шаг.',
    tone: 'steady'
  };
}

/**
 * Post-process a training plan. No-op when the gate is inactive, the catalog is
 * empty, or there is nothing eligible to swap — so unmerged program/adaptive
 * PRs cannot break this path.
 */
export function applyRecoveryGate(params: {
  plan: TrainingPlan;
  catalog: RitualCatalogItem[];
  states?: ExerciseState[];
  gate: RecoveryGate;
}): TrainingPlan {
  const { plan, catalog, gate } = params;
  const states = params.states || [];
  if (!gate.active) return plan;
  if (!catalog.length || plan.items.length === 0) return plan;

  const selected = new Set(plan.items.map((i) => i.exerciseId));
  let changed = false;

  const items = plan.items.map((item) => {
    const current = catalog.find((c) => c.manifest.id === item.exerciseId)?.manifest;
    const inAvoid = current ? gate.avoidDomains.includes(current.domain) : false;
    if (!inAvoid) return item;

    const outsideAvoid = catalog.filter((c) => {
      if (selected.has(c.manifest.id)) return false;
      if (gate.avoidDomains.includes(c.manifest.domain)) return false;
      return true;
    });
    const anyOther = catalog.filter((c) => !selected.has(c.manifest.id) && c.manifest.id !== item.exerciseId);
    const pool = outsideAvoid.length > 0 ? outsideAvoid : inAvoid ? anyOther : [];
    if (pool.length === 0) return item;

    const ranked = [...pool].sort((a, b) => {
      if (gate.preferLowerDifficulty) {
        const da = states.find((s) => s.exerciseId === a.manifest.id)?.difficulty ?? 1;
        const db = states.find((s) => s.exerciseId === b.manifest.id)?.difficulty ?? 1;
        if (da !== db) return da - db;
      }
      const aAvoid = gate.avoidDomains.includes(a.manifest.domain) ? 1 : 0;
      const bAvoid = gate.avoidDomains.includes(b.manifest.domain) ? 1 : 0;
      return aAvoid - bAvoid;
    });

    const chosen = ranked[0];
    if (!chosen || chosen.manifest.id === item.exerciseId) return item;
    selected.delete(item.exerciseId);
    selected.add(chosen.manifest.id);
    changed = true;
    return { exerciseId: chosen.manifest.id, reason: 'Другая область — разгрузка' };
  });

  if (!changed) return plan;

  const focusDomains = [
    ...new Set(
      items
        .map((i) => catalog.find((c) => c.manifest.id === i.exerciseId)?.manifest.domain)
        .filter((d): d is string => !!d)
    )
  ];

  return {
    focusDomains: focusDomains.length ? focusDomains : plan.focusDomains,
    items
  };
}

export function planWithRecovery(params: {
  durationSec: number;
  catalog: RitualCatalogItem[];
  domains: { domain: string; value: number; trend?: number; updatedAt?: string }[];
  skills: { skill: string; value: number; trend: number; confidence: number; attempts: number; lastUpdated: string }[];
  states: ExerciseState[];
  primaryGoal?: string;
  sessions: Session[];
  daySummaries?: DaySummary[];
  recoveryHintsEnabled?: boolean;
  nowIso?: string;
  excludeIds?: string[];
}): { plan: TrainingPlan; snapshot: RecoverySnapshot; recalibration: ReturnType<typeof planForNow>['recalibration'] } {
  const snapshot = estimateRecovery({
    sessions: params.sessions,
    daySummaries: params.daySummaries,
    plannedDurationSec: params.durationSec,
    recoveryHintsEnabled: params.recoveryHintsEnabled,
    nowIso: params.nowIso,
    catalog: params.catalog
  });

  const durationSec = snapshot.durationSec;
  const adaptive = planForNow({
    durationSec,
    excludeIds: (params as { excludeIds?: string[] }).excludeIds
  });

  return {
    plan: applyRecoveryGate({
      plan: adaptive as TrainingPlan,
      catalog: params.catalog,
      states: params.states,
      gate: snapshot.gate
    }),
    snapshot,
    recalibration: adaptive.recalibration
  };
}

export function recoveryConfidenceLabel(c: RecoverySnapshot['confidence']): string {
  if (c === 'high') return 'уверенная оценка';
  if (c === 'medium') return 'набираем данные';
  return 'мало наблюдений';
}

export function loadLabel(load: number): string {
  if (load >= 70) return 'высокая';
  if (load >= 45) return 'средняя';
  return 'спокойная';
}

export function meanQuality(qualities: ScoredSession[]): number {
  if (qualities.length === 0) return 0;
  return mean(qualities.map((q) => q.quality.score));
}
