import { ExerciseModule, BlockResult } from './contract';

const visualSearchModule: ExerciseModule = {
  manifest: {
    id: 'visual-search',
    name: 'Зоркий Глаз',
    domain: 'attention',
    skills: ['visual_scanning', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Найдите целевой символ среди множества похожих.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const baseCount = 10 + Math.floor(level) * 5;
    const maxCount = 50;
    
    el.innerHTML = `
      <style>
        .vs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
          gap: 8px;
          justify-content: center;
          align-content: center;
          height: 100%;
          padding: 20px;
        }
        .vs-item {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          background: var(--surface);
          border-radius: 8px;
          height: 48px;
          cursor: pointer;
          transition: transform 0.1s, background 0.1s;
          user-select: none;
        }
        .vs-item:active {
          transform: scale(0.9);
        }
        .vs-header {
          position: absolute;
          top: 20px;
          left: 0;
          width: 100%;
          text-align: center;
          font-size: 18px;
        }
        .vs-target {
          color: var(--accent);
          font-weight: 800;
          font-size: 24px;
        }
      </style>
      <div class="vs-header" id="vs-head">Найдите: <span class="vs-target" id="vs-target-char"></span></div>
      <div class="vs-grid" id="vs-grid"></div>
    `;

    const grid = el.querySelector('#vs-grid') as HTMLElement;
    const targetEl = el.querySelector('#vs-target-char') as HTMLElement;

    const pairs = [
      ['O', 'Q'], ['И', 'N'], ['p', 'q'], ['b', 'd'], ['E', 'F'], ['C', 'G']
    ];

    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      grid.innerHTML = '';
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const target = pair[0];
      const distractor = pair[1];
      
      targetEl.textContent = target;

      const count = Math.min(maxCount, baseCount + rounds * 2);
      const items = Array(count).fill(distractor);
      const targetIdx = Math.floor(Math.random() * count);
      items[targetIdx] = target;

      items.forEach((char, idx) => {
        const item = document.createElement('div');
        item.className = 'vs-item';
        item.textContent = char;
        item.onclick = () => {
          if (isGameOver) return;
          if (idx === targetIdx) {
            correct++;
            item.style.background = 'var(--ok)';
            item.style.color = '#000';
          } else {
            errors++;
            item.style.background = 'var(--danger)';
          }
          rts.push(performance.now() - t0);
          setTimeout(startRound, 200);
        };
        grid.appendChild(item);
      });

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = (correct + errors) > 0 ? correct / (correct + errors) : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds: correct + errors });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default visualSearchModule;
