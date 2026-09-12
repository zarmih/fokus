import { ExerciseModule, BlockResult } from './contract';

const matrixCompleteModule: ExerciseModule = {
  manifest: {
    id: 'matrix-complete',
    name: 'Матрицы',
    domain: 'logic',
    skills: ['pattern_recognition', 'logical_reasoning'],
    metricModel: 'logic-correctness',
    instruction: 'Выберите фигуру, которая логически дополняет пустую клетку в матрице.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          padding: 20px;
        }
        .mc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: var(--line);
          padding: 12px;
          border-radius: 12px;
        }
        .mc-cell {
          width: 80px;
          height: 80px;
          background: var(--surface);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mc-cell.empty {
          background: transparent;
          border: 2px dashed var(--text);
          opacity: 0.5;
        }
        .mc-shape {
          width: 60%;
          height: 60%;
        }
        .mc-options {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .mc-btn {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s, border-color 0.2s;
        }
        .mc-btn:active {
          transform: scale(0.95);
        }
        .mc-btn svg {
          width: 60%;
          height: 60%;
        }
      </style>
      <div class="mc-arena">
        <div class="mc-grid" id="mc-grid"></div>
        <div class="mc-options" id="mc-options"></div>
      </div>
    `;

    const gridEl = el.querySelector('#mc-grid') as HTMLElement;
    const optionsEl = el.querySelector('#mc-options') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    
    // Using simple SVG shapes
    const SHAPES = ['circle', 'square', 'triangle', 'diamond'];
    const COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'];
    
    const renderShape = (shape: string, color: string) => {
      let path = '';
      if (shape === 'circle') path = '<circle cx="50" cy="50" r="45" fill="currentColor"/>';
      if (shape === 'square') path = '<rect x="10" y="10" width="80" height="80" rx="10" fill="currentColor"/>';
      if (shape === 'triangle') path = '<polygon points="50,10 90,90 10,90" fill="currentColor"/>';
      if (shape === 'diamond') path = '<polygon points="50,10 90,50 50,90 10,50" fill="currentColor"/>';
      return `<svg viewBox="0 0 100 100" style="color: ${color}">${path}</svg>`;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'input';

      // Rules:
      // Level 1: Same shape, changing color in rows or Same color, changing shape
      // Level 2: Changing both independently
      
      const rColorIdx = Math.floor(Math.random() * COLORS.length);
      const rShapeIdx = Math.floor(Math.random() * SHAPES.length);
      
      let gridColors: string[][] = [];
      let gridShapes: string[][] = [];
      
      const ruleColors = level >= 2 ? [0, 1, 2] : [rColorIdx, rColorIdx, rColorIdx]; // random rule
      const ruleShapes = level >= 2 ? [0, 1, 2] : [0, 1, 2];
      
      // select 3 unique colors and shapes
      const pColors = [...COLORS].sort(() => Math.random() - 0.5).slice(0, 3);
      const pShapes = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, 3);
      
      const typeColor = Math.random() > 0.5 ? 'row' : 'col';
      const typeShape = Math.random() > 0.5 ? 'row' : 'col';
      
      for(let r=0; r<3; r++) {
        let cr = [], sr = [];
        for(let c=0; c<3; c++) {
          if (level === 1) {
            cr.push(pColors[0]);
            sr.push(pShapes[c]);
          } else {
            cr.push(pColors[typeColor === 'row' ? c : r]);
            sr.push(pShapes[typeShape === 'row' ? c : r]);
          }
        }
        gridColors.push(cr);
        gridShapes.push(sr);
      }

      // the target is at [2][2]
      const targetShape = gridShapes[2][2];
      const targetColor = gridColors[2][2];
      
      let html = '';
      for(let r=0; r<3; r++) {
        for(let c=0; c<3; c++) {
          if (r === 2 && c === 2) {
            html += `<div class="mc-cell empty" id="mc-target">?</div>`;
          } else {
            html += `<div class="mc-cell">${renderShape(gridShapes[r][c], gridColors[r][c])}</div>`;
          }
        }
      }
      gridEl.innerHTML = html;
      
      // options
      let opts = [{shape: targetShape, color: targetColor, isTarget: true}];
      while(opts.length < 4) {
        let rc = pColors[Math.floor(Math.random() * pColors.length)];
        let rs = pShapes[Math.floor(Math.random() * pShapes.length)];
        if (!opts.some(o => o.shape === rs && o.color === rc)) {
          opts.push({shape: rs, color: rc, isTarget: false});
        }
      }
      opts.sort(() => Math.random() - 0.5);
      
      optionsEl.innerHTML = opts.map(o => `
        <button class="mc-btn" data-correct="${o.isTarget}">
          ${renderShape(o.shape, o.color)}
        </button>
      `).join('');
      
      optionsEl.querySelectorAll('.mc-btn').forEach(btn => {
        (btn as HTMLElement).onclick = () => {
          if (phase !== 'input' || isGameOver) return;
          phase = 'anim';
          const isCorrect = btn.getAttribute('data-correct') === 'true';
          
          rounds++;
          rts.push(performance.now() - t0);
          
          if (isCorrect) {
            correct++;
            (btn as HTMLElement).style.borderColor = 'var(--ok)';
            const targetEl = gridEl.querySelector('#mc-target');
            if (targetEl) {
              targetEl.className = 'mc-cell';
              targetEl.innerHTML = renderShape(targetShape, targetColor);
            }
          } else {
            (btn as HTMLElement).style.borderColor = 'var(--danger)';
          }
          
          setTimeout(startRound, 700);
        };
      });

      t0 = performance.now();
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

export default matrixCompleteModule;
