import { ExerciseModule, BlockResult } from './contract';

const mirrorPickModule: ExerciseModule = {
  manifest: {
    id: 'mirror-pick',
    name: 'Зеркальное отражение',
    domain: 'flexibility',
    skills: ['spatial_reasoning', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Среди предложенных вариантов найдите правильное зеркальное отражение показанной фигуры.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mp-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .mp-target-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .mp-target-label {
          font-size: 16px;
          color: var(--text);
          opacity: 0.7;
        }
        .mp-grid {
          display: grid;
          gap: 2px;
          background: var(--line);
          border: 2px solid var(--line);
          padding: 2px;
          border-radius: 4px;
        }
        .mp-cell {
          background: var(--surface);
          transition: background 0.2s;
        }
        .mp-cell.filled {
          background: var(--accent);
        }
        .mp-options {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .mp-option {
          cursor: pointer;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 8px;
          transition: transform 0.1s, border-color 0.2s;
        }
        .mp-option:hover {
          background: rgba(128, 128, 128, 0.1);
        }
        .mp-option:active {
          transform: scale(0.95);
        }
      </style>
      <div class="mp-arena">
        <div class="mp-target-container">
          <div class="mp-target-label">Исходная фигура</div>
          <div id="mp-target"></div>
        </div>
        <div class="mp-options" id="mp-options"></div>
      </div>
    `;

    const targetEl = el.querySelector('#mp-target') as HTMLElement;
    const optionsEl = el.querySelector('#mp-options') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetId = 0;

    const generateGrid = (size: number, fillCount: number) => {
      const grid = Array(size * size).fill(false);
      let filled = 0;
      while (filled < fillCount) {
        const idx = Math.floor(Math.random() * grid.length);
        if (!grid[idx]) {
          grid[idx] = true;
          filled++;
        }
      }
      return grid;
    };

    const mirrorGrid = (grid: boolean[], size: number) => {
      const res = Array(size * size).fill(false);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          res[y * size + (size - 1 - x)] = grid[y * size + x];
        }
      }
      return res;
    };

    const rotateGrid = (grid: boolean[], size: number) => {
      const res = Array(size * size).fill(false);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          res[x * size + (size - 1 - y)] = grid[y * size + x];
        }
      }
      return res;
    };

    const renderGridHtml = (grid: boolean[], size: number) => {
      const cellSize = size === 3 ? 30 : 22;
      let html = `<div class="mp-grid" style="grid-template-columns: repeat(\${size}, \${cellSize}px); grid-template-rows: repeat(\${size}, \${cellSize}px);">`;
      for (let i = 0; i < grid.length; i++) {
        html += `<div class="mp-cell \${grid[i] ? 'filled' : ''}"></div>`;
      }
      html += '</div>';
      return html;
    };

    const areGridsEqual = (g1: boolean[], g2: boolean[]) => {
      return g1.every((v, i) => v === g2[i]);
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'input';

      const size = level > 5 ? 5 : (level > 2 ? 4 : 3);
      const fillCount = Math.floor(size * size * 0.4);
      
      let original = generateGrid(size, fillCount);
      let mirror = mirrorGrid(original, size);
      
      let attempts = 0;
      while (areGridsEqual(original, mirror) && attempts < 10) {
        original = generateGrid(size, fillCount);
        mirror = mirrorGrid(original, size);
        attempts++;
      }

      targetEl.innerHTML = renderGridHtml(original, size);

      const rot90 = rotateGrid(original, size);
      const rot180 = rotateGrid(rot90, size);
      const rot270 = rotateGrid(rot180, size);

      let pool = [original, rot90, rot180, rot270];
      pool = pool.filter(g => !areGridsEqual(g, mirror));
      
      let options = [mirror];
      const numOptions = level > 3 ? 4 : 3;
      
      while (options.length < numOptions && pool.length > 0) {
        const rndIdx = Math.floor(Math.random() * pool.length);
        const g = pool.splice(rndIdx, 1)[0];
        if (!options.some(o => areGridsEqual(o, g))) {
          options.push(g);
        }
      }
      
      while (options.length < numOptions) {
        const g = generateGrid(size, fillCount);
        if (!options.some(o => areGridsEqual(o, g))) {
          options.push(g);
        }
      }

      options.sort(() => Math.random() - 0.5);
      
      targetId = options.findIndex(o => areGridsEqual(o, mirror));

      optionsEl.innerHTML = options.map((opt, i) => 
        `<div class="mp-option" data-idx="\${i}">\${renderGridHtml(opt, size)}</div>`
      ).join('');

      const opts = optionsEl.querySelectorAll('.mp-option');
      opts.forEach(opt => {
        (opt as HTMLElement).onclick = () => handleAns(parseInt(opt.getAttribute('data-idx') || '0'), opt as HTMLElement);
      });

      t0 = performance.now();
    };

    const handleAns = (idx: number, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = idx === targetId;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok, #4caf50)';
      } else {
        btn.style.borderColor = 'var(--danger, #f44336)';
        const correctOpt = optionsEl.querySelector(`[data-idx="\${targetId}"]`) as HTMLElement;
        if (correctOpt) correctOpt.style.borderColor = 'var(--ok, #4caf50)';
      }

      setTimeout(startRound, 800);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default mirrorPickModule;
