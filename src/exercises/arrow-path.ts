import { ExerciseModule, BlockResult } from './contract';

const arrowPathModule: ExerciseModule = {
  manifest: {
    id: 'arrow-path',
    name: 'Путь по стрелкам',
    domain: 'logic',
    skills: ['spatial_reasoning', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Проследите путь от зелёного круга по направлению стрелок и нажмите на ту клетку, на которой путь заканчивается.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ap-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .ap-grid {
          display: grid;
          gap: 8px;
          margin: auto;
          background: var(--line);
          padding: 8px;
          border-radius: 12px;
        }
        .ap-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          background: var(--surface);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          user-select: none;
        }
        .ap-cell:active {
          transform: scale(0.95);
        }
        .ap-start {
          width: 24px;
          height: 24px;
          background: var(--ok);
          border-radius: 50%;
        }
        .ap-arrow {
          font-weight: bold;
          color: var(--text);
        }
      </style>
      <div class="ap-container">
        <div class="ap-grid" id="ap-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#ap-grid') as HTMLElement;
    let t0 = performance.now();

    const getGridSize = () => {
      if (level < 3) return 3;
      if (level < 7) return 4;
      return 5;
    };

    const getPathLength = () => {
      if (level < 2) return 2;
      if (level < 4) return 3;
      if (level < 6) return 4;
      if (level < 8) return 5;
      return 6;
    };

    const dirs = [
      { dx: 0, dy: -1, sym: '↑' },
      { dx: 1, dy: 0, sym: '→' },
      { dx: 0, dy: 1, sym: '↓' },
      { dx: -1, dy: 0, sym: '←' },
      { dx: 1, dy: -1, sym: '↗' },
      { dx: 1, dy: 1, sym: '↘' },
      { dx: -1, dy: 1, sym: '↙' },
      { dx: -1, dy: -1, sym: '↖' }
    ];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      grid.innerHTML = '';
      const size = getGridSize();
      const targetLen = getPathLength();
      grid.style.gridTemplateColumns = `repeat(${size}, 60px)`;
      grid.style.gridTemplateRows = `repeat(${size}, 60px)`;

      let path: number[] = [];
      let cellData: string[] = Array(size * size).fill('');
      
      let attempt = 0;
      while (attempt < 100) {
        attempt++;
        path = [];
        cellData = Array(size * size).fill('');
        
        let cx = Math.floor(Math.random() * size);
        let cy = Math.floor(Math.random() * size);
        path.push(cy * size + cx);
        
        let valid = true;
        for (let i = 0; i < targetLen; i++) {
          let validDirs = dirs.filter(d => {
            let nx = cx + d.dx;
            let ny = cy + d.dy;
            if (nx < 0 || nx >= size || ny < 0 || ny >= size) return false;
            let nIdx = ny * size + nx;
            return !path.includes(nIdx);
          });
          
          if (validDirs.length === 0) {
            valid = false;
            break;
          }
          
          let d = validDirs[Math.floor(Math.random() * validDirs.length)];
          cellData[cy * size + cx] = d.sym;
          
          cx += d.dx;
          cy += d.dy;
          path.push(cy * size + cx);
        }
        
        if (valid) break;
      }
      
      const endCellIdx = path[path.length - 1];

      for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'ap-cell';
        
        if (i === path[0]) {
          cell.innerHTML = `<div class="ap-start"></div>`;
        } else if (cellData[i]) {
          cell.innerHTML = `<span class="ap-arrow">${cellData[i]}</span>`;
        }
        
        cell.onclick = () => {
          if (isGameOver) return;
          rounds++;
          rts.push(performance.now() - t0);
          
          if (i === endCellIdx) {
            correct++;
            cell.style.background = 'var(--ok)';
          } else {
            cell.style.background = 'var(--danger)';
            const endCell = grid.children[endCellIdx] as HTMLElement;
            if (endCell) {
              endCell.style.background = 'var(--ok)';
            }
          }
          
          Array.from(grid.children).forEach((c: any) => c.style.pointerEvents = 'none');
          setTimeout(startRound, 500);
        };
        
        grid.appendChild(cell);
      }

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default arrowPathModule;
