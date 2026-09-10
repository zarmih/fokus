import { ExerciseModule, BlockResult } from './contract';

const mathChainsModule: ExerciseModule = {
  manifest: {
    id: 'math-chains',
    name: 'Калькулятор',
    domain: 'logic',
    skills: ['mental_calculation', 'working_memory'],
    metricModel: 'logic-correctness',
    instruction: 'Вычислите результат цепочки математических операций. ВАЖНО: операции выполняются СТРОГО СЛЕВА НАПРАВО, без приоритета умножения!'
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
        }
        .mc-chain {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: 2px;
          background: rgba(255,255,255,0.05);
          padding: 24px 48px;
          border-radius: 24px;
        }
        .mc-controls {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .mc-btn {
          width: 100px;
          height: 80px;
          font-size: 32px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .mc-btn:active { transform: scale(0.95); }
      </style>
      <div class="mc-arena">
        <div class="mc-chain" id="mc-chain"></div>
        <div class="mc-controls" id="mc-controls"></div>
      </div>
    `;

    const chainEl = el.querySelector('#mc-chain') as HTMLElement;
    const controls = el.querySelector('#mc-controls') as HTMLElement;

    let t0 = performance.now();
    let targetAns = 0;
    let phase = 'input';

    const ops = ['+', '-', '×'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const numOps = level > 6 ? 3 : (level > 2 ? 2 : 1);
      
      let val = Math.floor(Math.random() * 10) + 1;
      let str = val.toString();

      for (let i = 0; i < numOps; i++) {
        const op = ops[Math.floor(Math.random() * ops.length)];
        // Keep numbers manageable
        const operand = op === '×' ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 15) + 1;
        
        str += ` ${op} ${operand}`;
        if (op === '+') val += operand;
        if (op === '-') val -= operand;
        if (op === '×') val *= operand;
      }

      str += ' = ?';
      chainEl.textContent = str;
      chainEl.style.color = 'var(--text)';
      targetAns = val;

      controls.innerHTML = '';
      
      const options = [targetAns];
      while (options.length < 6) {
        const fake = targetAns + Math.floor(Math.random() * 20) - 10;
        if (!options.includes(fake)) options.push(fake);
      }
      options.sort((a,b) => a - b);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'mc-btn';
        btn.textContent = opt.toString();
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          chainEl.textContent = chainEl.textContent?.replace('?', opt.toString()) || '';

          if (opt === targetAns) {
            correct++;
            chainEl.style.color = 'var(--ok)';
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
          } else {
            chainEl.style.color = 'var(--danger)';
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
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
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default mathChainsModule;
