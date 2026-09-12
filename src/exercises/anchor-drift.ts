import { ExerciseModule, BlockResult } from './contract';

const anchorDriftModule: ExerciseModule = {
  manifest: {
    id: 'anchor-drift',
    name: 'Дрейф якоря',
    domain: 'attention',
    skills: ['sustained_attention', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте только на якорь (★). Не трогайте дистракторы (●). Они медленно перемещаются.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const numDistractors = 5 + Math.floor(level) * 2;
    const speed = 1000 + Math.max(200, 1000 - level * 100); // ms per move

    el.innerHTML = `
      <style>
        .ad-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: var(--surface);
          border-radius: 12px;
        }
        .ad-item {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          font-size: 24px;
          cursor: pointer;
          user-select: none;
          transition: all ${speed}ms linear;
        }
        .ad-anchor {
          color: var(--accent);
          z-index: 10;
        }
        .ad-distractor {
          color: var(--text-secondary, gray);
          z-index: 5;
        }
      </style>
      <div class="ad-container" id="ad-container"></div>
    `;

    const container = el.querySelector('#ad-container') as HTMLElement;
    let t0 = performance.now();
    let moveInterval: any;

    const getRandomPos = () => {
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 400;
      return {
        x: Math.random() * (w - 50),
        y: Math.random() * (h - 50)
      };
    };

    const createItem = (isAnchor: boolean) => {
      const item = document.createElement('div');
      item.className = 'ad-item ' + (isAnchor ? 'ad-anchor' : 'ad-distractor');
      item.textContent = isAnchor ? '★' : '●';
      const pos = getRandomPos();
      item.style.left = pos.x + 'px';
      item.style.top = pos.y + 'px';
      
      item.onclick = (e) => {
        e.stopPropagation();
        if (isGameOver) return;
        if (isAnchor) {
          correct++;
          rts.push(performance.now() - t0);
          startRound();
        } else {
          errors++;
          item.style.color = 'var(--danger, red)';
          setTimeout(() => { if (!isGameOver) item.style.color = 'var(--text-secondary, gray)'; }, 200);
        }
      };
      return item;
    };

    const items: HTMLElement[] = [];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      container.innerHTML = '';
      items.length = 0;

      const anchor = createItem(true);
      container.appendChild(anchor);
      items.push(anchor);

      for (let i = 0; i < numDistractors; i++) {
        const dist = createItem(false);
        container.appendChild(dist);
        items.push(dist);
      }

      t0 = performance.now();
      rounds++;
    };

    const moveItems = () => {
      if (isGameOver) return;
      items.forEach(item => {
        const pos = getRandomPos();
        item.style.left = pos.x + 'px';
        item.style.top = pos.y + 'px';
      });
    };

    const endBlock = () => {
      isGameOver = true;
      clearInterval(moveInterval);
      const accuracy = (correct + errors) > 0 ? correct / (correct + errors) : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds: correct + errors });
    };

    // Need to wait for next frame to get container size
    setTimeout(() => {
      startRound();
      moveInterval = setInterval(moveItems, speed);
    }, 50);

    return () => { 
      isGameOver = true;
      clearInterval(moveInterval);
    };
  }
};

export default anchorDriftModule;
