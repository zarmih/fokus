import { ExerciseModule, BlockResult } from './contract';

const gridStashModule: ExerciseModule = {
  manifest: {
    id: 'grid-stash',
    name: 'Сетка-тайник',
    domain: 'memory',
    skills: ['visual_memory', 'spatial_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните подсвеченные ячейки, а затем воспроизведите их расположение.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correctRounds = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .gs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .gs-grid {
          display: grid;
          gap: 10px;
          background: var(--surface);
          padding: 20px;
          border-radius: 12px;
          border: 2px solid var(--line);
        }
        .gs-cell {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          background: var(--bg);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: all 0.2s;
        }
        .gs-cell.hidden {
          background: var(--bg);
        }
        .gs-cell.highlight {
          background: var(--accent);
          border-color: var(--accent);
        }
        .gs-cell.correct {
          background: var(--ok);
          border-color: var(--ok);
        }
        .gs-cell.wrong {
          background: var(--danger);
          border-color: var(--danger);
        }
      </style>
      <div class="gs-arena">
        <div class="gs-grid" id="gs-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#gs-grid') as HTMLElement;
    
    let gridSize = 3 + Math.floor(level / 3); // 3x3, 4x4, etc.
    if (gridSize > 6) gridSize = 6;
    let targetCount = 3 + Math.floor(level / 2);
    if (targetCount >= gridSize * gridSize) targetCount = gridSize * gridSize - 1;

    let targetIndices: Set<number> = new Set();
    let userSelections: Set<number> = new Set();
    let phase = 'wait';
    let t0 = 0;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'show';
      userSelections.clear();
      targetIndices.clear();

      // Setup grid
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;
      grid.innerHTML = '';

      const totalCells = gridSize * gridSize;
      
      while (targetIndices.size < targetCount) {
        targetIndices.add(Math.floor(Math.random() * totalCells));
      }

      for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'gs-cell';
        cell.dataset.idx = i.toString();
        
        if (targetIndices.has(i)) {
          cell.classList.add('highlight');
        }
        
        cell.onclick = () => handleCellClick(i, cell);
        grid.appendChild(cell);
      }

      // Hide after a delay
      setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        t0 = performance.now();
        const cells = grid.querySelectorAll('.gs-cell');
        cells.forEach(c => c.classList.remove('highlight'));
      }, 1000 + targetCount * 200);
    };

    const handleCellClick = (idx: number, cellElement: HTMLElement) => {
      if (phase !== 'input') return;
      if (userSelections.has(idx)) return; // already clicked

      userSelections.add(idx);
      
      if (targetIndices.has(idx)) {
        cellElement.classList.add('correct');
        if (userSelections.size === targetIndices.size) {
          finishRound(true);
        }
      } else {
        cellElement.classList.add('wrong');
        // show missing ones
        const cells = grid.querySelectorAll('.gs-cell');
        targetIndices.forEach(i => {
          if (!userSelections.has(i)) {
             cells[i].classList.add('highlight');
          }
        });
        finishRound(false);
      }
    };

    const finishRound = (win: boolean) => {
      phase = 'result';
      rounds++;
      if (win) correctRounds++;
      rts.push(performance.now() - t0);

      if (win) {
        // scale difficulty dynamically could be done here, but we rely on level
      }

      setTimeout(startRound, 1000);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correctRounds / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default gridStashModule;
