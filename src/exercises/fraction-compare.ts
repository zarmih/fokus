import { ExerciseModule, BlockResult } from './contract';

const fractionCompareModule: ExerciseModule = {
  manifest: {
    id: 'fraction-compare',
    name: 'Дроби',
    domain: 'logic',
    skills: ['mental_calculation', 'numerical_processing'],
    metricModel: 'speed-accuracy',
    instruction: 'Выберите дробь, значение которой БОЛЬШЕ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .fc-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .fc-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 140px;
          height: 140px;
          background: var(--surface);
          border: 3px solid var(--line);
          border-radius: 20px;
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s, background 0.2s;
          user-select: none;
        }
        .fc-option:active { transform: scale(0.95); }
        .fc-option:hover { border-color: var(--primary); }
        
        .fc-frac {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 36px;
          font-weight: 800;
          line-height: 1.2;
        }
        .fc-num { }
        .fc-den { border-top: 3px solid var(--text); width: 100%; text-align: center; }
      </style>
      <div class="fc-arena" id="fc-arena"></div>
    `;

    const arena = el.querySelector('#fc-arena') as HTMLElement;

    let t0 = performance.now();
    let clickDisabled = false;

    const generateFraction = (maxDen: number) => {
        const d = Math.floor(Math.random() * (maxDen - 2)) + 2; // 2 to maxDen
        const n = Math.floor(Math.random() * (d - 1)) + 1; // 1 to d-1
        return { n, d, val: n / d };
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      clickDisabled = false;
      arena.innerHTML = '';

      let f1, f2;
      
      if (level <= 3) {
        // Same denominators or same numerators
        if (Math.random() > 0.5) {
            const d = Math.floor(Math.random() * 8) + 3; // 3 to 10
            let n1 = Math.floor(Math.random() * (d - 1)) + 1;
            let n2 = Math.floor(Math.random() * (d - 1)) + 1;
            while (n1 === n2) n2 = Math.floor(Math.random() * (d - 1)) + 1;
            f1 = { n: n1, d, val: n1 / d };
            f2 = { n: n2, d, val: n2 / d };
        } else {
            const n = Math.floor(Math.random() * 5) + 1;
            let d1 = n + Math.floor(Math.random() * 5) + 1;
            let d2 = n + Math.floor(Math.random() * 5) + 1;
            while (d1 === d2) d2 = n + Math.floor(Math.random() * 5) + 1;
            f1 = { n, d: d1, val: n / d1 };
            f2 = { n, d: d2, val: n / d2 };
        }
      } else if (level <= 6) {
        // Different, easy common multiples or close values
        const maxDen = 9;
        do {
            f1 = generateFraction(maxDen);
            f2 = generateFraction(maxDen);
        } while (Math.abs(f1.val - f2.val) < 0.05 || f1.val === f2.val);
      } else {
        // Harder, larger denominators
        const maxDen = 15;
        do {
            f1 = generateFraction(maxDen);
            f2 = generateFraction(maxDen);
        } while (Math.abs(f1.val - f2.val) < 0.02 || Math.abs(f1.val - f2.val) > 0.3 || f1.val === f2.val);
      }

      const options = [f1, f2];
      if (Math.random() > 0.5) options.reverse();

      const maxVal = Math.max(f1.val, f2.val);

      options.forEach(f => {
        const btn = document.createElement('div');
        btn.className = 'fc-option';
        btn.innerHTML = `
          <div class="fc-frac">
            <div class="fc-num">${f.n}</div>
            <div class="fc-den">${f.d}</div>
          </div>
        `;
        
        btn.onclick = () => {
          if (clickDisabled || isGameOver) return;
          clickDisabled = true;
          rounds++;
          rts.push(performance.now() - t0);

          if (f.val === maxVal) {
            correct++;
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(16, 185, 129, 0.1)';
            setTimeout(startRound, 300);
          } else {
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.1)';
            setTimeout(startRound, 800);
          }
        };
        arena.appendChild(btn);
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

export default fractionCompareModule;
