import { afterEach, describe, expect, it, vi } from 'vitest';
import { setExerciseMode, STROOP_DIRECTION, HELIX_FILL, ACCESSIBLE_VARIANTS } from '../src/exercises/lib/exercise-mode';
import { renderStroop } from '../src/exercises/stroop/view';
import { renderHelixFlip } from '../src/exercises/helix-flip/view';

const HEX = /#[0-9a-f]{6}|hsl\(|rgb\(/i;

afterEach(() => {
  setExerciseMode('standard');
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('accessible Stroop: direction instead of colour', () => {
  it('every colour maps to a distinct direction', () => {
    expect(new Set(Object.values(STROOP_DIRECTION)).size).toBe(4);
    expect(ACCESSIBLE_VARIANTS.has('stroop')).toBe(true);
  });

  it('no colour carries meaning, and answering the arrow direction scores correct', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="h"></div>';
    setExerciseMode('accessible');
    let rounds = 0;
    let result: any = null;
    const cleanup = renderStroop(document.getElementById('h')!, 6, (r) => { result = r; }, () => rounds >= 12);
    for (let i = 0; i < 12; i++) {
      const arrow = document.querySelector<HTMLElement>('.stroop-arrow')!;
      expect(arrow).toBeTruthy();
      expect(arrow.getAttribute('style') || '').not.toMatch(HEX);
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('.stroop-btn')];
      for (const b of buttons) {
        expect(b.getAttribute('style') || '').not.toMatch(HEX);
        expect(b.getAttribute('aria-label')).toBeTruthy();
      }
      buttons.find((b) => b.dataset.dir === arrow.dataset.dir)!.click();
      rounds++;
      vi.advanceTimersByTime(500);
    }
    expect(result).toBeTruthy();
    expect(result.accuracy).toBe(1);
    cleanup();
  });
});

describe('accessible helix-flip: fill instead of colour', () => {
  it('each colour has its own fill style', () => {
    expect(new Set(Object.values(HELIX_FILL)).size).toBe(3);
  });

  it('glyphs use one neutral colour and the rule reads «ЗАЛИВКА» instead of «ЦВЕТ»', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // forces a rule switch on the first trial: shape → colour
    document.body.innerHTML = '<div id="h"></div>';
    setExerciseMode('accessible');
    const cleanup = renderHelixFlip(document.getElementById('h')!, 3, () => {}, () => false);
    const glyphs = [...document.querySelectorAll<HTMLElement>('.glyph-3d')];
    expect(glyphs).toHaveLength(2);
    for (const g of glyphs) {
      expect(g.getAttribute('style') || '').not.toMatch(HEX);
      expect(['solid', 'outline', 'striped']).toContain(g.dataset.fill);
    }
    expect(document.body.textContent).not.toMatch(/ЦВЕТ/);
    expect(document.body.textContent).toMatch(/ЗАЛИВКА/);
    cleanup();
  });
});
