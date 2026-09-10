import { ExerciseModule, BlockResult } from './contract';

const pathRecallModule: ExerciseModule = {
  manifest: {
    id: 'path-recall',
    name: 'Траектория',
    domain: 'memory',
    skills: ['spatial_memory', 'working_memory'],
    metricModel: 'memory-span', // can be speed-accuracy, memory matters more here
    instruction: 'Запомните путь, по которому зажигаются квадраты, и повторите его.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .pr-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .pr-grid {
          display: grid;
          gap: 8px;
        }
        .pr-cell {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .pr-cell.active {
          background: var(--accent);
          transform: scale(1.05);
        }
        .pr-cell.correct {
          background: rgba(16, 185, 129, 0.8);
        }
        .pr-cell.error {
          background: rgba(239, 68, 68, 0.8);
        }
      </style>
      <div class="pr-arena">
        <div class="pr-grid" id="pr-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#pr-grid') as HTMLElement;

    let t0 = performance.now();
    let phase = 'memorize';
    let targetPath: number[] = [];
    let currentInputIdx = 0;
    let cells: HTMLElement[] = [];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      grid.innerHTML = '';
      cells = [];
      targetPath = [];
      currentInputIdx = 0;

      const gridSize = level > 4 ? 4 : 3;
      const totalCells = gridSize * gridSize;
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 64px)`;

      for (let i = 0; i < totalCells; i++) {
        const btn = document.createElement('div');
        btn.className = 'pr-cell';
        btn.onclick = () => handleCellClick(i);
        grid.appendChild(btn);
        cells.push(btn);
      }

      const pathLength = Math.min(8, 3 + Math.floor(level / 2));
      
      // Generate path without immediate repeats
      let lastCell = -1;
      for (let i = 0; i < pathLength; i++) {
        let n = Math.floor(Math.random() * totalCells);
        while (n === lastCell) {
          n = Math.floor(Math.random() * totalCells);
        }
        targetPath.push(n);
        lastCell = n;
      }

      // Play path
      let step = 0;
      const playStep = () => {
        if (isGameOver) return;
        if (step < targetPath.length) {
          const cIdx = targetPath[step];
          cells[cIdx].classList.add('active');
          setTimeout(() => {
            if (isGameOver) return;
            cells[cIdx].classList.remove('active');
            setTimeout(() => {
              step++;
              playStep();
            }, 200);
          }, 400);
        } else {
          phase = 'input';
          t0 = performance.now();
        }
      };

      setTimeout(playStep, 1000);
    };

    const handleCellClick = (idx: number) => {
      if (phase !== 'input' || isGameOver) return;

      const expected = targetPath[currentInputIdx];

      if (idx === expected) {
        cells[idx].classList.add('correct');
        currentInputIdx++;
        
        setTimeout(() => cells[idx].classList.remove('correct'), 200);

        if (currentInputIdx === targetPath.length) {
          // Success
          phase = 'result';
          rounds++;
          correct++;
          rts.push(performance.now() - t0);
          setTimeout(startRound, 1000);
        }
      } else {
        // Error
        phase = 'result';
        rounds++;
        rts.push(performance.now() - t0);
        cells[idx].classList.add('error');
        cells[expected].classList.add('correct'); // show correct one
        
        setTimeout(() => {
          cells[idx].classList.remove('error');
          cells[expected].classList.remove('correct');
          startRound();
        }, 1500);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default pathRecallModule;
