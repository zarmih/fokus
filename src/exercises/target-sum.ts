import { ExerciseModule, BlockResult } from './contract';

const targetSumModule: ExerciseModule = {
  manifest: {
    id: 'target-sum',
    name: 'Сумматор',
    domain: 'logic',
    skills: ['mental_calculation', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Выберите числа, сумма которых равна заданному числу.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ts-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .ts-target-container {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .ts-target {
          font-size: 64px;
          font-weight: 800;
          color: var(--accent);
        }
        .ts-current {
          font-size: 32px;
          opacity: 0.8;
        }
        .ts-grid {
          display: grid;
          gap: 12px;
        }
        .ts-cell {
          width: 72px;
          height: 72px;
          font-size: 32px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s, border-color 0.2s, background 0.2s;
        }
        .ts-cell.selected {
          border-color: var(--accent);
          background: rgba(59, 130, 246, 0.2);
        }
        .ts-cell:active { transform: scale(0.9); }
      </style>
      <div class="ts-arena">
        <div class="ts-target-container">
          <div class="ts-current" id="ts-current">0</div>
          <div style="font-size:32px">/</div>
          <div class="ts-target" id="ts-target">0</div>
        </div>
        <div class="ts-grid" id="ts-grid"></div>
      </div>
    `;

    const targetEl = el.querySelector('#ts-target') as HTMLElement;
    const currentEl = el.querySelector('#ts-current') as HTMLElement;
    const grid = el.querySelector('#ts-grid') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetVal = 0;
    let selectedVals: number[] = [];
    let cellsData: { val: number, el: HTMLElement, selected: boolean }[] = [];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      grid.innerHTML = '';
      selectedVals = [];
      cellsData = [];
      updateCurrent();

      const gridSize = level > 5 ? 4 : 3;
      const totalCells = gridSize * gridSize;
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 72px)`;

      // Pick target components
      const numComponents = level > 2 ? 3 : 2;
      let pool: number[] = [];
      targetVal = 0;
      
      for (let i = 0; i < numComponents; i++) {
        const v = Math.floor(Math.random() * 9) + 1;
        targetVal += v;
        pool.push(v);
      }

      // Fill remaining cells
      while (pool.length < totalCells) {
        pool.push(Math.floor(Math.random() * 9) + 1);
      }
      
      pool.sort(() => Math.random() - 0.5);

      targetEl.textContent = targetVal.toString();

      pool.forEach(v => {
        const btn = document.createElement('div');
        btn.className = 'ts-cell';
        btn.textContent = v.toString();
        
        const cellInfo = { val: v, el: btn, selected: false };
        cellsData.push(cellInfo);

        btn.onclick = () => {
          if (phase !== 'input') return;
          cellInfo.selected = !cellInfo.selected;
          btn.classList.toggle('selected', cellInfo.selected);
          checkSum();
        };

        grid.appendChild(btn);
      });

      t0 = performance.now();
    };

    const updateCurrent = () => {
      const sum = cellsData.filter(c => c.selected).reduce((a, b) => a + b.val, 0);
      currentEl.textContent = sum.toString();
      return sum;
    };

    const checkSum = () => {
      const sum = updateCurrent();
      
      if (sum === targetVal) {
        // correct
        phase = 'result';
        rounds++;
        correct++;
        rts.push(performance.now() - t0);

        cellsData.forEach(c => {
          if (c.selected) {
            c.el.style.borderColor = 'var(--ok)';
            c.el.style.background = 'rgba(16, 185, 129, 0.2)';
          }
        });
        setTimeout(startRound, 600);
      } else if (sum > targetVal) {
        // bust
        phase = 'result';
        rounds++;
        rts.push(performance.now() - t0);

        cellsData.forEach(c => {
          if (c.selected) {
            c.el.style.borderColor = 'var(--danger)';
            c.el.style.background = 'rgba(239, 68, 68, 0.2)';
          }
        });
        setTimeout(startRound, 800);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default targetSumModule;
