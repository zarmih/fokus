import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPulleyParams } from '../src/exercises/pulley/manifest';
import { verbalFluencyDuration, renderVerbalFluency } from '../src/exercises/verbal-fluency/view';
import { renderBeaconTarget } from '../src/exercises/beacon-rail/view';
import { renderGoNoGo } from '../src/exercises/go-no-go/view';
import { renderMentalRotation } from '../src/exercises/mental-rotation/view';

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

describe('level tables tolerate fractional session difficulty', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

  for (const [name, render] of [['go-no-go', renderGoNoGo], ['mental-rotation', renderMentalRotation]] as const) {
    it(`${name} renders at level 1.4 and 7`, () => {
      vi.useFakeTimers();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      for (const lvl of [1.4, 7]) {
        const host = document.createElement('div');
        document.body.appendChild(host);
        let cleanup: unknown;
        expect(() => { cleanup = (render as any)(host, lvl, () => {}, () => false); }).not.toThrow();
        if (typeof cleanup === 'function') (cleanup as () => void)();
      }
    });
  }
});

describe('spark-lane: lane flash after a miss or hit', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('does not read lanes[-1] when the 200 ms border flash ends', async () => {
    vi.useFakeTimers();
    const { default: sparkLane } = await import('../src/exercises/spark-lane');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const end = sparkLane.render(host, 1, () => {}, () => false) as () => void;
    // Several spark/miss cycles, each followed by the delayed border reset.
    expect(() => vi.advanceTimersByTime(20000)).not.toThrow();
    const lane = host.querySelector('.sl-lane') as HTMLElement;
    expect(lane).toBeTruthy();
    end();
  });
});
