/**
 * G12 soundscape: named Web Audio cue graph.
 * Pure scheduling — no AudioContext. The renderer in audio.ts plays the result.
 */

export const CUE_IDS = ['tap', 'hit', 'miss', 'combo', 'ritual', 'celebrate'] as const;
export type CueId = (typeof CUE_IDS)[number];

/** Feedback stays under reduce-motion; flourish is skipped or collapsed. */
export type CueKind = 'feedback' | 'flourish';

/** Exclusive-ish buses. A later cue may duck nodes on listed buses. */
export type CueVoice = 'ui' | 'trial' | 'phrase';

export interface CuePartial {
  freq: number;
  freqEnd?: number;
  /** Always 'sine' for the warm timbres; kept open for compatibility. */
  type: OscillatorType;
  /** Total length of the exponential decay, seconds (attack included). */
  dur: number;
  /** Peak gain (before the master bus). */
  gain: number;
  delay: number;
  /** Soft attack, seconds (default {@link DEFAULT_ATTACK}). */
  attack?: number;
  /** Gentle lowpass cutoff in Hz for the cue (default {@link DEFAULT_LOWPASS}). */
  lowpass?: number;
}

export interface CueDef {
  id: CueId;
  kind: CueKind;
  voice: CueVoice;
  /** Cue ids whose in-flight tails are ducked when this node starts. */
  ducks: CueId[];
  haptic: number | number[];
}

export interface CueContext {
  combo?: number;
}

export interface SoundPrefs {
  muted: boolean;
  /** Master volume 0..1. Independent of mute. */
  volume: number;
  hapticsOn: boolean;
  reducedMotion: boolean;
}

export interface ScheduledCue {
  id: CueId;
  kind: CueKind;
  voice: CueVoice;
  ducks: CueId[];
  /** Unscaled oscillator events. Empty means skip audio. */
  partials: CuePartial[];
  /** Null means skip vibration. */
  haptic: number | number[] | null;
  skipAudio: boolean;
  skipHaptic: boolean;
}

export const DEFAULT_VOLUME = 1;
export const DEFAULT_HAPTICS_ON = true;

export const CUE_GRAPH: Record<CueId, CueDef> = {
  tap: {
    id: 'tap',
    kind: 'feedback',
    voice: 'ui',
    ducks: [],
    haptic: 8
  },
  hit: {
    id: 'hit',
    kind: 'feedback',
    voice: 'trial',
    ducks: [],
    haptic: 12
  },
  miss: {
    id: 'miss',
    kind: 'feedback',
    voice: 'trial',
    ducks: ['hit'],
    haptic: 28
  },
  combo: {
    id: 'combo',
    kind: 'flourish',
    voice: 'phrase',
    ducks: [],
    haptic: [12, 40, 12]
  },
  ritual: {
    id: 'ritual',
    kind: 'flourish',
    voice: 'phrase',
    ducks: ['tap'],
    haptic: [10, 30, 16]
  },
  celebrate: {
    id: 'celebrate',
    kind: 'flourish',
    voice: 'phrase',
    ducks: ['tap', 'hit', 'miss', 'combo', 'ritual'],
    haptic: [20, 40, 20, 40, 40]
  }
};

export const COMBO_MILESTONES = [3, 5, 8, 12] as const;

export function isCueId(value: string): value is CueId {
  return (CUE_IDS as readonly string[]).includes(value);
}

export function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_VOLUME;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function detectReducedMotion(
  media?: { matches: boolean } | null
): boolean {
  if (media && typeof media.matches === 'boolean') return media.matches;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function readSoundPrefs(
  profile?: { soundOn?: boolean; soundVolume?: number; hapticsOn?: boolean },
  reducedMotion?: boolean
): SoundPrefs {
  const muted = profile ? !profile.soundOn : false;
  return {
    muted,
    volume: clampVolume(profile?.soundVolume),
    hapticsOn: profile?.hapticsOn !== false,
    reducedMotion: reducedMotion ?? detectReducedMotion()
  };
}

export function comboAtMilestone(combo: number): boolean {
  return (COMBO_MILESTONES as readonly number[]).includes(combo);
}

/* ------------------------------------------------------------------ */
/* «Тихий свет»: one key, soft additive timbres                          */
/* ------------------------------------------------------------------ */

/** Every pitched cue lives in this single key. */
export const SCALE_NAME = 'D major pentatonic';
/** D4 (A4 = 440 Hz equal temperament). Degree 0 of the scale. */
export const SCALE_ROOT_HZ = 293.6648;
/** Semitone offsets of D E F# A B within one octave. */
export const SCALE_STEPS = [0, 2, 4, 7, 9] as const;
export const DEFAULT_ATTACK = 0.008;
export const DEFAULT_LOWPASS = 3200;

/**
 * Frequency of a scale degree. Degree 0 = D4, 5 = D5, 10 = D6;
 * negative degrees go below the root (-5 = D3).
 */
export function scaleFreq(degree: number): number {
  const d = Math.round(degree);
  const len = SCALE_STEPS.length;
  const octave = Math.floor(d / len);
  const step = SCALE_STEPS[((d % len) + len) % len];
  const semis = octave * 12 + step;
  return Math.round(SCALE_ROOT_HZ * Math.pow(2, semis / 12) * 100) / 100;
}

export function isTonicDegree(degree: number): boolean {
  const len = SCALE_STEPS.length;
  return ((Math.round(degree) % len) + len) % len === 0;
}

/**
 * Streak phrase: scale degree of the hit note for combo 1..12.
 * Walks up and lands on the tonic exactly at COMBO_MILESTONES (3, 5, 8, 12):
 * D4 F#4 D5 · A4 D5 · E5 F#5 D6 · F#5 A5 B5 D6.
 */
export const STREAK_PHRASE = [0, 2, 5, 3, 5, 6, 7, 10, 7, 8, 9, 10] as const;
/** After combo 12 the last four-note cadence loops (tonic every 4th hit). */
const STREAK_LOOP = STREAK_PHRASE.slice(-4);

/** Scale degree for the n-th consecutive hit (combo resets to 0 on miss). */
export function streakDegree(combo?: number): number {
  const n = typeof combo === 'number' && Number.isFinite(combo) ? Math.floor(combo) : 1;
  if (n <= 1) return STREAK_PHRASE[0];
  if (n <= STREAK_PHRASE.length) return STREAK_PHRASE[n - 1];
  return STREAK_LOOP[(n - STREAK_PHRASE.length - 1) % STREAK_LOOP.length];
}

export function streakFreq(combo?: number): number {
  return scaleFreq(streakDegree(combo));
}

interface Overtone {
  ratio: number;
  /** Relative to the fundamental gain. */
  level: number;
  /** Relative to the fundamental decay. */
  decay: number;
}

/** Marimba-ish: sine body + the bar's tuned 4th/10th overtones, short-lived. */
const MARIMBA: Overtone[] = [
  { ratio: 1, level: 1, decay: 1 },
  { ratio: 4, level: 0.16, decay: 0.28 },
  { ratio: 9.85, level: 0.04, decay: 0.12 }
];

/** Crystal / glass: quiet inharmonic partials that shimmer and fade first. */
const CRYSTAL: Overtone[] = [
  { ratio: 1, level: 1, decay: 1 },
  { ratio: 2.76, level: 0.18, decay: 0.45 },
  { ratio: 5.4, level: 0.06, decay: 0.22 }
];

/** Muted low tone: fundamental + a soft octave, heavily filtered. */
const MUTED: Overtone[] = [
  { ratio: 1, level: 1, decay: 1 },
  { ratio: 2, level: 0.3, decay: 0.5 }
];

interface NoteSpec {
  freq: number;
  gain: number;
  dur: number;
  delay: number;
  attack?: number;
  lowpass?: number;
  freqEndRatio?: number;
}

function voice(recipe: Overtone[], n: NoteSpec): CuePartial[] {
  const attack = n.attack ?? DEFAULT_ATTACK;
  const lowpass = n.lowpass ?? DEFAULT_LOWPASS;
  return recipe.map((o) => {
    const p: CuePartial = {
      freq: Math.round(n.freq * o.ratio * 100) / 100,
      type: 'sine',
      dur: Math.max(attack + 0.02, Math.round(n.dur * o.decay * 1000) / 1000),
      gain: Math.round(n.gain * o.level * 10000) / 10000,
      delay: n.delay,
      attack,
      lowpass
    };
    if (n.freqEndRatio) p.freqEnd = Math.round(p.freq * n.freqEndRatio * 100) / 100;
    return p;
  });
}

function hitPartials(combo?: number): CuePartial[] {
  const degree = streakDegree(combo);
  const resolve = isTonicDegree(degree) && comboAtMilestone(Math.floor(combo ?? 1));
  return voice(MARIMBA, {
    freq: scaleFreq(degree),
    gain: 0.06,
    dur: resolve ? 0.6 : 0.42,
    delay: 0,
    attack: 0.006,
    lowpass: 2800
  });
}

function comboPartials(combo?: number): CuePartial[] {
  const n = typeof combo === 'number' && Number.isFinite(combo) ? combo : 3;
  if (n < 3) return [];
  // Tonic arpeggio D5–F#5–A5–D6 under/around the resolving hit; a touch brighter as the streak grows.
  const base = 5;
  const degrees = [base, base + 2, base + 3, base + 5];
  const lift = Math.min(n - 3, 5) * 0.003;
  return degrees.flatMap((deg, i) =>
    voice(CRYSTAL, {
      freq: scaleFreq(deg),
      gain: 0.026 + lift,
      dur: 0.5 + i * 0.08,
      delay: 0.06 + i * 0.07,
      lowpass: 3600
    })
  );
}

function ritualPartials(): CuePartial[] {
  // D5 → F#5 → A5, rising crystal.
  return [5, 7, 8].flatMap((deg, i) =>
    voice(CRYSTAL, {
      freq: scaleFreq(deg),
      gain: 0.034,
      dur: 0.45 + i * 0.1,
      delay: i * 0.11,
      attack: 0.01,
      lowpass: 3400
    })
  );
}

function celebratePartials(): CuePartial[] {
  // D5 F#5 A5 D6, last note rings longest.
  return [5, 7, 8, 10].flatMap((deg, i) =>
    voice(CRYSTAL, {
      freq: scaleFreq(deg),
      gain: i === 3 ? 0.032 : 0.036,
      dur: i === 3 ? 1.1 : 0.55,
      delay: i * 0.1,
      attack: 0.01,
      lowpass: 3600
    })
  );
}

function tapPartials(): CuePartial[] {
  // Tiny wooden tick on A5.
  return voice(MARIMBA, {
    freq: scaleFreq(8),
    gain: 0.028,
    dur: 0.07,
    delay: 0,
    attack: 0.005,
    lowpass: 2600
  }).slice(0, 2);
}

function missPartials(): CuePartial[] {
  // Soft low muted D3 with a barely-there droop — no buzz.
  return voice(MUTED, {
    freq: scaleFreq(-5),
    gain: 0.05,
    dur: 0.26,
    delay: 0,
    attack: 0.01,
    lowpass: 650,
    freqEndRatio: 0.97
  });
}

export function rawPartials(id: CueId, ctx: CueContext = {}): CuePartial[] {
  switch (id) {
    case 'tap':
      return tapPartials();
    case 'hit':
      return hitPartials(ctx.combo);
    case 'miss':
      return missPartials();
    case 'combo':
      return comboPartials(ctx.combo);
    case 'ritual':
      return ritualPartials();
    case 'celebrate':
      return celebratePartials();
  }
}

function applyReducedMotion(id: CueId, kind: CueKind, partials: CuePartial[]): CuePartial[] {
  if (kind === 'flourish') {
    if (id === 'combo') return [];
    const first = partials[0];
    if (!first) return [];
    return [{
      freq: first.freq,
      type: 'sine',
      dur: Math.min(first.dur, 0.08),
      gain: first.gain * 0.55,
      delay: 0,
      attack: first.attack,
      lowpass: first.lowpass
    }];
  }
  return partials.map((p) => ({
    freq: p.freq,
    type: p.type === 'square' || p.type === 'sawtooth' ? 'sine' : p.type,
    dur: Math.min(p.dur, 0.08),
    gain: p.gain * 0.7,
    delay: p.delay,
    attack: p.attack,
    lowpass: p.lowpass
  }));
}

/**
 * Resolve a cue into a scheduled event: duck list, oscillator partials, haptic.
 * Volume is NOT baked into partials — the master GainNode applies it live.
 */
export function scheduleCue(
  id: CueId,
  prefs: SoundPrefs,
  ctx: CueContext = {}
): ScheduledCue {
  const def = CUE_GRAPH[id];
  let partials = rawPartials(id, ctx);
  if (prefs.reducedMotion) partials = applyReducedMotion(id, def.kind, partials);

  const skipAudio = prefs.muted || prefs.volume <= 0 || partials.length === 0;
  const skipFlourishHaptic = prefs.reducedMotion && def.kind === 'flourish';
  const skipHaptic = !prefs.hapticsOn || skipFlourishHaptic || def.haptic == null;

  return {
    id,
    kind: def.kind,
    voice: def.voice,
    ducks: def.ducks,
    partials: skipAudio ? [] : partials,
    haptic: skipHaptic ? null : def.haptic,
    skipAudio,
    skipHaptic
  };
}

export function masterGainValue(prefs: SoundPrefs): number {
  if (prefs.muted) return 0;
  return clampVolume(prefs.volume);
}

export function nextCombo(combo: number, ok: boolean): number {
  return ok ? combo + 1 : 0;
}
