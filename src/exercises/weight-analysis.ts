import { ExerciseModule, BlockResult } from './contract';

const weightAnalysisModule: ExerciseModule = {
  manifest: {
    id: 'weight-analysis',
    name: 'Тяжеловес',
    domain: 'logic',
    skills: ['logical_reasoning', 'working_memory'],
    metricModel: 'logic-correctness',
    instruction: 'Проанализируйте утверждения и определите самую ТЯЖЁЛУЮ или ЛЁГКУЮ фигуру.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .wa-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .wa-facts {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 24px;
          font-weight: 600;
          background: rgba(255,255,255,0.05);
          padding: 24px;
          border-radius: 16px;
          min-width: 300px;
          text-align: center;
        }
        .wa-fact {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .wa-task {
          font-size: 20px;
          font-weight: bold;
          color: var(--accent);
        }
        .wa-controls {
          display: flex;
          gap: 16px;
        }
        .wa-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wa-btn:active { transform: scale(0.9); }
      </style>
      <div class="wa-arena">
        <div class="wa-facts" id="wa-facts"></div>
        <div class="wa-task" id="wa-task"></div>
        <div class="wa-controls" id="wa-controls"></div>
      </div>
    `;

    const factsEl = el.querySelector('#wa-facts') as HTMLElement;
    const taskEl = el.querySelector('#wa-task') as HTMLElement;
    const controls = el.querySelector('#wa-controls') as HTMLElement;
    
    let t0 = performance.now();
    let targetAns = '';
    let phase = 'input';

    const items = ['🟥', '🔵', '⭐', '🔺', '♦️'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'input';
      
      const count = level > 5 ? 4 : 3;
      const selectedItems = [...items].sort(() => Math.random() - 0.5).slice(0, count);
      
      // Generate a linear order of weights: selectedItems[0] is heaviest, selectedItems[count-1] is lightest.
      const pairs = [];
      for (let i = 0; i < count - 1; i++) {
        pairs.push([selectedItems[i], selectedItems[i+1]]);
      }
      // Shuffle pairs presentation
      pairs.sort(() => Math.random() - 0.5);

      let html = '';
      pairs.forEach(p => {
        const isReverse = Math.random() > 0.5;
        if (isReverse) {
          html += `<div class="wa-fact">${p[1]} <span>легче чем</span> ${p[0]}</div>`;
        } else {
          html += `<div class="wa-fact">${p[0]} <span>тяжелее чем</span> ${p[1]}</div>`;
        }
      });

      factsEl.innerHTML = html;

      const askHeaviest = Math.random() > 0.5;
      taskEl.textContent = askHeaviest ? 'Кто самый ТЯЖЁЛЫЙ?' : 'Кто самый ЛЁГКИЙ?';
      targetAns = askHeaviest ? selectedItems[0] : selectedItems[count - 1];

      controls.innerHTML = '';
      const shuffledOptions = [...selectedItems].sort(() => Math.random() - 0.5);
      
      shuffledOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'wa-btn';
        btn.textContent = opt;
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
          }
          
          setTimeout(startRound, 800);
        };
        controls.appendChild(btn);
      });

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 4000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default weightAnalysisModule;
