import { ExerciseModule, BlockResult } from './contract';

const shapeCountModule: ExerciseModule = {
  manifest: {
    id: 'shape-count',
    name: 'Счётчик',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Посчитайте количество УКАЗАННЫХ фигур среди всех остальных.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .sc-task {
          font-size: 24px;
          font-weight: bold;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sc-target-shape {
          font-size: 40px;
          color: var(--text);
        }
        .sc-grid {
          display: grid;
          gap: 8px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 16px;
        }
        .sc-cell {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .sc-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 400px;
        }
        .sc-btn {
          width: 64px;
          height: 64px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .sc-btn:active { transform: scale(0.95); }
      </style>
      <div class="sc-arena">
        <div class="sc-task" id="sc-task">Сколько фигур <span class="sc-target-shape" id="sc-target-shape"></span> ?</div>
        <div class="sc-grid" id="sc-grid"></div>
        <div class="sc-controls" id="sc-controls"></div>
      </div>
    `;

    const grid = el.querySelector('#sc-grid') as HTMLElement;
    const targetShapeEl = el.querySelector('#sc-target-shape') as HTMLElement;
    const controls = el.querySelector('#sc-controls') as HTMLElement;

    let t0 = performance.now();
    let targetAns = 0;
    let phase = 'input';

    const shapes = ['⬤', '■', '▲', '★', '♦', '✖'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'input';
      grid.innerHTML = '';

      const gridSize = level > 5 ? 5 : (level > 2 ? 4 : 3);
      const totalCells = gridSize * gridSize;
      
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 48px)`;

      const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
      targetShapeEl.textContent = targetShape;

      // Ensure a specific number of targets
      targetAns = Math.max(1, Math.floor(Math.random() * (totalCells / 2)));
      
      const items = [];
      for (let i = 0; i < targetAns; i++) {
        items.push(targetShape);
      }
      for (let i = targetAns; i < totalCells; i++) {
        let distractor;
        do {
          distractor = shapes[Math.floor(Math.random() * shapes.length)];
        } while (distractor === targetShape);
        items.push(distractor);
      }

      items.sort(() => Math.random() - 0.5);

      items.forEach(shape => {
        const cell = document.createElement('div');
        cell.className = 'sc-cell';
        cell.textContent = shape;
        cell.style.color = 'var(--text)';
        // Random slight rotation to make it harder at high levels
        if (level > 6) {
          cell.style.transform = `rotate(${(Math.random() - 0.5) * 60}deg)`;
        }
        grid.appendChild(cell);
      });

      controls.innerHTML = '';
      
      // Generate options around the target answer
      const options = [targetAns];
      while (options.length < 5) {
        const fake = targetAns + Math.floor(Math.random() * 5) - 2;
        if (fake >= 0 && !options.includes(fake)) options.push(fake);
      }
      options.sort((a,b) => a - b);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'sc-btn';
        btn.textContent = opt.toString();
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (opt === targetAns) {
            correct++;
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
          } else {
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            
            // Highlight correct cells
            const cells = grid.querySelectorAll('.sc-cell');
            cells.forEach(c => {
              if (c.textContent === targetShape) {
                (c as HTMLElement).style.color = 'var(--ok)';
                (c as HTMLElement).style.transform = 'scale(1.2)';
              }
            });
          }

          setTimeout(startRound, 1000);
        };
        controls.appendChild(btn);
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

    return () => { isGameOver = true; };
  }
};

export default shapeCountModule;
