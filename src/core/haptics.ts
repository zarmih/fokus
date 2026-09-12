import { scheduleCue, type CueId, type CueContext, type SoundPrefs } from './soundscape';

export type VibrateFn = (pattern: number | number[]) => boolean;

function nativeVibrate(): VibrateFn | null {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return null;
  return (pattern) => {
    try {
      return !!navigator.vibrate(pattern);
    } catch {
      return false;
    }
  };
}

let vibrateImpl: VibrateFn | null | undefined;

function resolveVibrate(): VibrateFn | null {
  if (vibrateImpl !== undefined) return vibrateImpl;
  return nativeVibrate();
}

/** Test seam. Pass null to simulate a device without Vibration API. */
export function __setVibrateForTests(fn: VibrateFn | null | undefined) {
  vibrateImpl = fn;
}

export function canVibrate(prefs?: Pick<SoundPrefs, 'hapticsOn'>): boolean {
  if (prefs && prefs.hapticsOn === false) return false;
  return resolveVibrate() != null;
}

export function vibratePattern(pattern: number | number[]): boolean {
  const vibrate = resolveVibrate();
  if (!vibrate) return false;
  try {
    return !!vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Optional haptic hook for a cue. No-ops when the API is missing, prefs
 * disable haptics, or reduce-motion strips flourish patterns.
 */
export function vibrateForCue(
  id: CueId,
  prefs: SoundPrefs,
  ctx: CueContext = {}
): boolean {
  const scheduled = scheduleCue(id, prefs, ctx);
  if (scheduled.skipHaptic || scheduled.haptic == null) return false;
  return vibratePattern(scheduled.haptic);
}

export type HapticFeedbackType = 'success' | 'error' | 'progress';

export function triggerHapticFeedback(
  type: HapticFeedbackType,
  prefs: Pick<SoundPrefs, 'hapticsOn' | 'reducedMotion'>
): boolean {
  if (!canVibrate(prefs)) return false;
  if (type === 'progress' && prefs.reducedMotion) return false;
  
  if (type === 'success') return vibratePattern(12);
  if (type === 'error') return vibratePattern(28); // Matches miss cue
  if (type === 'progress') return vibratePattern(8); // Matches tap cue
  return false;
}
