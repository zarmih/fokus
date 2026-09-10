import { ExerciseModule, BlockResult } from './contract';

const missingOperatorModule: ExerciseModule = {
  manifest: {
    id: 'missing-operator',
    name: 'Знак',
    domain: 'logic',
    skills: ['mental_calculation', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите недостающий математический знак (+, -, ×, ÷), чтобы равенство стало верным.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mo-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .mo-equation {
          font-size: 64px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 24px;
          background: rgba(255,255,255,0.05);
          padding: 24px 48px;
          border-radius: 24px;
          border: 2px solid var(--line);
        }
        .mo-blank {
          display: inline-block;
          width: 64px;
          height: 64px;
          border-bottom: 6px solid var(--accent);
          text-align: center;
          line-height: 64px;
          color: var(--accent);
        }
        .mo-controls {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .mo-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .mo-btn:active { transform: scale(0.95); }
      </style>
      <div class="mo-arena">
        <div class="mo-equation" id="mo-equation"></div>
        <div class="mo-controls">
          <button class="mo-btn" data-op="+">+</button>
          <button class="mo-btn" data-op="-">−</button>
          <button class="mo-btn" data-op="×">×</button>
          <button class="mo-btn" data-op="÷">÷</button>
        </div>
      </div>
    `;

    const eqContainer = el.querySelector('#mo-equation') as HTMLElement;
    const btns = el.querySelectorAll('.mo-btn');

    let t0 = performance.now();
    let phase = 'input';
    let targetOp = '';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const ops = ['+', '-', '×', '÷'];
      // At lower levels, maybe no division
      const availableOps = level > 3 ? ops : ['+', '-', '×'];
      targetOp = availableOps[Math.floor(Math.random() * availableOps.length)];

      let a = 0, b = 0, result = 0;

      if (targetOp === '+') {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        result = a + b;
      } else if (targetOp === '-') {
        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * 20) + 1;
        result = a - b;
      } else if (targetOp === '×') {
        a = Math.floor(Math.random() * 12) + 2;
        b = Math.floor(Math.random() * 12) + 2;
        result = a * b;
      } else if (targetOp === '÷') {
        b = Math.floor(Math.random() * 9) + 2;
        result = Math.floor(Math.random() * 12) + 2;
        a = b * result;
      }

      // Ensure uniqueness of solution (e.g. 2 + 2 = 4, but 2 x 2 = 4 too. Avoid these)
      while ((targetOp === '+' && a * b === result) || 
             (targetOp === '×' && a + b === result)) {
        b++;
        if (targetOp === '+') result = a + b;
        if (targetOp === '×') result = a * b;
      }

      eqContainer.innerHTML = `<span>${a}</span> <span class="mo-blank" id="mo-blank">?</span> <span>${b}</span> <span>=</span> <span>${result}</span>`;
      eqContainer.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (ans: string, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const blank = el.querySelector('#mo-blank') as HTMLElement;
      blank.textContent = ans === '-' ? '−' : ans; // use proper minus sign for display

      if (ans === targetOp) {
        correct++;
        eqContainer.style.borderColor = 'var(--ok)';
        blank.style.color = 'var(--ok)';
        blank.style.borderBottomColor = 'transparent';
      } else {
        eqContainer.style.borderColor = 'var(--danger)';
        blank.style.color = 'var(--danger)';
        blank.style.borderBottomColor = 'transparent';
        
        // highlight correct btn
        btns.forEach((b: any) => {
          if (b.dataset.op === targetOp) b.style.borderColor = 'var(--ok)';
        });
      }

      setTimeout(() => {
        btns.forEach((b: any) => b.style.borderColor = 'var(--line)');
        startRound();
      }, 1000);
    };

    btns.forEach((b: any) => {
      b.onclick = () => handleAns(b.dataset.op, b);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+') handleAns('+', Array.from(btns).find((b: any) => b.dataset.op === '+') as HTMLElement);
      if (e.key === '-') handleAns('-', Array.from(btns).find((b: any) => b.dataset.op === '-') as HTMLElement);
      if (e.key === '*') handleAns('×', Array.from(btns).find((b: any) => b.dataset.op === '×') as HTMLElement);
      if (e.key === '/') handleAns('÷', Array.from(btns).find((b: any) => b.dataset.op === '÷') as HTMLElement);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default missingOperatorModule;
