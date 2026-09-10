import { ExerciseModule, BlockResult } from './contract';

const shapePositionModule: ExerciseModule = {
  manifest: {
    id: 'shape-position',
    name: 'Архивариус',
    domain: 'memory',
    skills: ['spatial_memory', 'visual_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните расположение фигур. Затем укажите, где находилась появившаяся фигура.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let rts: number[] = [];
    
    let span = Math.min(8, Math.max(3, Math.floor(level / 2) + 2));
    
    el.innerHTML = `
      <style>
        .sp-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .sp-grid {
          display: grid;
          grid-template-columns: repeat(4, 60px);
          gap: 16px;
        }
        .sp-cell {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .sp-cell:hover { background: rgba(255,255,255,0.1); }
        .sp-cell.correct { background: var(--ok); }
        .sp-cell.wrong { background: var(--danger); }
        .sp-task {
          height: 48px;
          font-size: 32px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="sp-arena">
        <div class="sp-task" id="sp-task"></div>
        <div class="sp-grid" id="sp-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#sp-grid') as HTMLElement;
    const taskEl = el.querySelector('#sp-task') as HTMLElement;
    
    const icons = ['⭐', '🔺', '🟦', '🔴', '🟩', '♦️', '🔶', '🔷', '🤍', '🤎', '💜', '🖤'];
    let cells: HTMLElement[] = [];
    let currentPositions = new Map<number, string>();
    let targetShape = '';
    let targetPos = -1;
    let phase: 'memorize' | 'recall' = 'memorize';
    let t0 = performance.now();

    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'sp-cell';
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

      phase = 'memorize';
      taskEl.textContent = 'Запоминайте...';
      cells.forEach(c => { c.textContent = ''; c.className = 'sp-cell'; });
      currentPositions.clear();

      const availableIcons = [...icons].sort(() => Math.random() - 0.5).slice(0, span);
      const availablePos = Array.from({length: 16}, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, span);

      for (let i = 0; i < span; i++) {
        currentPositions.set(availablePos[i], availableIcons[i]);
        cells[availablePos[i]].textContent = availableIcons[i];
      }

      const targetIdx = Math.floor(Math.random() * span);
      targetPos = availablePos[targetIdx];
      targetShape = availableIcons[targetIdx];

      setTimeout(() => {
        if (isGameOver) return;
        cells.forEach(c => c.textContent = '');
        taskEl.innerHTML = `Где был: <b>${targetShape}</b>?`;
        phase = 'recall';
        t0 = performance.now();
      }, 2000 + level * 200);
    };

    const onCellClick = (pos: number) => {
      if (phase !== 'recall' || isGameOver) return;
      
      totalRounds++;
      rts.push(performance.now() - t0);
      phase = 'memorize'; // block input

      if (pos === targetPos) {
        correctRounds++;
        cells[pos].classList.add('correct');
        span = Math.min(16, span + 1);
      } else {
        cells[pos].classList.add('wrong');
        cells[targetPos].classList.add('correct');
        cells[targetPos].textContent = targetShape;
        span = Math.max(3, span - 1);
      }

      setTimeout(startRound, 1000);
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

export default shapePositionModule;
