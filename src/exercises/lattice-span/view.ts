import { getLatticeSpanParams } from './manifest';
import { LatticeSpanEngine } from './engine';
import type { BlockResult } from '../contract';

export function renderLatticeSpan(
  el: HTMLElement,
  level: number,
  onEnd: (res: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const engine = new LatticeSpanEngine();
  let rounds = 0;
  let totalAcc = 0;
  let isDestroyed = false;
  let timeoutId: any;
  let sequenceIndex = 0;
  let userSequence: number[] = [];
  let currentSequence: number[] = [];
  let isInteractive = false;

  function nextRound() {
    if (isDestroyed) return;
    if (isTimeUp()) {
      finish();
      return;
    }

    el.innerHTML = '';
    const params = getLatticeSpanParams(level);
    const { sequence } = engine.start(params);
    currentSequence = sequence;
    userSequence = [];
    isInteractive = false;
    
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${params.grid}, 1fr)`;
    container.style.gap = '8px';
    container.style.width = '100%';
    container.style.maxWidth = '400px';
    container.style.aspectRatio = '1 / 1';
    container.style.margin = '0 auto';

    const nodes: HTMLElement[] = [];
    for (let i = 0; i < params.grid * params.grid; i++) {
      const node = document.createElement('div');
      node.style.backgroundColor = '#333';
      node.style.borderRadius = '8px';
      node.style.cursor = 'pointer';
      node.style.transition = 'background-color 0.1s';
      
      node.addEventListener('pointerdown', () => {
        if (!isInteractive) return;
        userSequence.push(i);
        
        // Highlight clicked node briefly
        const originalBg = node.style.backgroundColor;
        node.style.backgroundColor = '#4caf50';
        setTimeout(() => {
          if (!isDestroyed) {
            node.style.backgroundColor = originalBg;
          }
        }, 200);

        if (userSequence.length === currentSequence.length) {
          isInteractive = false;
          recordAndNext();
        }
      });
      nodes.push(node);
      container.appendChild(node);
    }
    el.appendChild(container);

    // Play sequence
    sequenceIndex = 0;
    setTimeout(() => playNextNode(nodes, params.showMs), 500);
  }

  function playNextNode(nodes: HTMLElement[], showMs: number) {
    if (isDestroyed) return;
    if (sequenceIndex >= currentSequence.length) {
      isInteractive = true;
      return;
    }

    const nodeIdx = currentSequence[sequenceIndex];
    const node = nodes[nodeIdx];
    node.style.backgroundColor = '#2196f3';
    
    timeoutId = setTimeout(() => {
      if (isDestroyed) return;
      node.style.backgroundColor = '#333';
      sequenceIndex++;
      
      timeoutId = setTimeout(() => {
        playNextNode(nodes, showMs);
      }, 200); // gap between flashes
    }, showMs);
  }

  function recordAndNext() {
    clearTimeout(timeoutId);
    rounds++;
    const { accuracy } = engine.submit(userSequence);
    totalAcc += accuracy;
    
    el.style.backgroundColor = accuracy === 1 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
    setTimeout(() => {
      if (!isDestroyed) {
        el.style.backgroundColor = '';
        nextRound();
      }
    }, 500);
  }

  function finish() {
    isDestroyed = true;
    clearTimeout(timeoutId);
    onEnd({
      accuracy: rounds > 0 ? totalAcc / rounds : 0,
      avgRtMs: 0,
      rounds
    });
  }

  nextRound();

  return () => {
    isDestroyed = true;
    clearTimeout(timeoutId);
  };
}
