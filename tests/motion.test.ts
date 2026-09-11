import { beforeEach, describe, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MOTION,
  MOTION_SCALE,
  afterMotion,
  animateCount,
  applyFeedback,
  applyMotionPreference,
  applyPulse,
  bindPressPhysics,
  celebrate,
  enterSession,
  enterStage,
  exitStage,
  handoffStage,
  isFocusModeActive,
  motionMs,
  playSessionCue,
  prefersReducedMotion,
  replayClass,
  ritualHaloProgress
} from '../src/core/motion';
import { t, setLocale } from '../src/core/i18n';
import { playCue, type AudioCue } from '../src/core/audio';
import { storage } from '../src/core/storage';
import { renderToday } from '../src/ui/screens/today';
import { renderTrainers } from '../src/ui/screens/trainers';
import { renderResult } from '../src/ui/screens/result';
import { renderSession } from '../src/ui/screens/session';
import type { Session } from '../src/core/types';

class MockStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return this.data[k] || null; }
  setItem(k: string, v: string) { this.data[k] = v; }
  removeItem(k: string) { delete this.data[k]; }
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  (storage as any).backend = new MockStorage();
  storage.reset();
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.dataset.motion = '';
  document.documentElement.classList.remove('reduce-motion', 'focus-mode');
  mockMatchMedia(false);
});

describe('motion tokens', () => {
  test('JS durations stay in lockstep with CSS custom properties', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/styles.css'), 'utf8');
    expect(css).toContain(`--motion-instant: ${MOTION.instant}ms`);
    expect(css).toContain(`--motion-fast: ${MOTION.fast}ms`);
    expect(css).toContain(`--motion-pulse: ${MOTION.pulse}ms`);
    expect(css).toContain(`--motion-base: ${MOTION.base}ms`);
    expect(css).toContain(`--motion-exit: ${MOTION.exit}ms`);
    expect(css).toContain(`--motion-handoff: ${MOTION.handoff}ms`);
    expect(css).toContain(`--motion-slow: ${MOTION.slow}ms`);
    expect(css).toContain(`--motion-ritual: ${MOTION.ritual}ms`);
    expect(css).toContain(`--motion-halo: ${MOTION.halo}ms`);
    expect(css).toContain(`--motion-scale-pulse: ${MOTION_SCALE.pulse}`);
    expect(css).toContain(`--motion-scale-miss: ${MOTION_SCALE.miss}`);
    expect(css).toContain(`--motion-scale-enter: ${MOTION_SCALE.enter}`);
    expect(css).toContain(`--motion-scale-exit: ${MOTION_SCALE.exit}`);
    expect(css).toContain('--ease-enter:');
    expect(css).toContain('--ease-spring:');
    expect(css).toContain('--ease-press:');
    expect(css).toContain('--ease-handoff:');
    expect(css).toContain('.fx-enter');
    expect(css).toContain('.fx-ok');
    expect(css).toContain('.fx-bad');
    expect(css).toContain('.fx-celebrate');
    expect(css).toContain('.fx-pulse-ok');
    expect(css).toContain('.fx-pulse-miss');
    expect(css).toContain('.fx-session-enter');
    expect(css).toContain('.fx-session-exit');
    expect(css).toContain('.fx-handoff-enter');
    expect(css).toContain('.workout-card.has-halo');
    expect(css).toContain('html.focus-mode');
    expect(css).toContain('.press-physics');
    expect(css).toContain('.ritual-fill');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('html[data-motion="reduce"]');
    expect(css).toContain('prefers-reduced-transparency: reduce');
    expect(css).toContain('animation-name: fxFade');
    expect(css).toContain('animation-name: fxFlashOk');
    expect(css).toContain('animation-name: fxFlashBad');
  });
});

describe('motion helpers', () => {
  test('prefersReducedMotion reads matchMedia', () => {
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  test('applyMotionPreference writes data-motion', () => {
    mockMatchMedia(true);
    expect(applyMotionPreference()).toBe('reduce');
    expect(document.documentElement.dataset.motion).toBe('reduce');
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);

    mockMatchMedia(false);
    expect(applyMotionPreference()).toBe('full');
    expect(document.documentElement.dataset.motion).toBe('full');
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
  });

  test('replayClass restarts a class', () => {
    const el = document.createElement('div');
    el.classList.add('fx-enter');
    replayClass(el, 'fx-enter');
    expect(el.classList.contains('fx-enter')).toBe(true);
  });

  test('enter / feedback / celebrate apply lifecycle classes', () => {
    const el = document.createElement('div');
    el.className = 'play-stage';
    enterStage(el);
    expect(el.classList.contains('fx-enter')).toBe(true);

    applyFeedback(el, true);
    expect(el.classList.contains('fx-ok')).toBe(true);
    expect(el.classList.contains('pulse-ok')).toBe(true);
    expect(el.classList.contains('fx-bad')).toBe(false);

    applyFeedback(el, false);
    expect(el.classList.contains('fx-bad')).toBe(true);
    expect(el.classList.contains('pulse-bad')).toBe(true);
    expect(el.classList.contains('fx-ok')).toBe(false);

    celebrate(el);
    expect(el.classList.contains('fx-celebrate')).toBe(true);
  });

  test('G22 session enter / handoff / exit / pulse classes', () => {
    const el = document.createElement('div');
    enterSession(el);
    expect(el.classList.contains('fx-session-enter')).toBe(true);

    handoffStage(el);
    expect(el.classList.contains('fx-handoff')).toBe(true);
    expect(el.classList.contains('fx-session-enter')).toBe(false);

    exitStage(el);
    expect(el.classList.contains('fx-session-exit')).toBe(true);
    expect(el.classList.contains('fx-handoff')).toBe(false);

    applyPulse(el, true);
    expect(el.classList.contains('fx-pulse-ok')).toBe(true);
    applyPulse(el, false);
    expect(el.classList.contains('fx-pulse-miss')).toBe(true);
    expect(el.classList.contains('fx-pulse-ok')).toBe(false);
  });

  test('afterMotion is synchronous when reduced-motion is on', () => {
    mockMatchMedia(true);
    let ran = false;
    const id = afterMotion('handoff', () => { ran = true; });
    expect(ran).toBe(true);
    expect(id).toBe(0);
    expect(motionMs('handoff')).toBe(0);
    expect(motionMs('exit')).toBe(0);
  });

  test('focus mode shortens handoff without rewriting G17', () => {
    mockMatchMedia(false);
    document.documentElement.classList.add('focus-mode');
    expect(isFocusModeActive()).toBe(true);
    expect(motionMs('handoff')).toBe(MOTION.fast);
    expect(motionMs('exit')).toBe(MOTION.fast);
    expect(motionMs('slow')).toBe(MOTION.slow);
    document.documentElement.classList.remove('focus-mode');
    expect(motionMs('handoff')).toBe(MOTION.handoff);
  });

  test('ritual halo is presence, not FOMO', () => {
    expect(ritualHaloProgress({ calibrated: false }).state).toBe('off');
    expect(ritualHaloProgress({ calibrated: true, playedToday: true })).toEqual({ value: 1, state: 'done' });
    const ready = ritualHaloProgress({
      calibrated: true,
      playedToday: false,
      quests: [{ progress: 1, target: 4 }, { progress: 0, target: 2 }]
    });
    expect(ready.state).toBe('ready');
    expect(ready.value).toBeGreaterThanOrEqual(0.1);
    expect(ready.value).toBeLessThan(1);
    const idle = ritualHaloProgress({ calibrated: true, playedToday: false, quests: [] });
    expect(idle.state).toBe('ready');
    expect(idle.value).toBeGreaterThan(0);
    expect(idle.value).toBeLessThan(0.3);
  });

  test('bindPressPhysics toggles is-pressed on pointer', () => {
    const el = document.createElement('button');
    const stop = bindPressPhysics(el);
    expect(el.classList.contains('press-physics')).toBe(true);
    el.dispatchEvent(new Event('pointerdown'));
    expect(el.classList.contains('is-pressed')).toBe(true);
    el.dispatchEvent(new Event('pointerup'));
    expect(el.classList.contains('is-pressed')).toBe(false);
    stop();
  });

  test('animateCount writes the target immediately for tests', () => {
    const el = document.createElement('span');
    animateCount(el, 42, 0);
    expect(el.textContent).toBe('42');
  });

  test('cues never throw with sound on or off', () => {
    const kinds: AudioCue[] = ['hit', 'miss', 'combo', 'tick', 'enter', 'celebrate', 'press', 'ritual'];
    const p = storage.getProfile();
    p.soundOn = true;
    storage.setProfile(p);
    expect(() => kinds.forEach(k => playCue(k, 4))).not.toThrow();
    expect(() => kinds.forEach(k => playSessionCue(k, 4))).not.toThrow();
    p.soundOn = false;
    storage.setProfile(p);
    expect(() => kinds.forEach(k => playSessionCue(k))).not.toThrow();
  });
});

describe('screen wiring', () => {
  test('Today ritual fills use --fill and enter the workout card', () => {
    const p = storage.getProfile();
    p.onboarded = true;
    p.calibrated = true;
    storage.setProfile(p);
    renderToday(document.getElementById('app')!);
    const fills = [...document.querySelectorAll('.ritual-fill')] as HTMLElement[];
    expect(fills.length).toBeGreaterThan(0);
    fills.forEach(el => {
      expect(el.style.getPropertyValue('--fill')).toMatch(/%$/);
    });
    expect(document.querySelector('.workout-card.fx-enter, .workout-card.fx-celebrate')).toBeTruthy();
  });

  test('catalog cards get press physics', () => {
    renderTrainers(document.getElementById('app')!);
    const cards = document.querySelectorAll('.trainer-card.press-physics');
    expect(cards.length).toBeGreaterThan(3);
    const first = cards[0] as HTMLElement;
    first.dispatchEvent(new Event('pointerdown'));
    expect(first.classList.contains('is-pressed')).toBe(true);
    first.dispatchEvent(new Event('pointerleave'));
    expect(first.classList.contains('is-pressed')).toBe(false);
  });

  test('result hero celebrates', () => {
    const session: Session = {
      id: 'motion-result',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationSec: 120,
      items: [{
        exerciseId: 'stroop',
        level: 2,
        accuracy: 0.9,
        avgRtMs: 700,
        score: 30,
        performance: 300,
        masteryBefore: 10,
        masteryAfter: 14,
        difficultyBefore: 2,
        difficultyAfter: 2.2,
        confidenceAfter: 40,
        progressionState: 'up'
      }]
    };
    renderResult(document.getElementById('app')!, { session });
    const hero = document.querySelector('#result-hero');
    expect(hero?.classList.contains('fx-celebrate')).toBe(true);
    expect(document.querySelector('#xp-counter')?.getAttribute('data-xp')).toBe('30');
  });

  test('session intro uses enter class and countdown phase', () => {
    vi.useFakeTimers();
    renderSession(document.getElementById('app')!, {
      mode: 'practice',
      items: [{ exerciseId: 'stroop' }]
    });
    const shell = document.querySelector('.shell-content') as HTMLElement;
    expect(shell.dataset.sessionPhase).toBe('intro');
    expect(shell.classList.contains('fx-session-enter')).toBe(true);
    expect(document.querySelector('.instruction-card.fx-enter')).toBeTruthy();
    expect(document.querySelector('.instruction-card.fx-handoff-enter')).toBeFalsy();
    document.getElementById('btn-next')?.click();
    expect(shell.dataset.sessionPhase).toBe('countdown');
    expect(document.querySelector('.count-overlay.is-tick')).toBeTruthy();
    vi.useRealTimers();
  });

  test('Today ritual card gets a quiet halo after calibration', () => {
    const p = storage.getProfile();
    p.onboarded = true;
    p.calibrated = true;
    storage.setProfile(p);
    renderToday(document.getElementById('app')!);
    const card = document.querySelector('.workout-card.has-halo') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.style.getPropertyValue('--halo')).toMatch(/^\d/);
    expect(card.classList.contains('is-settled')).toBe(false);
    expect(card.textContent).not.toMatch(/не пропусти|не потеряйте|hurry|don't miss|brain age/i);
    expect(card.querySelector('.sr-only')?.textContent).toMatch(/Ритуал дня/);
  });
});

describe('reduced-motion preference', () => {
  test('feedback classes still apply when motion is reduced', () => {
    mockMatchMedia(true);
    applyMotionPreference();
    const el = document.createElement('div');
    applyFeedback(el, true);
    expect(el.classList.contains('fx-ok')).toBe(true);
    celebrate(el);
    expect(el.classList.contains('fx-celebrate')).toBe(true);
    applyPulse(el, false);
    expect(el.classList.contains('fx-pulse-miss')).toBe(true);
  });
});

describe('G22 copy', () => {
  test('halo and session strings exist in RU and EN', () => {
    setLocale('ru');
    expect(t('today.halo_done')).toMatch(/выполнен/);
    expect(t('session.handoff')).toMatch(/блок/i);
    setLocale('en');
    expect(t('today.halo_done')).toMatch(/done/i);
    expect(t('today.halo_ready')).not.toMatch(/[А-Яа-яЁё]/);
    expect(t('today.halo_progress', { pct: 40 })).toBe('Today’s ritual, 40%');
    expect(t('session.handoff')).toBe('Next block');
    expect(t('session.closing')).toBe('Closing the session');
    setLocale('ru');
  });
});
