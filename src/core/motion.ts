import { playCue, type AudioCue } from './audio';

/** Durations in ms — keep in sync with `--motion-*` in styles.css */
export const MOTION = {
  instant: 80,
  fast: 150,
  pulse: 180,
  base: 240,
  exit: 240,
  handoff: 320,
  slow: 400,
  ritual: 640,
  halo: 1600
} as const;

/** Scale factors — keep in sync with `--motion-scale-*` in styles.css */
export const MOTION_SCALE = {
  miss: 0.985,
  enter: 0.97,
  exit: 0.98,
  pulse: 1.018
} as const;

export type MotionCue = AudioCue;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function applyMotionPreference(root: HTMLElement = document.documentElement): 'reduce' | 'full' {
  const mode = prefersReducedMotion() ? 'reduce' : 'full';
  root.dataset.motion = mode;
  root.classList.toggle('reduce-motion', mode === 'reduce');
  return mode;
}

export function replayClass(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export function enterStage(el: HTMLElement): void {
  replayClass(el, 'fx-enter');
}

export function applyFeedback(el: HTMLElement, ok: boolean): void {
  el.classList.remove('fx-ok', 'fx-bad', 'pulse-ok', 'pulse-bad', 'fx-pulse-ok', 'fx-pulse-miss');
  void el.offsetWidth;
  el.classList.add(ok ? 'fx-ok' : 'fx-bad');
  if (el.classList.contains('play-stage')) {
    el.classList.add(ok ? 'pulse-ok' : 'pulse-bad');
  }
  try {
    navigator.vibrate?.(ok ? 12 : 24);
  } catch {
    /* ignore */
  }
}

export function applyPulse(el: HTMLElement, ok: boolean): void {
  el.classList.remove('fx-pulse-ok', 'fx-pulse-miss');
  void el.offsetWidth;
  el.classList.add(ok ? 'fx-pulse-ok' : 'fx-pulse-miss');
}

export function enterSession(el: HTMLElement): void {
  el.classList.remove('fx-session-exit', 'fx-handoff');
  replayClass(el, 'fx-session-enter');
}

export function exitStage(el: HTMLElement): void {
  el.classList.remove('fx-session-enter', 'fx-handoff');
  replayClass(el, 'fx-session-exit');
}

export function handoffStage(el: HTMLElement): void {
  el.classList.remove('fx-session-enter', 'fx-session-exit');
  replayClass(el, 'fx-handoff');
}

/** G17 paints `html.focus-mode`. G22 only reads it — never owns the flag. */
export function isFocusModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('focus-mode');
}

export function motionMs(token: keyof typeof MOTION): number {
  if (prefersReducedMotion()) return 0;
  if (isFocusModeActive() && (token === 'handoff' || token === 'exit' || token === 'halo')) {
    return MOTION.fast;
  }
  return MOTION[token];
}

export function afterMotion(token: 'handoff' | 'exit' | 'pulse', fn: () => void): number {
  const ms = motionMs(token);
  if (ms <= 0) {
    fn();
    return 0;
  }
  return window.setTimeout(fn, ms);
}

export function celebrate(el: HTMLElement): void {
  replayClass(el, 'fx-celebrate');
}

export function playSessionCue(kind: MotionCue, extra?: number): void {
  try {
    playCue(kind, extra ?? 1);
  } catch {
    /* audio layer is optional */
  }
}

export function bindPressPhysics(
  el: HTMLElement,
  opts?: { audio?: boolean }
): () => void {
  el.classList.add('press-physics');
  const down = (ev: Event) => {
    if ((ev as PointerEvent).button != null && (ev as PointerEvent).button !== 0) return;
    el.classList.add('is-pressed');
    if (opts?.audio) playSessionCue('press');
  };
  const up = () => el.classList.remove('is-pressed');
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('lostpointercapture', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.removeEventListener('pointerleave', up);
    el.removeEventListener('lostpointercapture', up);
    el.classList.remove('is-pressed');
  };
}

export function animateCount(el: HTMLElement, to: number, duration: number = MOTION.ritual): void {
  const target = Math.round(to);
  el.textContent = String(target);
  if (prefersReducedMotion() || duration <= 0) return;
  requestAnimationFrame(() => {
    const start = performance.now();
    el.textContent = '0';
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export type RitualHaloState = 'off' | 'ready' | 'done';

/**
 * Quiet rim around the Today ritual card.
 * Presence, not urgency: no time-of-day decay, no streak threat, no FOMO.
 */
export function ritualHaloProgress(input: {
  calibrated?: boolean;
  playedToday?: boolean;
  quests?: Array<{ progress: number; target: number }>;
}): { value: number; state: RitualHaloState } {
  if (!input.calibrated) return { value: 0, state: 'off' };
  if (input.playedToday) return { value: 1, state: 'done' };
  const quests = input.quests || [];
  if (quests.length === 0) return { value: 0.14, state: 'ready' };
  const avg = quests.reduce((sum, q) => {
    if (!(q.target > 0)) return sum;
    return sum + Math.min(1, Math.max(0, q.progress / q.target));
  }, 0) / quests.length;
  return { value: Math.min(0.92, Math.max(0.1, avg)), state: 'ready' };
}
