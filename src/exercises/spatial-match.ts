import { ExerciseModule, BlockResult } from './contract';

const spatialMatchModule: ExerciseModule = {
  manifest: {
    id: 'spatial-match',
    name: 'Шаблон',
    domain: 'memory',
    skills: ['spatial_memory', 'working_memory'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните узор на сетке. Затем определите, совпадает ли с ним следующий узор.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .sm-grid {
          display: grid;
          gap: 8px;
        }
        .sm-cell {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          transition: background 0.2s;
        }
        .sm-cell.filled {
          background: var(--accent);
        }
        .sm-controls {
          display: flex;
          gap: 40px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        .sm-controls.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .sm-btn {
          width: 140px;
          height: 80px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .sm-btn:active { transform: scale(0.95); }
      </style>
      <div class="sm-arena">
        <div class="sm-grid" id="sm-grid"></div>
        <div class="sm-controls" id="sm-controls">
          <button class="sm-btn" id="sm-yes">Совпадает</button>
          <button class="sm-btn" id="sm-no">Отличается</button>
        </div>
      </div>
    `;

    const grid = el.querySelector('#sm-grid') as HTMLElement;
    const controls = el.querySelector('#sm-controls') as HTMLElement;
    const btnYes = el.querySelector('#sm-yes') as HTMLElement;
    const btnNo = el.querySelector('#sm-no') as HTMLElement;

    let t0 = performance.now();
    let phase = 'memorize';
    let targetPattern: boolean[] = [];
    let isSame = false;

    const gridSize = level > 5 ? 4 : 3;
    const totalCells = gridSize * gridSize;

    const renderGrid = (pattern: boolean[]) => {
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 56px)`;
      pattern.forEach(p => {
        const cell = document.createElement('div');
        cell.className = 'sm-cell';
        if (p) cell.classList.add('filled');
        grid.appendChild(cell);
      });
    };

    const generatePattern = () => {
      const pattern = new Array(totalCells).fill(false);
      const dots = level > 2 ? Math.floor(totalCells / 2) : 3;
      let placed = 0;
      while (placed < dots) {
        const idx = Math.floor(Math.random() * totalCells);
        if (!pattern[idx]) {
          pattern[idx] = true;
          placed++;
        }
      }
      return pattern;
    };

    const mutatePattern = (pattern: boolean[]) => {
      const mut = [...pattern];
      const filledIndices = mut.map((p, i) => p ? i : -1).filter(i => i !== -1);
      const emptyIndices = mut.map((p, i) => p ? -1 : i).filter(i => i !== -1);

      if (filledIndices.length > 0 && emptyIndices.length > 0) {
        // swap one
        const f = filledIndices[Math.floor(Math.random() * filledIndices.length)];
        const e = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        mut[f] = false;
        mut[e] = true;
      }
      return mut;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      controls.classList.remove('visible');
      btnYes.style.borderColor = 'var(--line)';
      btnNo.style.borderColor = 'var(--line)';
      
      targetPattern = generatePattern();
      renderGrid(targetPattern);

      setTimeout(() => {
        if (isGameOver) return;
        
        // Blank screen briefly
        renderGrid(new Array(totalCells).fill(false));
        
        setTimeout(() => {
          if (isGameOver) return;

          phase = 'input';
          controls.classList.add('visible');

          isSame = Math.random() > 0.5;
          const testPattern = isSame ? targetPattern : mutatePattern(targetPattern);
          renderGrid(testPattern);

          t0 = performance.now();
        }, 500);

      }, 1500); // 1.5s to memorize
    };

    const handleAns = (ansIsSame: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'result';
      rounds++;
      rts.push(performance.now() - t0);

      if (ansIsSame === isSame) {
        correct++;
        if (ansIsSame) btnYes.style.borderColor = 'var(--ok)';
        else btnNo.style.borderColor = 'var(--ok)';
      } else {
        if (ansIsSame) btnYes.style.borderColor = 'var(--danger)';
        else btnNo.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 800);
    };

    btnYes.onclick = () => handleAns(true);
    btnNo.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default spatialMatchModule;
