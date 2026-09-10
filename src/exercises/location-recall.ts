import { ExerciseModule, BlockResult } from './contract';

const locationRecallModule: ExerciseModule = {
  manifest: {
    id: 'location-recall',
    name: 'Позиция',
    domain: 'memory',
    skills: ['spatial_memory', 'working_memory'],
    metricModel: 'memory-span', // pure memory task
    instruction: 'Запомните расположение фигур в сетке. Затем укажите, где находилась заданная фигура.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .lr-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .lr-prompt {
          height: 60px;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lr-target-icon {
          font-size: 40px;
          color: var(--accent);
        }
        .lr-grid {
          display: grid;
          gap: 12px;
        }
        .lr-cell {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--line);
          font-size: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.1s;
        }
        .lr-cell:active { transform: scale(0.95); }
        .lr-cell.hide-content span {
          display: none;
        }
      </style>
      <div class="lr-arena">
        <div class="lr-prompt" id="lr-prompt"></div>
        <div class="lr-grid" id="lr-grid"></div>
      </div>
    `;

    const promptEl = el.querySelector('#lr-prompt') as HTMLElement;
    const gridEl = el.querySelector('#lr-grid') as HTMLElement;

    const shapes = ['★', '●', '▲', '■', '♦', '♥', '♣', '♠'];
    let phase = 'memorize';
    let t0 = 0;
    let targetIdx = -1;
    let targetShape = '';
    let cells: HTMLElement[] = [];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      promptEl.innerHTML = 'Запомните!';
      gridEl.innerHTML = '';
      cells = [];

      const gridSize = level > 4 ? 4 : 3;
      const totalCells = gridSize * gridSize;
      gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 80px)`;

      // Pick items
      const numItems = Math.min(level > 2 ? 5 : 3, totalCells);
      let shuffledShapes = [...shapes].sort(() => Math.random() - 0.5).slice(0, numItems);

      const cellContents = new Array(totalCells).fill('');
      let emptyIndices = Array.from({length: totalCells}, (_, i) => i);
      
      shuffledShapes.forEach(shape => {
        const randI = Math.floor(Math.random() * emptyIndices.length);
        const idx = emptyIndices.splice(randI, 1)[0];
        cellContents[idx] = shape;
      });

      // Pick target from the ones we placed
      const placedIndices = cellContents.map((c, i) => c !== '' ? i : -1).filter(i => i !== -1);
      targetIdx = placedIndices[Math.floor(Math.random() * placedIndices.length)];
      targetShape = cellContents[targetIdx];

      cellContents.forEach((c, i) => {
        const cell = document.createElement('div');
        cell.className = 'lr-cell';
        cell.innerHTML = `<span>${c}</span>`;
        if (c !== '') cell.style.color = `hsl(${(i * 50) % 360}, 70%, 60%)`; // colors for variation
        
        cell.onclick = () => handleCellClick(i);
        gridEl.appendChild(cell);
        cells.push(cell);
      });

      // Hide after a delay
      setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        cells.forEach(c => c.classList.add('hide-content'));
        promptEl.innerHTML = `Где находилась фигура <span class="lr-target-icon">${targetShape}</span>?`;
        t0 = performance.now();
      }, 2000 + (level > 4 ? 1000 : 0));
    };

    const handleCellClick = (idx: number) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'result';
      rounds++;
      rts.push(performance.now() - t0);

      cells.forEach(c => c.classList.remove('hide-content'));

      if (idx === targetIdx) {
        correct++;
        cells[idx].style.borderColor = 'var(--ok)';
      } else {
        cells[idx].style.borderColor = 'var(--danger)';
        cells[targetIdx].style.borderColor = 'var(--ok)';
      }

      setTimeout(startRound, 1200);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default locationRecallModule;
