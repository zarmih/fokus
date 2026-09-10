import { ExerciseModule, BlockResult } from './contract';

const equationBalanceModule: ExerciseModule = {
  manifest: {
    id: 'equation-balance',
    name: 'Математические Весы',
    domain: 'logic',
    skills: ['mental_calculation', 'logical_reasoning'],
    metricModel: 'logic-correctness',
    instruction: 'Сделайте равенство верным, выбрав правильный математический знак.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .eb-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .eb-eq {
          font-size: 48px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .eb-hole {
          width: 56px;
          height: 56px;
          border: 4px dashed var(--line);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          transition: background 0.2s;
        }
        .eb-controls {
          display: flex;
          gap: 16px;
        }
        .eb-btn {
          width: 80px;
          height: 80px;
          font-size: 32px;
          font-weight: 700;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          color: var(--text);
        }
        .eb-btn:active { transform: scale(0.9); }
      </style>
      <div class="eb-arena">
        <div class="eb-eq" id="eb-eq"></div>
        <div class="eb-controls" id="eb-controls"></div>
      </div>
    `;

    const eqEl = el.querySelector('#eb-eq') as HTMLElement;
    const controls = el.querySelector('#eb-controls') as HTMLElement;
    
    let t0 = performance.now();
    let currentOp = '+';
    let phase = 'input';

    const operators = ['+', '-', '×', '÷'];

    const generateEq = () => {
      let op = operators[Math.floor(Math.random() * (level > 4 ? 4 : 2))];
      let a, b, res;
      
      if (op === '+') {
        a = Math.floor(Math.random() * (10 + level * 5)) + 1;
        b = Math.floor(Math.random() * (10 + level * 5)) + 1;
        res = a + b;
      } else if (op === '-') {
        a = Math.floor(Math.random() * (10 + level * 5)) + 5;
        b = Math.floor(Math.random() * a);
        res = a - b;
      } else if (op === '×') {
        a = Math.floor(Math.random() * (5 + level)) + 2;
        b = Math.floor(Math.random() * (5 + level)) + 2;
        res = a * b;
      } else {
        b = Math.floor(Math.random() * (5 + level)) + 2;
        res = Math.floor(Math.random() * (5 + level)) + 2;
        a = b * res;
      }
      
      return { a, b, res, op };
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'input';
      const { a, b, res, op } = generateEq();
      currentOp = op;

      eqEl.innerHTML = `<span>${a}</span><div class="eb-hole" id="eb-hole">?</div><span>${b}</span><span>=</span><span>${res}</span>`;
      
      controls.innerHTML = '';
      const availableOps = level > 4 ? operators : ['+', '-'];
      
      availableOps.forEach(o => {
        const btn = document.createElement('button');
        btn.className = 'eb-btn';
        btn.textContent = o;
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'wait';
          rounds++;
          rts.push(performance.now() - t0);
          
          const hole = el.querySelector('#eb-hole') as HTMLElement;
          hole.textContent = o;
          hole.style.borderStyle = 'solid';
          
          if (o === currentOp) {
            correct++;
            hole.style.borderColor = 'var(--ok)';
            hole.style.color = 'var(--ok)';
          } else {
            hole.style.borderColor = 'var(--danger)';
            hole.style.color = 'var(--danger)';
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
      const avgRtMs = rts.length > 0 ? rts.reduce((acc, val) => acc + val, 0) / rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default equationBalanceModule;
