import { getChordTapParams } from './manifest';
import { ChordTapEngine } from './engine';
import type { BlockResult } from '../contract';

export function renderChordTap(
  el: HTMLElement,
  level: number,
  onEnd: (res: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const engine = new ChordTapEngine();
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
    const params = getChordTapParams(level);
    const { totalElements, targets } = engine.start(params);
    
    const container = document.createElement('div');
    container.className = 'chord-tap-container';
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '16px';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.width = '100%';
    container.style.height = '100%';

    const indices = Array.from({length: totalElements}, (_, i) => i);
    indices.sort(() => Math.random() - 0.5);
    const targetIndices = new Set(indices.slice(0, targets));

    const btns: HTMLElement[] = [];
    let selected = new Set<number>();
    
    for (let i = 0; i < totalElements; i++) {
      const btn = document.createElement('div');
      btn.style.width = '80px';
      btn.style.height = '80px';
      btn.style.borderRadius = '50%';
      btn.style.backgroundColor = '#444';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'background-color 0.1s';
      
      // We will make targets light up after a brief random delay to trigger the action
      btn.addEventListener('pointerdown', (e) => {
        if (!targetIndices.has(i)) {
          // distractor tapped, penalize immediately
          recordAndNext(0, Date.now() - startTime);
          return;
        }
        selected.add(i);
        btn.style.backgroundColor = '#4caf50'; // highlight selected
        if (selected.size === targets) {
          recordAndNext(1, Date.now() - startTime);
        }
      });
      btns.push(btn);
      container.appendChild(btn);
    }
    el.appendChild(container);

    // After a brief delay, show the targets
    timeoutId = setTimeout(() => {
      if (isDestroyed) return;
      startTime = Date.now();
      btns.forEach((btn, idx) => {
        if (targetIndices.has(idx)) {
          btn.style.backgroundColor = '#2196f3'; // Target color
        }
      });
      
      // If time runs out for this round
      timeoutId = setTimeout(() => {
        if (!isDestroyed) {
          recordAndNext(0, params.durationMs);
        }
      }, params.durationMs);
    }, 500 + Math.random() * 1000); // 0.5-1.5s delay before showing targets
  }

  function recordAndNext(acc: number, rt: number) {
    clearTimeout(timeoutId);
    rounds++;
    totalAcc += acc;
    totalRt += rt;
    
    // Briefly show feedback
    el.style.backgroundColor = acc > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
    setTimeout(() => {
      if (!isDestroyed) {
        el.style.backgroundColor = '';
        nextRound();
      }
    }, 300);
  }

  function finish() {
    isDestroyed = true;
    clearTimeout(timeoutId);
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
  };
}
