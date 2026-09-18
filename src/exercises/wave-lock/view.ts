import { BlockResult } from '../contract';
import { WaveLockState, initGame, startRound, handleHit, getStats } from './engine';

export function renderWaveLock(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
  let state = initGame(level);
  let isGameOver = false;

  el.innerHTML = `
    <style>
      .wl-arena {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 40px;
      }
      .wl-track {
        width: 80%;
        max-width: 600px;
        height: 40px;
        background: var(--surface);
        border: 2px solid var(--line);
        border-radius: 20px;
        position: relative;
        overflow: hidden;
      }
      .wl-target-zone {
        position: absolute;
        height: 100%;
        background: rgba(76, 175, 80, 0.3);
        border-left: 2px solid var(--ok);
        border-right: 2px solid var(--ok);
        top: 0;
      }
      .wl-wave {
        position: absolute;
        width: 20px;
        height: 100%;
        background: var(--accent);
        border-radius: 10px;
        top: 0;
        left: 0;
        transform: translateX(-50%);
      }
      .wl-btn {
        padding: 16px 32px;
        font-size: 24px;
        font-weight: 600;
        border-radius: 12px;
        background: var(--surface);
        border: 2px solid var(--line);
        cursor: pointer;
        user-select: none;
      }
      .wl-btn:active { transform: scale(0.95); }
    </style>
    <div class="wl-arena">
      <div class="wl-track" id="wl-track">
        <div class="wl-target-zone" id="wl-target-zone"></div>
        <div class="wl-wave" id="wl-wave"></div>
      </div>
      <button class="wl-btn" id="wl-btn">БЛОК!</button>
    </div>
  `;

  const targetZone = el.querySelector('#wl-target-zone') as HTMLElement;
  const wave = el.querySelector('#wl-wave') as HTMLElement;
  const btn = el.querySelector('#wl-btn') as HTMLElement;

  let raf: number;
  let wavePos = 0;
  let waveDir = 1;

  const round = () => {
    if (isGameOver) return;
    if (isTimeUp()) {
      isGameOver = true;
      cancelAnimationFrame(raf);
      onEnd(getStats(state));
      return;
    }
    
    state = startRound(state);
    wavePos = 0;
    waveDir = 1;
    wave.style.left = '0%';
    wave.style.backgroundColor = 'var(--accent)';
    targetZone.style.left = `${state.targetCenter - state.targetWidth / 2}%`;
    targetZone.style.width = `${state.targetWidth}%`;
    
    tick();
  };

  const tick = () => {
    if (isGameOver || state.phase !== 'move') return;
    
    wavePos += state.speed * waveDir;
    if (wavePos > 100) {
      wavePos = 100;
      waveDir = -1;
    } else if (wavePos < 0) {
      wavePos = 0;
      waveDir = 1;
    }
    
    wave.style.left = `${wavePos}%`;
    raf = requestAnimationFrame(tick);
  };

  const hit = () => {
    if (state.phase !== 'move') return;
    cancelAnimationFrame(raf);
    
    const wasCorrect = state.correct;
    state = handleHit(state, wavePos);

    if (state.correct > wasCorrect) {
      wave.style.backgroundColor = 'var(--ok)';
    } else {
      wave.style.backgroundColor = 'var(--danger)';
    }
    
    setTimeout(round, 800);
  };

  btn.onclick = hit;

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && state.phase === 'move') {
      e.preventDefault();
      hit();
    }
  };
  window.addEventListener('keydown', onKey);

  round();

  return () => {
    isGameOver = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
  };
}
