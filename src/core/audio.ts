import { storage } from './storage';
import { vibrateForCue } from './haptics';
import {
  detectReducedMotion,
  masterGainValue,
  nextCombo,
  readSoundPrefs,
  scheduleCue,
  type CueContext,
  type CueId,
  type ScheduledCue,
  type SoundPrefs
} from './soundscape';

export { nextCombo };
export type { CueId, CueContext, SoundPrefs, ScheduledCue };
export {
  CUE_IDS,
  CUE_GRAPH,
  COMBO_MILESTONES,
  clampVolume,
  comboAtMilestone,
  detectReducedMotion,
  masterGainValue,
  readSoundPrefs,
  scheduleCue
} from './soundscape';

type OscLike = {
  type: OscillatorType;
  frequency: {
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(dest: unknown): void;
  start(time: number): void;
  stop(time: number): void;
};

type GainLike = {
  gain: {
    value: number;
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
    setTargetAtTime(value: number, time: number, constant: number): void;
    cancelScheduledValues(time: number): void;
  };
  connect(dest: unknown): void;
};

export type AudioGraphContext = {
  currentTime: number;
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  createOscillator(): OscLike;
  createGain(): GainLike;
};

let audioCtx: AudioGraphContext | null = null;
let master: GainLike | null = null;
const liveGains: { id: CueId; gain: GainLike }[] = [];

function prefsFromStorage(): SoundPrefs {
  try {
    return readSoundPrefs(storage.getProfile(), detectReducedMotion());
  } catch {
    return readSoundPrefs({ soundOn: false }, false);
  }
}

function getCtx(): AudioGraphContext | null {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC() as unknown as AudioGraphContext;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function ensureMaster(ctx: AudioGraphContext): GainLike {
  if (master) return master;
  master = ctx.createGain();
  master.connect(ctx.destination);
  const g = masterGainValue(prefsFromStorage());
  master.gain.value = g;
  master.gain.setValueAtTime(Math.max(g, 0), ctx.currentTime);
  return master;
}

export function applyMasterGain(prefs?: SoundPrefs) {
  if (!audioCtx || !master) return;
  const g = masterGainValue(prefs ?? prefsFromStorage());
  try {
    master.gain.cancelScheduledValues(audioCtx.currentTime);
    master.gain.setTargetAtTime(g, audioCtx.currentTime, 0.02);
  } catch {
    master.gain.value = g;
  }
}

export function unlockAudio() {
  const prefs = prefsFromStorage();
  if (prefs.muted || prefs.volume <= 0) return;
  const ctx = getCtx();
  if (ctx) ensureMaster(ctx);
}

function duck(targets: CueId[], ctx: AudioGraphContext, t0: number) {
  if (targets.length === 0) return;
  for (const live of liveGains) {
    if (!targets.includes(live.id)) continue;
    try {
      const param = live.gain.gain;
      param.cancelScheduledValues(t0);
      const current = typeof param.value === 'number' ? Math.max(param.value, 0.0001) : 1;
      param.setValueAtTime(current, t0);
      param.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
    } catch {
      /* ignore */
    }
  }
}

function renderScheduled(scheduled: ScheduledCue) {
  if (scheduled.skipAudio || scheduled.partials.length === 0) return;
  const ctx = getCtx();
  if (!ctx) return;
  const bus = ensureMaster(ctx);
  const t0 = ctx.currentTime;
  duck(scheduled.ducks, ctx, t0);

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(1, t0);
  voiceGain.connect(bus);
  const live = { id: scheduled.id, gain: voiceGain };
  liveGains.push(live);

  let tail = 0;
  for (const p of scheduled.partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = t0 + (p.delay || 0);
    const dur = p.dur;
    tail = Math.max(tail, (p.delay || 0) + dur);
    osc.type = p.type || 'sine';
    osc.frequency.setValueAtTime(p.freq, start);
    if (p.freqEnd && p.freqEnd > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, p.freqEnd), start + dur);
    }
    const g = Math.max(p.gain, 0.0001);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(g, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(voiceGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  const releaseAt = t0 + tail + 0.08;
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      const pos = liveGains.indexOf(live);
      if (pos >= 0) liveGains.splice(pos, 1);
    }, Math.ceil((tail + 0.1) * 1000));
  }
  try {
    voiceGain.gain.setTargetAtTime(0.0001, releaseAt, 0.02);
  } catch {
    /* ignore */
  }
}

/** Motion G2 aliases mapped onto the G12 cue graph. */
export type AudioCue = CueId | 'tick' | 'enter' | 'press';

function resolveCueId(id: AudioCue): CueId {
  if (id === 'tick' || id === 'press') return 'tap';
  if (id === 'enter') return 'ritual';
  return id;
}

export function playCue(
  id: AudioCue,
  ctxOrExtra: CueContext | number = {},
  prefs?: SoundPrefs
): ScheduledCue {
  const cueId = resolveCueId(id);
  const ctx: CueContext = typeof ctxOrExtra === 'number' ? { combo: ctxOrExtra } : (ctxOrExtra || {});
  const resolved = prefs ?? prefsFromStorage();
  const scheduled = scheduleCue(cueId, resolved, ctx);
  renderScheduled(scheduled);
  if (!scheduled.skipHaptic) vibrateForCue(cueId, resolved, ctx);
  return scheduled;
}

export function playHit(combo = 1) {
  playCue('hit', { combo });
}

export function playMiss() {
  playCue('miss');
}

export function playCombo(combo: number) {
  if (combo < 3) return;
  playCue('combo', { combo });
}

export function playBeep(success: boolean) {
  if (success) playHit(1);
  else playMiss();
}

export function playTick() {
  playCue('tap');
}

export function playTap() {
  playCue('tap');
}

export function playRitual() {
  playCue('ritual');
}

export function playCelebrate() {
  playCue('celebrate');
}

export function __resetAudioForTests() {
  audioCtx = null;
  master = null;
  liveGains.length = 0;
}

export function __setAudioContextForTests(ctx: AudioGraphContext | null) {
  audioCtx = ctx;
  master = null;
  liveGains.length = 0;
}
