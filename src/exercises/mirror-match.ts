import { ExerciseModule, BlockResult } from './contract';

const mirrorMatchModule: ExerciseModule = {
  manifest: {
    id: 'mirror-match',
    name: 'Зеркальное отражение',
    domain: 'logic',
    skills: ['spatial_reasoning', 'pattern_recognition'],
    metricModel: 'speed-accuracy',
    instruction: 'Сверху показан узор. Выберите снизу тот вариант, который является его точным зеркальным отражением (по горизонтали).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .mm-label {
          font-size: 14px;
          color: var(--text-dim);
          margin-bottom: 8px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .mm-grid {
          display: grid;
          gap: 4px;
          padding: 8px;
          background: var(--surface);
          border-radius: 12px;
          border: 2px solid var(--line);
        }
        .mm-cell {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          background: var(--bg);
        }
        .mm-cell.filled {
          background: var(--primary);
        }
        .mm-options {
          display: flex;
          gap: 40px;
        }
        .mm-option-wrapper {
          cursor: pointer;
          transition: transform 0.1s;
          padding: 12px;
          border-radius: 16px;
          border: 4px solid transparent;
        }
        .mm-option-wrapper:active {
          transform: scale(0.95);
        }
      </style>
      <div class="mm-arena">
        <div>
          <div class="mm-label">Оригинал</div>
          <div id="mm-target" class="mm-grid"></div>
        </div>
        <div class="mm-options" id="mm-options"></div>
      </div>
    `;

    const targetEl = el.querySelector('#mm-target') as HTMLElement;
    const optionsEl = el.querySelector('#mm-options') as HTMLElement;

    let t0 = performance.now();
    let clickDisabled = false;
    let correctIndex = 0;

    const generatePattern = (size: number, fillCount: number) => {
      const pattern = Array(size * size).fill(false);
      let placed = 0;
      while (placed < fillCount) {
        const idx = Math.floor(Math.random() * (size * size));
        if (!pattern[idx]) {
          pattern[idx] = true;
          placed++;
        }
      }
      // ensure pattern is not horizontally symmetric to make the task meaningful
      let isSymmetric = true;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size / 2; x++) {
          if (pattern[y * size + x] !== pattern[y * size + (size - 1 - x)]) {
            isSymmetric = false;
            break;
          }
        }
      }
      if (isSymmetric) return generatePattern(size, fillCount);
      return pattern;
    };

    const mirrorPattern = (pattern: boolean[], size: number) => {
      const mirrored = Array(size * size).fill(false);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          mirrored[y * size + x] = pattern[y * size + (size - 1 - x)];
        }
      }
      return mirrored;
    };

    const rotatePattern = (pattern: boolean[], size: number) => {
      const rotated = Array(size * size).fill(false);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          rotated[x * size + (size - 1 - y)] = pattern[y * size + x];
        }
      }
      return rotated;
    };

    const renderGrid = (container: HTMLElement, pattern: boolean[], size: number) => {
      container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      container.innerHTML = '';
      pattern.forEach(filled => {
        const cell = document.createElement('div');
        cell.className = 'mm-cell' + (filled ? ' filled' : '');
        container.appendChild(cell);
      });
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      clickDisabled = false;
      const size = level < 5 ? 3 : (level < 10 ? 4 : 5);
      const fillCount = Math.floor((size * size) * 0.4);
      
      const targetPattern = generatePattern(size, fillCount);
      const mirrored = mirrorPattern(targetPattern, size);
      
      // The distractor shouldn't just be the target pattern again, it might be obvious it's not mirrored.
      // Distractor could be rotated 90 or 180 degrees.
      const distractor = Math.random() > 0.5 ? rotatePattern(targetPattern, size) : rotatePattern(mirrored, size);
      
      // Edge case: if distractor happens to equal mirrored, rotate again
      let match = true;
      for(let i=0; i<mirrored.length; i++) {
        if(distractor[i] !== mirrored[i]) { match = false; break; }
      }
      if (match) {
         distractor[0] = !distractor[0]; // just flip one bit to make it different
      }

      renderGrid(targetEl, targetPattern, size);
      
      optionsEl.innerHTML = '';
      correctIndex = Math.random() > 0.5 ? 1 : 0;
      
      for (let i = 0; i < 2; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'mm-option-wrapper';
        
        const grid = document.createElement('div');
        grid.className = 'mm-grid';
        renderGrid(grid, i === correctIndex ? mirrored : distractor, size);
        
        wrap.appendChild(grid);
        wrap.onclick = () => handleAns(i, wrap);
        optionsEl.appendChild(wrap);
      }
      
      t0 = performance.now();
    };

    const handleAns = (idx: number, wrap: HTMLElement) => {
      if (isGameOver || clickDisabled) return;
      clickDisabled = true;
      rounds++;
      rts.push(performance.now() - t0);

      if (idx === correctIndex) {
        correct++;
        wrap.style.borderColor = 'var(--ok)';
        setTimeout(startRound, 300);
      } else {
        wrap.style.borderColor = 'var(--danger)';
        const correctWrap = optionsEl.children[correctIndex] as HTMLElement;
        if (correctWrap) correctWrap.style.borderColor = 'var(--ok)';
        setTimeout(startRound, 800);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default mirrorMatchModule;
