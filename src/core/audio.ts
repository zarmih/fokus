import { storage } from './storage';

let audioCtx: AudioContext | null = null;

export function nextCombo(combo: number, ok: boolean): number {
  return ok ? combo + 1 : 0;
}

function enabled(): boolean {
  try {
    return !!storage.getProfile().soundOn;
  } catch {
    return false;
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio() {
  if (!enabled()) return;
  getCtx();
}

function beep(opts: {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  delay?: number;
}) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + (opts.delay || 0);
  const dur = opts.dur ?? 0.1;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd && opts.freqEnd > 0) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + dur);
  }
  const g = opts.gain ?? 0.06;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playHit(combo = 1) {
  if (!enabled()) return;
  const n = Math.max(1, Math.min(combo, 10));
  const freq = 480 + n * 42;
  beep({ freq, freqEnd: freq * 1.55, type: 'triangle', dur: 0.09, gain: 0.07 });
  beep({ freq: freq * 2, type: 'sine', dur: 0.05, gain: 0.025, delay: 0.02 });
}

export function playMiss() {
  if (!enabled()) return;
  beep({ freq: 240, freqEnd: 90, type: 'square', dur: 0.16, gain: 0.045 });
}

export function playCombo(combo: number) {
  if (!enabled() || combo < 3) return;
  const root = 392 * (1 + Math.min(combo - 3, 5) * 0.04);
  [0, 4, 7].forEach((semi, i) => {
    const freq = root * Math.pow(2, semi / 12);
    beep({ freq, type: 'sine', dur: 0.14, gain: 0.055, delay: i * 0.055 });
  });
}

export function playBeep(success: boolean) {
  if (success) playHit(1);
  else playMiss();
}

export function playTick() {
  if (!enabled()) return;
  beep({ freq: 620, type: 'square', dur: 0.045, gain: 0.035 });
}
