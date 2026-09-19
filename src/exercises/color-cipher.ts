import { ExerciseModule, BlockResult } from './contract';

const colorCipherModule: ExerciseModule = {
  manifest: {
    id: 'color-cipher',
    name: 'Цветовой Шифр',
    domain: 'logic',
    skills: ['logical_reasoning', 'numerical_processing'],
    metricModel: 'logic-correctness',
    instruction: 'Примените правила цветов к стартовому числу слева направо. Выберите правильный ответ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 2rem;
          color: #e2e8f0;
          font-family: system-ui, sans-serif;
        }
        .cc-legend {
          display: flex;
          gap: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem 2rem;
          border-radius: 16px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .cc-legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .cc-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }
        .cc-equation {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 2rem;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.2);
          padding: 2rem 3rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .cc-start-num {
          font-size: 3rem;
          color: #38bdf8;
          text-shadow: 0 0 15px rgba(56, 189, 248, 0.5);
        }
        .cc-sequence {
          display: flex;
          gap: 0.75rem;
        }
        .cc-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }
        .cc-btn {
          padding: 1rem;
          font-size: 1.5rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cc-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }
        .cc-btn:active {
          transform: translateY(0);
        }
      </style>
      <div class="cc-arena">
        <div class="cc-legend" id="cc-legend"></div>
        <div class="cc-equation">
          <div class="cc-start-num" id="cc-start"></div>
          <div style="color: #64748b;">➞</div>
          <div class="cc-sequence" id="cc-sequence"></div>
        </div>
        <div class="cc-options" id="cc-options"></div>
      </div>
    `;

    const legendEl = el.querySelector('#cc-legend') as HTMLElement;
    const startEl = el.querySelector('#cc-start') as HTMLElement;
    const seqEl = el.querySelector('#cc-sequence') as HTMLElement;
    const optsEl = el.querySelector('#cc-options') as HTMLElement;

    const colors = [
      { id: 'red', hex: '#ef4444' },
      { id: 'blue', hex: '#3b82f6' },
      { id: 'yellow', hex: '#eab308' },
      { id: 'green', hex: '#10b981' },
      { id: 'purple', hex: '#a855f7' }
    ];

    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      // Generate rules
      const activeColors = [...colors].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(level * 0.2));
      const rules = activeColors.map(c => {
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * (level < 5 ? 2 : 3))]; // Include '*' only at higher levels
        const val = Math.floor(Math.random() * 4) + 1;
        return { ...c, op, val };
      });

      // Render legend
      legendEl.innerHTML = rules.map(r => 
        `<div class="cc-legend-item">
          <div class="cc-dot" style="background: ${r.hex}; color: ${r.hex}"></div>
          <span>${r.op} ${r.val}</span>
        </div>`
      ).join('');

      // Generate sequence
      const seqLen = 2 + Math.floor(level * 0.5);
      const sequence = Array.from({ length: seqLen }, () => rules[Math.floor(Math.random() * rules.length)]);
      
      let startNum = Math.floor(Math.random() * 10) + 1;
      let target = startNum;
      
      sequence.forEach(step => {
        if (step.op === '+') target += step.val;
        if (step.op === '-') target -= step.val;
        if (step.op === '*') target *= step.val;
      });

      startEl.textContent = startNum.toString();
      seqEl.innerHTML = sequence.map(s => 
        `<div class="cc-dot" style="background: ${s.hex}; color: ${s.hex}"></div>`
      ).join('');

      // Generate options
      const options = new Set<number>();
      options.add(target);
      while(options.size < 4) {
        const offset = Math.floor(Math.random() * 11) - 5;
        if (offset !== 0) options.add(target + offset);
      }
      
      const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

      optsEl.innerHTML = shuffledOptions.map(opt => 
        `<button class="cc-btn" data-val="${opt}">${opt}</button>`
      ).join('');

      const btns = optsEl.querySelectorAll('.cc-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = parseInt((e.target as HTMLElement).getAttribute('data-val') || '0', 10);
          handleAns(val === target);
        });
      });

      t0 = performance.now();
    };

    const handleAns = (isCorrect: boolean) => {
      if (isGameOver) return;
      rounds++;
      if (isCorrect) correct++;
      
      rts.push(performance.now() - t0);
      
      const bg = isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      document.querySelector('.cc-equation')!.setAttribute('style', `background: ${bg}; border-color: ${bg};`);
      
      setTimeout(() => {
        if (!isGameOver) {
          document.querySelector('.cc-equation')!.removeAttribute('style');
          startRound();
        }
      }, 300);
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

export default colorCipherModule;
