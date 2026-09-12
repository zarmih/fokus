import type { ExerciseState, Session, SkillIndex } from './types';
import { getLocale, type Locale } from './i18n';
import {
  calendarDayKey,
  daysBetween,
  resolveFokusTimeZone
} from './streak';

/**
 * G21 mastery-confidence decay + spaced re-probe.
 *
 * This layer does **not** set difficulty. Staircase, IRT and G10 spaced-difficulty
 * remain the sources of truth. We only estimate how fresh the evidence is, decay
 * that confidence over idle calendar days, and propose a soft re-probe when it
 * falls below a band.
 *
 * Confidence ≠ ability. A due re-probe means "we have not checked lately",
 * not "the person got worse" and not a new headline score.
 */

export const MASTERY_EWMA_ALPHA = 0.35;
export const ACCURACY_WEIGHT = 0.7;
export const LATENCY_WEIGHT = 0.3;
export const DEFAULT_TARGET_MS = 1500;
export const HALF_LIFE_DAYS = 8;
export const MIN_OBSERVATIONS = 2;
export const MIN_IDLE_DAYS_DUE = 4;
export const MIN_IDLE_DAYS_WATCH = 3;
export const BAND_HELD = 0.62;
export const BAND_DUE = 0.42;
export const MASS_TAU = 4;
export const MASS_WEIGHT = 0.35;
export const FORM_WEIGHT = 0.65;
export const MAX_REPROBE_PER_RITUAL = 1;
export const SPEED_CLAMP_LO = 0.6;
export const SPEED_CLAMP_HI = 1.25;

export type MasteryBand = 'sparse' | 'held' | 'watch' | 'due';

export interface MasteryCatalogRef {
  id: string;
  domain: string;
  name?: string;
  skills?: string[];
}

export interface MasteryObservation {
  exerciseId: string;
  accuracy: number;
  avgRtMs: number;
  at: string;
  sessionId: string;
}

export interface ExerciseMasteryCard {
  exerciseId: string;
  domain: string;
  name: string;
  samples: number;
  ewma: number;
  /** Undecayed blend of evidence-mass and recent form. */
  baseConfidence: number;
  /** After calendar-day idle decay. Internal 0–1, never shown as a score. */
  confidence: number;
  idleDays: number;
  lastPlayedAt: string | null;
  band: MasteryBand;
  due: boolean;
}

export interface SkillMasteryCard {
  skill: string;
  exerciseIds: string[];
  samples: number;
  confidence: number;
  idleDays: number;
  lastPlayedAt: string | null;
  band: MasteryBand;
  due: boolean;
}

export interface ReprobeProposal {
  exerciseId: string;
  domain: string;
  name: string;
  confidence: number;
  idleDays: number;
  reason: 'confidence-band';
}

export interface MasteryHint {
  title: string;
  body: string;
  line: string;
  aria: string;
  exerciseId: string;
  domain: string;
}

export interface MasteryDecaySnapshot {
  asOf: string;
  ready: boolean;
  cards: ExerciseMasteryCard[];
  skills: SkillMasteryCard[];
  due: ReprobeProposal[];
  watch: ReprobeProposal[];
  hint: MasteryHint | null;
}

export interface RitualPlanItemLike {
  exerciseId: string;
  reason?: string;
}

export interface RitualPlanLike<T extends RitualPlanItemLike = RitualPlanItemLike> {
  focusDomains: string[];
  items: T[];
}

export const MASTERY_SETTINGS_COPY: Record<Locale, { title: string; body: string }> = {
  ru: {
    title: 'Уверенность без практики',
    body: 'Если тренажёр не открывали несколько дней, уверенность в оценке затухает — это про свежесть проверки, а не про «мозг стал хуже». Fokus может предложить мягкий повтор. Лестница сложности, IRT и пауза после пика остаются как были: повтор не меняет высоту, только момент проверки. Это не IQ и не новый балл рядом с Fokus Index.'
  },
  en: {
    title: 'Confidence without practice',
    body: 'If a trainer sits idle for several days, confidence in the estimate fades — that is freshness of evidence, not “your brain got worse”. Fokus may suggest a soft re-probe. The difficulty staircase, IRT and the pause after a hard success stay in charge: a re-probe changes when we check, not how hard the block is. Not IQ, and not a rival score next to Fokus Index.'
  }
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export function latencyToSpeed01(avgRtMs: number, targetMs = DEFAULT_TARGET_MS): number {
  if (!(avgRtMs > 0)) return 1;
  const speed = clamp(targetMs / avgRtMs, SPEED_CLAMP_LO, SPEED_CLAMP_HI);
  return (speed - SPEED_CLAMP_LO) / (SPEED_CLAMP_HI - SPEED_CLAMP_LO);
}

/** Recent block quality from accuracy + latency. Difficulty is intentionally omitted. */
export function masteryEvidence(
  obs: Pick<MasteryObservation, 'accuracy' | 'avgRtMs'>,
  targetMs = DEFAULT_TARGET_MS
): number {
  const acc = clamp01(obs.accuracy);
  const speed01 = latencyToSpeed01(obs.avgRtMs, targetMs);
  return clamp01(ACCURACY_WEIGHT * acc + LATENCY_WEIGHT * speed01);
}

export function ewmaUpdate(prev: number | null, next: number, alpha = MASTERY_EWMA_ALPHA): number {
  const x = clamp01(next);
  if (prev === null || !Number.isFinite(prev)) return x;
  return clamp01((1 - alpha) * prev + alpha * x);
}

export function evidenceMass(samples: number, tau = MASS_TAU): number {
  if (samples <= 0) return 0;
  return clamp01(1 - Math.exp(-samples / Math.max(0.5, tau)));
}

export function blendConfidence(samples: number, ewma: number): number {
  const mass = evidenceMass(samples);
  return clamp01(MASS_WEIGHT * mass + FORM_WEIGHT * clamp01(ewma));
}

export function decayConfidence(base: number, idleDays: number, halfLife = HALF_LIFE_DAYS): number {
  const idle = Math.max(0, idleDays);
  if (idle <= 0) return clamp01(base);
  const hl = Math.max(1, halfLife);
  return clamp01(base * Math.pow(0.5, idle / hl));
}

export function classifyBand(params: {
  samples: number;
  confidence: number;
  idleDays: number;
}): MasteryBand {
  if (params.samples < MIN_OBSERVATIONS) return 'sparse';
  const idle = Math.max(0, params.idleDays);
  const c = clamp01(params.confidence);
  if (idle >= MIN_IDLE_DAYS_DUE && c < BAND_DUE) return 'due';
  if (idle >= MIN_IDLE_DAYS_WATCH && c < BAND_HELD) return 'watch';
  return 'held';
}

function instantMs(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function laterIso(a: string | null, b: string | null): string | null {
  const am = instantMs(a);
  const bm = instantMs(b);
  if (!Number.isFinite(am) && !Number.isFinite(bm)) return b || a;
  if (!Number.isFinite(am)) return b;
  if (!Number.isFinite(bm)) return a;
  return bm >= am ? b : a;
}

export function collectExerciseObservations(
  exerciseId: string,
  sessions: Session[] | undefined
): MasteryObservation[] {
  if (!sessions || sessions.length === 0) return [];
  const out: MasteryObservation[] = [];
  const sorted = [...sessions].sort((a, b) => instantMs(a.startedAt) - instantMs(b.startedAt));
  for (const session of sorted) {
    const items = session.items || [];
    for (const item of items) {
      if (item.exerciseId !== exerciseId) continue;
      out.push({
        exerciseId,
        accuracy: clamp01(item.accuracy),
        avgRtMs: item.avgRtMs,
        at: session.finishedAt || session.startedAt,
        sessionId: session.id
      });
    }
  }
  return out;
}

function lastPlayedFromSessions(exerciseId: string, sessions: Session[] | undefined): string | null {
  const obs = collectExerciseObservations(exerciseId, sessions);
  if (obs.length === 0) return null;
  return obs.reduce<string | null>((latest, row) => laterIso(latest, row.at), null);
}

export function idleCalendarDays(params: {
  lastPlayedAt: string | null;
  now?: Date | string | number;
  timeZone?: string;
}): number {
  if (!params.lastPlayedAt) return 10_000;
  const resolved = resolveFokusTimeZone(params.timeZone);
  const nowInstant =
    params.now === undefined
      ? new Date()
      : params.now instanceof Date
        ? params.now
        : new Date(params.now);
  const now = Number.isNaN(nowInstant.getTime()) ? new Date() : nowInstant;
  const from = calendarDayKey(params.lastPlayedAt, resolved.timeZone);
  const to = calendarDayKey(now, resolved.timeZone);
  return Math.max(0, daysBetween(from, to));
}

function cardName(ref: MasteryCatalogRef | undefined, exerciseId: string): string {
  return (ref?.name && ref.name.trim()) || exerciseId;
}

export function buildExerciseCard(params: {
  ref: MasteryCatalogRef;
  sessions?: Session[];
  states?: ExerciseState[];
  now?: Date | string | number;
  timeZone?: string;
  targetMs?: number;
}): ExerciseMasteryCard {
  const { ref } = params;
  const state = (params.states || []).find((s) => s.exerciseId === ref.id);
  const observations = collectExerciseObservations(ref.id, params.sessions);
  let ewma: number | null = null;
  for (const obs of observations) {
    ewma = ewmaUpdate(ewma, masteryEvidence(obs, params.targetMs));
  }
  if (ewma === null && typeof state?.lastAccuracy === 'number') {
    ewma = masteryEvidence({ accuracy: state.lastAccuracy, avgRtMs: DEFAULT_TARGET_MS });
  }
  const samples = observations.length > 0 ? observations.length : ewma === null ? 0 : 1;
  const form = ewma === null ? 0 : ewma;
  const baseConfidence = samples === 0 ? 0 : blendConfidence(samples, form);
  const lastPlayedAt = laterIso(state?.lastPlayedAt || null, lastPlayedFromSessions(ref.id, params.sessions));
  const idleDays = lastPlayedAt
    ? idleCalendarDays({ lastPlayedAt, now: params.now, timeZone: params.timeZone })
    : samples > 0
      ? 0
      : 10_000;
  const confidence = decayConfidence(baseConfidence, idleDays);
  const band = classifyBand({ samples, confidence, idleDays });
  return {
    exerciseId: ref.id,
    domain: ref.domain,
    name: cardName(ref, ref.id),
    samples,
    ewma: form,
    baseConfidence,
    confidence,
    idleDays,
    lastPlayedAt,
    band,
    due: band === 'due'
  };
}

function toProposal(card: ExerciseMasteryCard): ReprobeProposal {
  return {
    exerciseId: card.exerciseId,
    domain: card.domain,
    name: card.name,
    confidence: card.confidence,
    idleDays: card.idleDays,
    reason: 'confidence-band'
  };
}

function rankDue(a: ExerciseMasteryCard, b: ExerciseMasteryCard): number {
  if (a.confidence !== b.confidence) return a.confidence - b.confidence;
  if (a.idleDays !== b.idleDays) return b.idleDays - a.idleDays;
  return a.exerciseId.localeCompare(b.exerciseId);
}

export function rollupSkillCards(
  cards: ExerciseMasteryCard[],
  catalog: MasteryCatalogRef[]
): SkillMasteryCard[] {
  const bySkill = new Map<string, ExerciseMasteryCard[]>();
  for (const ref of catalog) {
    const skills = ref.skills || [];
    const card = cards.find((c) => c.exerciseId === ref.id);
    if (!card || card.samples <= 0) continue;
    for (const skill of skills) {
      const list = bySkill.get(skill) || [];
      list.push(card);
      bySkill.set(skill, list);
    }
  }
  const out: SkillMasteryCard[] = [];
  for (const [skill, list] of bySkill) {
    const samples = list.reduce((n, c) => n + c.samples, 0);
    const confidence = list.reduce((n, c) => n + c.confidence, 0) / list.length;
    const idleDays = Math.min(...list.map((c) => c.idleDays));
    const lastPlayedAt = list.reduce<string | null>((latest, c) => laterIso(latest, c.lastPlayedAt), null);
    const band = classifyBand({ samples, confidence, idleDays });
    out.push({
      skill,
      exerciseIds: list.map((c) => c.exerciseId),
      samples,
      confidence,
      idleDays,
      lastPlayedAt,
      band,
      due: band === 'due'
    });
  }
  out.sort((a, b) => a.confidence - b.confidence);
  return out;
}

function hintCopy(card: ExerciseMasteryCard, locale: Locale): MasteryHint {
  const name = card.name;
  const n = Math.max(1, Math.round(card.idleDays));
  if (locale === 'en') {
    return {
      title: 'Time to re-check',
      body: `“${name}” has been idle for ${n} days. A short re-probe shows whether the skill still holds — the difficulty staircase stays put.`,
      line: `Re-probe due: ${name} — confidence faded without practice.`,
      aria: `Re-probe due for ${name}. Confidence faded after ${n} idle days. Difficulty is unchanged.`,
      exerciseId: card.exerciseId,
      domain: card.domain
    };
  }
  return {
    title: 'Пора освежить',
    body: `«${name}» не открывали ${n} дн. Короткий повтор покажет, держится ли навык — лестница сложности не сбрасывается.`,
    line: `Пора освежить «${name}» — уверенность просела без практики.`,
    aria: `Пора освежить ${name}. Уверенность просела после ${n} дней без практики. Сложность не меняется.`,
    exerciseId: card.exerciseId,
    domain: card.domain
  };
}

export function computeMasteryDecay(params: {
  catalog?: MasteryCatalogRef[] | null;
  sessions?: Session[];
  states?: ExerciseState[];
  skills?: SkillIndex[];
  now?: Date | string | number;
  timeZone?: string;
  locale?: Locale;
  targetMs?: number;
}): MasteryDecaySnapshot {
  const catalog = params.catalog || [];
  const locale = params.locale || getLocale();
  const nowInstant =
    params.now === undefined
      ? new Date()
      : params.now instanceof Date
        ? params.now
        : new Date(params.now);
  const asOf = (Number.isNaN(nowInstant.getTime()) ? new Date() : nowInstant).toISOString();

  const cards = catalog.map((ref) =>
    buildExerciseCard({
      ref,
      sessions: params.sessions,
      states: params.states,
      now: params.now,
      timeZone: params.timeZone,
      targetMs: params.targetMs
    })
  );

  const dueCards = cards.filter((c) => c.due).sort(rankDue);
  const watchCards = cards.filter((c) => c.band === 'watch').sort(rankDue);
  const due = dueCards.map(toProposal);
  const watch = watchCards.map(toProposal);
  const ready = cards.some((c) => c.samples >= MIN_OBSERVATIONS);
  const hint = dueCards[0] ? hintCopy(dueCards[0], locale) : null;

  return {
    asOf,
    ready,
    cards,
    skills: rollupSkillCards(cards, catalog),
    due,
    watch,
    hint
  };
}

export function scheduleReprobes(
  snapshot: MasteryDecaySnapshot,
  limit = MAX_REPROBE_PER_RITUAL
): ReprobeProposal[] {
  const cap = Math.max(0, Math.floor(limit));
  return snapshot.due.slice(0, cap);
}

export function sparkFromReprobe(
  snapshot: MasteryDecaySnapshot | null | undefined,
  locale?: Locale
): { title: string; body: string; tone: 'focus' } | null {
  if (!snapshot || !snapshot.hint) return null;
  const loc = locale || getLocale();
  const top = snapshot.due[0];
  if (!top) return null;
  const card: ExerciseMasteryCard = {
    exerciseId: top.exerciseId,
    domain: top.domain,
    name: top.name,
    samples: MIN_OBSERVATIONS,
    ewma: top.confidence,
    baseConfidence: top.confidence,
    confidence: top.confidence,
    idleDays: top.idleDays,
    lastPlayedAt: null,
    band: 'due',
    due: true
  };
  const copy = hintCopy(card, loc);
  return { title: copy.title, body: copy.body, tone: 'focus' };
}

/**
 * Soft-insert at most one due re-probe into an already built ritual.
 * Never grows the plan, never replaces the first slot, never touches difficulty.
 * No-op when disallowed, empty, or the due exercise is already present.
 */
export function applyReprobeBias<T extends RitualPlanItemLike>(
  plan: RitualPlanLike<T>,
  snapshot: MasteryDecaySnapshot | null | undefined,
  opts?: { allow?: boolean; locale?: Locale }
): { focusDomains: string[]; items: T[]; applied: boolean; insertedId: string | null } {
  const allow = opts?.allow !== false;
  if (!allow || !snapshot || !plan.items.length) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false, insertedId: null };
  }
  const proposal = scheduleReprobes(snapshot, MAX_REPROBE_PER_RITUAL)[0];
  if (!proposal) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false, insertedId: null };
  }
  const locale = opts?.locale || getLocale();
  const reason =
    locale === 'en'
      ? 'Soft re-probe — confidence faded without practice'
      : 'Мягкий повтор — уверенность просела без практики';

  const already = plan.items.findIndex((item) => item.exerciseId === proposal.exerciseId);
  if (already >= 0) {
    const items = plan.items.map((item, i) => (i === already ? { ...item, reason } : item));
    return {
      focusDomains: plan.focusDomains,
      items,
      applied: items[already].reason !== plan.items[already].reason,
      insertedId: null
    };
  }
  if (plan.items.length < 2) {
    return { focusDomains: plan.focusDomains, items: plan.items, applied: false, insertedId: null };
  }
  const last = plan.items.length - 1;
  const items = plan.items.map((item, i) =>
    i === last ? { ...item, exerciseId: proposal.exerciseId, reason } : item
  );
  const focus = plan.focusDomains.includes(proposal.domain)
    ? plan.focusDomains
    : [...plan.focusDomains, proposal.domain];
  return { focusDomains: focus, items, applied: true, insertedId: proposal.exerciseId };
}
