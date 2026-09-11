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
  type: OscillatorType;
  dur: number;
  gain: number;
  delay: number;
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

function clampCombo(combo: number | undefined): number {
  const n = typeof combo === 'number' && Number.isFinite(combo) ? combo : 1;
  return Math.max(1, Math.min(Math.floor(n), 10));
}

function hitPartials(combo?: number): CuePartial[] {
  const n = clampCombo(combo);
  const freq = 480 + n * 42;
  return [
    { freq, freqEnd: freq * 1.55, type: 'triangle', dur: 0.09, gain: 0.07, delay: 0 },
    { freq: freq * 2, type: 'sine', dur: 0.05, gain: 0.025, delay: 0.02 }
  ];
}

function comboPartials(combo?: number): CuePartial[] {
  const n = typeof combo === 'number' && Number.isFinite(combo) ? combo : 3;
  if (n < 3) return [];
  const root = 392 * (1 + Math.min(n - 3, 5) * 0.04);
  return [0, 4, 7].map((semi, i) => ({
    freq: root * Math.pow(2, semi / 12),
    type: 'sine' as OscillatorType,
    dur: 0.14,
    gain: 0.055,
    delay: i * 0.055
  }));
}

function ritualPartials(): CuePartial[] {
  return [
    { freq: 392, type: 'sine', dur: 0.12, gain: 0.05, delay: 0 },
    { freq: 523.25, type: 'sine', dur: 0.14, gain: 0.05, delay: 0.09 },
    { freq: 784, type: 'triangle', dur: 0.18, gain: 0.04, delay: 0.18 }
  ];
}

function celebratePartials(): CuePartial[] {
  return [
    { freq: 523.25, type: 'sine', dur: 0.16, gain: 0.05, delay: 0 },
    { freq: 659.25, type: 'sine', dur: 0.16, gain: 0.05, delay: 0.08 },
    { freq: 783.99, type: 'sine', dur: 0.2, gain: 0.055, delay: 0.16 },
    { freq: 1046.5, type: 'triangle', dur: 0.22, gain: 0.035, delay: 0.24 }
  ];
}

export function rawPartials(id: CueId, ctx: CueContext = {}): CuePartial[] {
  switch (id) {
    case 'tap':
      return [{ freq: 620, type: 'square', dur: 0.045, gain: 0.035, delay: 0 }];
    case 'hit':
      return hitPartials(ctx.combo);
    case 'miss':
      return [{ freq: 240, freqEnd: 90, type: 'square', dur: 0.16, gain: 0.045, delay: 0 }];
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
      delay: 0
    }];
  }
  return partials.map((p) => ({
    freq: p.freq,
    type: p.type === 'square' ? 'sine' : p.type,
    dur: Math.min(p.dur, 0.08),
    gain: p.gain * 0.7,
    delay: p.delay
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
