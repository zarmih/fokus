import { BlockResult } from '../contract';
import { BlazeTapEngine } from './engine';
import { blazeTapManifest } from './manifest';

export function renderBlazeTap(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
  const engine = new BlazeTapEngine();
  const lvl = Math.max(1, Math.min(5, Math.floor(level)));
  const params = blazeTapManifest.levels![lvl as keyof typeof blazeTapManifest.levels];
  
  let rounds = 0;
  let correct = 0;
  let rts: number[] = [];
  let t0 = performance.now();
  let timer: any;
  let isGameOver = false;

  el.innerHTML = `
    <style>
      .blaze-arena {
        position: relative;
        width: 100%;
        height: 100%;
        background: var(--surface);
        border-radius: 16px;
        overflow: hidden;
      }
      .blaze-target {
        position: absolute;
        width: 60px;
        height: 60px;
        background: var(--primary);
        border-radius: 50%;
        cursor: pointer;
        transform: translate(-50%, -50%);
        transition: transform 0.1s;
      }
      .blaze-target:active {
        transform: translate(-50%, -50%) scale(0.9);
      }
    </style>
    <div class="blaze-arena" id="blaze-arena"></div>
  `;

  const arena = el.querySelector('#blaze-arena') as HTMLElement;

  const endBlock = () => {
    isGameOver = true;
    clearTimeout(timer);
    const accuracy = rounds > 0 ? correct / rounds : 0;
    const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
    onEnd({ accuracy, avgRtMs, rounds });
  };

  const spawn = () => {
    if (isGameOver) return;
    if (isTimeUp()) {
      endBlock();
      return;
    }

    arena.innerHTML = '';
    const pos = engine.generatePosition();
    const target = document.createElement('div');
    target.className = 'blaze-target';
    target.style.left = `${pos.x}%`;
    target.style.top = `${pos.y}%`;
    
    t0 = performance.now();
    let clicked = false;

    target.onpointerdown = (e) => {
      if (clicked) return;
      clicked = true;
      e.stopPropagation();
      clearTimeout(timer);
      correct++;
      rounds++;
      rts.push(performance.now() - t0);
      target.style.background = 'var(--ok)';
      setTimeout(spawn, 300);
    };

    arena.appendChild(target);

    timer = setTimeout(() => {
      if (clicked) return;
      rounds++; // Missed
      arena.innerHTML = '';
      setTimeout(spawn, 300);
    }, params.targetMs);
  };

  spawn();

  return () => {
    isGameOver = true;
    clearTimeout(timer);
  };
}
