import { ExerciseModule, BlockResult } from './contract';

const findPairModule: ExerciseModule = {
  manifest: {
    id: 'find-pair',
    name: 'Двойник',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Найдите и нажмите на любую из ДВУХ одинаковых фигур.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .fp-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .fp-grid {
          display: grid;
          gap: 16px;
        }
        .fp-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s, border-color 0.2s, background 0.2s;
        }
        .fp-btn:active { transform: scale(0.9); }
      </style>
      <div class="fp-arena">
        <div class="fp-grid" id="fp-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#fp-grid') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetSymbol = '';

    const symbols = ['☀','☁','☂','☃','☄','★','☆','☇','☈','☉','☊','☋','☌','☍','☎','☏','☐','☑','☒','☓','☔','☕','☖','☗','☘','☙','☚','☛','☜','☝','☞','☟','☠','☡','☢','☣','☤','☥','☦','☧','☨','☩','☪','☫','☬','☭','☮','☯'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      grid.innerHTML = '';

      const gridSize = level > 5 ? 4 : 3;
      const totalCells = gridSize * gridSize;
      
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 80px)`;

      // Pick symbols
      const pool = [...symbols].sort(() => Math.random() - 0.5);
      
      targetSymbol = pool.pop() || '★';
      
      const items = [targetSymbol, targetSymbol]; // the pair
      
      while (items.length < totalCells) {
        items.push(pool.pop() || '☆');
      }

      items.sort(() => Math.random() - 0.5);

      items.forEach((sym) => {
        const btn = document.createElement('button');
        btn.className = 'fp-btn';
        btn.textContent = sym;
        
        // Random slight rotation or color for distractor variation at high levels?
        if (level > 4) {
          const hue = Math.floor(Math.random() * 360);
          btn.style.color = `hsl(${hue}, 70%, 70%)`;
        }

        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (sym === targetSymbol) {
            correct++;
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
          } else {
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            
            // highlight the correct ones
            Array.from(grid.children).forEach((child: any) => {
              if (child.textContent === targetSymbol) {
                child.style.borderColor = 'var(--ok)';
              }
            });
          }

          setTimeout(startRound, 800);
        };
        grid.appendChild(btn);
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

export default findPairModule;
