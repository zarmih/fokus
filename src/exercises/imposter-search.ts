import { ExerciseModule, BlockResult } from './contract';

const imposterSearchModule: ExerciseModule = {
  manifest: {
    id: 'imposter-search',
    name: 'Самозванец',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Среди множества одинаковых элементов скрывается ОДИН отличающийся. Найдите его как можно быстрее.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .imp-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .imp-grid {
          display: grid;
          gap: 8px;
        }
        .imp-cell {
          width: 56px;
          height: 56px;
          font-size: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s, background 0.2s;
        }
        .imp-cell:active { transform: scale(0.9); }
      </style>
      <div class="imp-arena">
        <div class="imp-grid" id="imp-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#imp-grid') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIdx = 0;

    const pairs = [
      ['O', '0'], ['I', 'l'], ['db', 'qp'], ['b', 'd'], ['q', 'p'],
      ['🙂', '🙃'], ['🍎', '🍅'], ['🚗', '🚙'], ['🌲', '🌳'], ['🐶', '🐺'],
      ['★', '☆'], ['A', '4'], ['S', '5'], ['B', '8'], ['Z', '2']
    ];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      grid.innerHTML = '';

      const gridSize = level > 5 ? 6 : (level > 2 ? 5 : 4);
      const totalCells = gridSize * gridSize;
      
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 56px)`;

      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const isReverse = Math.random() > 0.5;
      const baseSym = isReverse ? pair[1] : pair[0];
      const imposterSym = isReverse ? pair[0] : pair[1];

      targetIdx = Math.floor(Math.random() * totalCells);

      for (let i = 0; i < totalCells; i++) {
        const btn = document.createElement('div');
        btn.className = 'imp-cell';
        btn.textContent = i === targetIdx ? imposterSym : baseSym;

        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (i === targetIdx) {
            correct++;
            btn.style.background = 'rgba(16, 185, 129, 0.4)'; // ok
          } else {
            btn.style.background = 'rgba(239, 68, 68, 0.4)'; // danger
            // highlight the correct one
            (grid.children[targetIdx] as HTMLElement).style.background = 'rgba(16, 185, 129, 0.4)';
          }

          setTimeout(startRound, 600);
        };
        grid.appendChild(btn);
      }

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default imposterSearchModule;
