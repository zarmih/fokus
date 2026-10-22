import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPulleyParams } from '../src/exercises/pulley/manifest';
import { verbalFluencyDuration, renderVerbalFluency } from '../src/exercises/verbal-fluency/view';
import { renderBeaconTarget } from '../src/exercises/beacon-rail/view';

describe('pulley: fractional session difficulty', () => {
  it('returns a defined pool/need for fractional and out-of-range levels', () => {
    for (const lvl of [1.4, 2.9, 0, -3, 25, NaN]) {
      const p = getPulleyParams(lvl as number);
      expect(Array.isArray(p.pool)).toBe(true);
      expect(p.pool.length).toBeGreaterThan(0);
      expect(Array.isArray(p.need)).toBe(true);
    }
    expect(getPulleyParams(1.4)).toEqual(getPulleyParams(1));
  });
});

describe('verbal-fluency: duration and single finish', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (window as any).SpeechRecognition;
    document.body.innerHTML = '';
  });

  it('maps fractional levels to an integer level with a 30 s fallback', () => {
    expect(verbalFluencyDuration(1.5)).toBe(20);
    expect(verbalFluencyDuration(2.7)).toBe(30);
    expect(verbalFluencyDuration(3)).toBe(45);
    expect(verbalFluencyDuration(9)).toBe(30);
    expect(verbalFluencyDuration(NaN)).toBe(20);
  });

  it('ends the block exactly once even when the session re-enters cleanup', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const stop = vi.fn();
    (window as any).SpeechRecognition = class { start() {} stop() { stop(); } };
    const host = document.createElement('div');
    document.body.appendChild(host);
    let cleanup: (() => void) | null = null;
    const onEnd = vi.fn(() => { cleanup?.(); });
    cleanup = renderVerbalFluency(host, 1.4, onEnd, () => true) as () => void;
    vi.advanceTimersByTime(5000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

describe('beacon-rail: target label is rendered as text', () => {
  it('builds DOM nodes instead of injecting markup', () => {
    const hud = document.createElement('div');
    renderBeaconTarget(hud, 'red', '#f44');
    expect(hud.textContent).toBe('Цель: красный');
    const span = hud.querySelector('span.br-target') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.style.color).not.toBe('');
    expect(hud.textContent).not.toContain('<');
  });

  it('keeps unexpected keys as plain text', () => {
    const hud = document.createElement('div');
    renderBeaconTarget(hud, '<img src=x onerror=alert(1)>', undefined);
    expect(hud.querySelector('img')).toBeNull();
    expect(hud.textContent).toContain('<img');
  });
});
