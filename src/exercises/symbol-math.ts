import { ExerciseModule, BlockResult } from './contract';

const symbolMathModule: ExerciseModule = {
  manifest: {
    id: 'symbol-math',
    name: 'Тайный Шифр',
    domain: 'logic',
    skills: ['mental_calculation', 'logical_reasoning'],
    metricModel: 'logic-correctness',
    instruction: 'Вычислите значение символа по уравнениям и решите финальный пример.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .sm-eqs {
          font-size: 24px;
          background: rgba(255,255,255,0.05);
          padding: 16px 24px;
          border-radius: 12px;
          text-align: center;
          line-height: 1.5;
        }
        .sm-question {
          font-size: 28px;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 12px;
        }
        .sm-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 300px;
        }
        .sm-btn {
          width: 64px;
          height: 64px;
          font-size: 24px;
          font-weight: 600;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
        }
        .sm-btn:active { transform: scale(0.95); }
      </style>
      <div class="sm-arena">
        <div class="sm-eqs" id="sm-eqs"></div>
        <div class="sm-question" id="sm-question"></div>
        <div class="sm-controls" id="sm-controls"></div>
      </div>
    `;

    const eqsEl = el.querySelector('#sm-eqs') as HTMLElement;
    const qEl = el.querySelector('#sm-question') as HTMLElement;
    const controls = el.querySelector('#sm-controls') as HTMLElement;

    const symbols = ['⭐', '🔺', '🟦', '🔴', '🟩'];
    let currentAns = 0;
    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      controls.innerHTML = '';
      
      const sym1 = symbols[Math.floor(Math.random() * symbols.length)];
      let sym2 = symbols[Math.floor(Math.random() * symbols.length)];
      while(sym2 === sym1) sym2 = symbols[Math.floor(Math.random() * symbols.length)];

      const val1 = Math.floor(Math.random() * 5) + 1 + Math.floor(level);
      const val2 = Math.floor(Math.random() * 5) + 1 + Math.floor(level);

      const op1 = Math.random() > 0.5 ? '+' : '-';
      let eq1 = '';
      if (op1 === '+') {
        const c = val1 + val1;
        eq1 = `${sym1} + ${sym1} = ${c}`;
      } else {
        const c = val1 * 2;
        eq1 = `${sym1} × 2 = ${c}`;
      }

      const c2 = val1 + val2;
      const eq2 = `${sym1} + ${sym2} = ${c2}`;

      eqsEl.innerHTML = `<div>${eq1}</div><div>${eq2}</div>`;
      
      const ops = ['+', '-', '×'];
      const finalOp = ops[Math.floor(Math.random() * (level > 3 ? 3 : 2))];
      
      qEl.innerHTML = `${sym1} ${finalOp} ${sym2} = ?`;
      
      if (finalOp === '+') currentAns = val1 + val2;
      else if (finalOp === '-') currentAns = val1 - val2;
      else currentAns = val1 * val2;

      let options = [currentAns];
      while(options.length < 4) {
        let fake = currentAns + Math.floor(Math.random() * 10) - 5;
        if (fake !== currentAns && !options.includes(fake)) options.push(fake);
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'sm-btn';
        btn.textContent = opt.toString();
        btn.onclick = () => {
          rounds++;
          if (opt === currentAns) correct++;
          rts.push(performance.now() - t0);
          startRound();
        };
        controls.appendChild(btn);
      });

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default symbolMathModule;
