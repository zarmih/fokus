import { ExerciseModule, BlockResult } from './contract';

const pathFinderModule: ExerciseModule = {
  manifest: {
    id: 'path-finder',
    name: 'Лабиринт',
    domain: 'memory',
    skills: ['spatial_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните скрытый путь от старта к финишу и повторите его.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let rts: number[] = [];

    const gridSize = Math.min(6, Math.max(4, Math.floor(level / 3) + 4));
    let pathLen = Math.min(12, Math.max(4, Math.floor(level) + 3));

    el.innerHTML = `
      <style>
        .pf-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
        }
        .pf-grid {
          display: grid;
          gap: 4px;
        }
        .pf-cell {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: background 0.3s;
        }
        .pf-cell.start { border-color: var(--ok); }
        .pf-cell.end { border-color: var(--danger); }
        .pf-cell.path { background: var(--accent); }
        .pf-cell.user-correct { background: var(--ok); }
        .pf-cell.user-wrong { background: var(--danger); }
        .pf-task {
          height: 32px;
          font-size: 20px;
          font-weight: 600;
        }
      </style>
      <div class="pf-task" id="pf-task"></div>
      <div class="pf-grid" id="pf-grid"></div>
    `;

    const grid = el.querySelector('#pf-grid') as HTMLElement;
    const taskEl = el.querySelector('#pf-task') as HTMLElement;

    grid.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;
    
    let cells: HTMLElement[] = [];
    let path: number[] = [];
    let userStep = 0;
    let phase = 'gen';
    let t0 = performance.now();

    for (let i = 0; i < gridSize * gridSize; i++) {
      const cell = document.createElement('div');
      cell.className = 'pf-cell';
      cell.onclick = () => onCellClick(i);
      cells.push(cell);
      grid.appendChild(cell);
    }

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'gen';
      cells.forEach(c => { c.className = 'pf-cell'; });
      path = [];
      userStep = 0;

      // generate random path (simplified walk)
      let x = 0; let y = 0;
      path.push(y * gridSize + x);
      
      let attempts = 0;
      while (path.length < pathLen && attempts < 100) {
        attempts++;
        const dirs = [
          {dx: 1, dy: 0}, {dx: -1, dy: 0},
          {dx: 0, dy: 1}, {dx: 0, dy: -1}
        ].sort(() => Math.random() - 0.5);

        for (let d of dirs) {
          const nx = x + d.dx;
          const ny = y + d.dy;
          const ni = ny * gridSize + nx;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !path.includes(ni)) {
            x = nx; y = ny;
            path.push(ni);
            break;
          }
        }
      }

      // Show path
      taskEl.textContent = 'Запоминайте путь...';
      cells[path[0]].classList.add('start');
      cells[path[path.length-1]].classList.add('end');

      let step = 0;
      const drawStep = () => {
        if (isGameOver) return;
        if (step < path.length) {
          cells[path[step]].classList.add('path');
          step++;
          setTimeout(drawStep, 300);
        } else {
          setTimeout(() => {
            if (isGameOver) return;
            path.forEach((idx, i) => {
              if (i !== 0 && i !== path.length - 1) cells[idx].classList.remove('path');
            });
            taskEl.textContent = 'Повторите путь';
            phase = 'input';
            t0 = performance.now();
          }, 1000);
        }
      };
      
      setTimeout(drawStep, 500);
    };

    const onCellClick = (idx: number) => {
      if (phase !== 'input' || isGameOver) return;
      
      if (idx === path[userStep]) {
        cells[idx].classList.add('user-correct');
        userStep++;
        
        if (userStep === path.length) {
          totalRounds++;
          correctRounds++;
          pathLen++;
          rts.push(performance.now() - t0);
          phase = 'wait';
          setTimeout(startRound, 1000);
        }
      } else {
        cells[idx].classList.add('user-wrong');
        totalRounds++;
        pathLen = Math.max(4, pathLen - 1);
        rts.push(performance.now() - t0);
        phase = 'wait';
        setTimeout(startRound, 1000);
      }
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default pathFinderModule;
