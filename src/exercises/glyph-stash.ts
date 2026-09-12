import { ExerciseModule, BlockResult } from './contract';

const glyphStashModule: ExerciseModule = {
  manifest: {
    id: 'glyph-stash',
    name: 'Тайник глифов',
    domain: 'memory',
    skills: ['visual_memory', 'spatial_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните расположение глифов. Когда они исчезнут, выберите все ячейки, где они были.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .gs-arena {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; gap: 20px;
        }
        .gs-grid {
          display: grid; gap: 8px;
        }
        .gs-cell {
          width: 60px; height: 60px; background: var(--surface); border: 2px solid var(--line);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-size: 32px; cursor: pointer; transition: all 0.2s; color: var(--text);
          user-select: none;
        }
        .gs-cell.active {
          background: var(--surface-hover); border-color: var(--accent);
        }
      </style>
      <div class="gs-arena">
        <div class="gs-grid" id="gs-grid"></div>
      </div>
    `;

    const gridEl = el.querySelector('#gs-grid') as HTMLElement;
    
    let span = Math.min(9, 3 + Math.floor((level - 1) / 2));
    let gridSize = level > 5 ? 5 : 4;
    
    let targetIndices: number[] = [];
    let selectedIndices: Set<number> = new Set();
    let phase: 'memorize' | 'recall' | 'result' = 'memorize';
    let timeoutId: any;

    const glyphs = ['Ω','Φ','Ψ','Δ','Θ','Σ','Λ','Γ','Ξ','П'];
    
    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'memorize';
      selectedIndices.clear();
      gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;
      
      const totalCells = gridSize * gridSize;
      targetIndices = [];
      while(targetIndices.length < span) {
        const idx = Math.floor(Math.random() * totalCells);
        if (!targetIndices.includes(idx)) targetIndices.push(idx);
      }
      
      gridEl.innerHTML = '';
      for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'gs-cell';
        if (targetIndices.includes(i)) {
          const randGlyph = glyphs[Math.floor(Math.random() * glyphs.length)];
          cell.textContent = randGlyph;
        }
        cell.onclick = () => handleCellClick(i, cell);
        gridEl.appendChild(cell);
      }
      
      timeoutId = setTimeout(() => {
        if (isGameOver) return;
        phase = 'recall';
        Array.from(gridEl.children).forEach(c => {
          c.textContent = '';
        });
      }, 1500 + span * 200); // More time for more items
    };

    const handleCellClick = (idx: number, cellEl: HTMLElement) => {
      if (phase !== 'recall' || isGameOver) return;
      
      if (selectedIndices.has(idx)) {
        selectedIndices.delete(idx);
        cellEl.classList.remove('active');
      } else {
        selectedIndices.add(idx);
        cellEl.classList.add('active');
      }
      
      if (selectedIndices.size === span) {
        checkResult();
      }
    };
    
    const checkResult = () => {
      phase = 'result';
      rounds++;
      let isCorrect = true;
      for (const idx of selectedIndices) {
        if (!targetIndices.includes(idx)) isCorrect = false;
      }
      
      if (isCorrect) correct++;
      
      // Reveal
      const cells = gridEl.children;
      for (let i = 0; i < cells.length; i++) {
        if (targetIndices.includes(i)) {
          (cells[i] as HTMLElement).style.background = 'var(--ok)';
          (cells[i] as HTMLElement).style.color = '#fff';
          (cells[i] as HTMLElement).textContent = '✓';
        } else if (selectedIndices.has(i)) {
          (cells[i] as HTMLElement).style.background = 'var(--danger)';
          (cells[i] as HTMLElement).style.color = '#fff';
          (cells[i] as HTMLElement).textContent = '✗';
        }
      }
      
      timeoutId = setTimeout(startRound, 1000);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      onEnd({ accuracy, avgRtMs: 0, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default glyphStashModule;
