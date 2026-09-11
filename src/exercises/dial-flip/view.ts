import { getDialFlipParams } from './manifest';
import { DialFlipEngine } from './engine';
import type { BlockResult } from '../contract';

export function renderDialFlip(
  el: HTMLElement,
  level: number,
  onEnd: (res: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const engine = new DialFlipEngine();
  let rounds = 0;
  let totalAcc = 0;
  let totalRt = 0;
  let isDestroyed = false;
  let timeoutId: any;
  let startTime: number;

  function nextRound() {
    if (isDestroyed) return;
    if (isTimeUp()) {
      finish();
      return;
    }

    el.innerHTML = '';
    const params = getDialFlipParams(level);
    const { targetNumber, rule } = engine.start(params);
    
    // Background color based on rule
    el.style.backgroundColor = rule === 'direct' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255, 152, 0, 0.1)';
    
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '300px';
    container.style.height = '300px';
    container.style.margin = '20px auto';
    container.style.borderRadius = '50%';
    container.style.border = '4px solid #555';
    container.style.backgroundColor = '#222';
    
    // Draw numbers
    for (let i = 1; i <= 12; i++) {
      const numEl = document.createElement('div');
      numEl.textContent = i.toString();
      numEl.style.position = 'absolute';
      numEl.style.width = '30px';
      numEl.style.height = '30px';
      numEl.style.lineHeight = '30px';
      numEl.style.textAlign = 'center';
      numEl.style.fontWeight = 'bold';
      numEl.style.fontSize = '18px';
      
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const radius = 120;
      const x = 150 + radius * Math.cos(angle) - 15;
      const y = 150 + radius * Math.sin(angle) - 15;
      
      numEl.style.left = `${x}px`;
      numEl.style.top = `${y}px`;
      container.appendChild(numEl);
    }
    
    // Draw arrow pointing to targetNumber
    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.width = '2px';
    arrow.style.height = '100px';
    arrow.style.backgroundColor = '#f44336';
    arrow.style.left = '149px';
    arrow.style.top = '50px';
    arrow.style.transformOrigin = 'bottom center';
    
    const targetAngle = targetNumber * 30;
    arrow.style.transform = `rotate(${targetAngle}deg)`;
    container.appendChild(arrow);
    
    const centerDot = document.createElement('div');
    centerDot.style.position = 'absolute';
    centerDot.style.width = '12px';
    centerDot.style.height = '12px';
    centerDot.style.borderRadius = '50%';
    centerDot.style.backgroundColor = '#fff';
    centerDot.style.left = '144px';
    centerDot.style.top = '144px';
    container.appendChild(centerDot);

    el.appendChild(container);

    // Number input buttons
    const keyboard = document.createElement('div');
    keyboard.style.display = 'grid';
    keyboard.style.gridTemplateColumns = 'repeat(4, 1fr)';
    keyboard.style.gap = '8px';
    keyboard.style.maxWidth = '300px';
    keyboard.style.margin = '0 auto';

    for (let i = 1; i <= 12; i++) {
      const btn = document.createElement('button');
      btn.textContent = i.toString();
      btn.style.padding = '12px';
      btn.style.fontSize = '18px';
      btn.style.backgroundColor = '#444';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.color = '#fff';
      
      btn.addEventListener('pointerdown', () => {
        const { accuracy, rt } = engine.submit(i, Date.now() - startTime);
        recordAndNext(accuracy, rt);
      });
      keyboard.appendChild(btn);
    }
    el.appendChild(keyboard);

    startTime = Date.now();
    timeoutId = setTimeout(() => {
      if (!isDestroyed) {
        recordAndNext(0, params.durationMs);
      }
    }, params.durationMs);
  }

  function recordAndNext(acc: number, rt: number) {
    clearTimeout(timeoutId);
    rounds++;
    totalAcc += acc;
    totalRt += rt;
    
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = acc > 0 ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
    overlay.style.zIndex = '10';
    el.appendChild(overlay);

    setTimeout(() => {
      if (!isDestroyed) {
        el.style.backgroundColor = '';
        nextRound();
      }
    }, 400);
  }

  function finish() {
    isDestroyed = true;
    clearTimeout(timeoutId);
    el.style.backgroundColor = '';
    onEnd({
      accuracy: rounds > 0 ? totalAcc / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  }

  nextRound();

  return () => {
    isDestroyed = true;
    clearTimeout(timeoutId);
    el.style.backgroundColor = '';
  };
}
