import { playCue, type AudioCue } from './audio';
import { triggerHapticFeedback } from './haptics';
import { storage } from './storage';

/** Durations in ms — keep in sync with `--motion-*` in styles.css */
export const MOTION = {
  instant: 80,
  fast: 150,
  base: 240,
  slow: 400,
  ritual: 640
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

export function getHapticPrefs() {
  try {
    return {
      hapticsOn: storage.getProfile().hapticsOn !== false,
      reducedMotion: prefersReducedMotion()
    };
  } catch {
    return { hapticsOn: true, reducedMotion: prefersReducedMotion() };
  }
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
  el.classList.remove('fx-ok', 'fx-bad', 'pulse-ok', 'pulse-bad');
  void el.offsetWidth;
  el.classList.add(ok ? 'fx-ok' : 'fx-bad');
  if (el.classList.contains('play-stage')) {
    el.classList.add(ok ? 'pulse-ok' : 'pulse-bad');
  }
  try {
    triggerHapticFeedback(ok ? 'success' : 'error', getHapticPrefs());
  } catch {
    /* ignore */
  }
}

export function applyProgress(el: HTMLElement): void {
  replayClass(el, 'fx-progress');
  try {
    triggerHapticFeedback('progress', getHapticPrefs());
  } catch {
    /* ignore */
  }
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
    else triggerHapticFeedback('progress', getHapticPrefs());
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
      const nextVal = Math.round(target * eased);
      if (el.textContent !== String(nextVal)) {
        el.textContent = String(nextVal);
        triggerHapticFeedback('progress', getHapticPrefs());
      }
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
