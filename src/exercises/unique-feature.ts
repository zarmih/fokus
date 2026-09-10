import { ExerciseModule, BlockResult } from './contract';

const uniqueFeatureModule: ExerciseModule = {
  manifest: {
    id: 'unique-feature',
    name: 'Исключение',
    domain: 'attention',
    skills: ['selective_attention', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Найдите единственную уникальную фигуру, которая не повторяется.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .uf-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .uf-grid {
          display: grid;
          gap: 12px;
        }
        .uf-cell {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s;
        }
        .uf-cell:active { transform: scale(0.9); }
      </style>
      <div class="uf-arena">
        <div class="uf-grid" id="uf-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#uf-grid') as HTMLElement;
    let t0 = performance.now();
    let phase = 'input';

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7'];
    const shapes = ['⬤', '■', '▲', '★', '♦'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'input';
      grid.innerHTML = '';

      const gridSize = level > 6 ? 5 : (level > 3 ? 4 : 3);
      const totalCells = gridSize * gridSize;
      
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 56px)`;

      // generate feature combinations
      const allCombos = [];
      for (let c of colors) {
        for (let s of shapes) {
          allCombos.push({ color: c, shape: s });
        }
      }
      allCombos.sort(() => Math.random() - 0.5);

      const targetItem = allCombos[0];
      const distractorTypes = allCombos.slice(1, 1 + (level > 4 ? 4 : 2)); // 2-4 distractor types

      const items: { color: string, shape: string, isTarget: boolean }[] = [];
      items.push({ ...targetItem, isTarget: true });

      for (let i = 1; i < totalCells; i++) {
        items.push({ ...distractorTypes[i % distractorTypes.length], isTarget: false });
      }

      items.sort(() => Math.random() - 0.5);

      items.forEach(item => {
        const cell = document.createElement('div');
        cell.className = 'uf-cell';
        cell.textContent = item.shape;
        cell.style.color = item.color;

        cell.onclick = () => {
          if (phase !== 'input') return;
          phase = 'anim';
          rounds++;
          rts.push(performance.now() - t0);

          if (item.isTarget) {
            correct++;
            cell.style.background = 'rgba(16, 185, 129, 0.3)';
          } else {
            cell.style.background = 'rgba(239, 68, 68, 0.3)';
            // reveal target
            const cells = grid.querySelectorAll('.uf-cell');
            cells.forEach((c: any, i) => {
              if (items[i].isTarget) c.style.background = 'rgba(16, 185, 129, 0.3)';
            });
          }

          setTimeout(startRound, 600);
        };
        grid.appendChild(cell);
      });

      t0 = performance.now();
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

export default uniqueFeatureModule;
