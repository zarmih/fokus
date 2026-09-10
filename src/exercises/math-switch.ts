import { ExerciseModule, BlockResult } from './contract';

const mathSwitchModule: ExerciseModule = {
  manifest: {
    id: 'math-switch',
    name: 'Смена Знака',
    domain: 'flexibility',
    skills: ['rule_switching', 'mental_calculation'],
    metricModel: 'speed-accuracy',
    instruction: 'СИНЯЯ рамка — СЛОЖИТЕ числа. КРАСНАЯ рамка — ВЫЧТИТЕ второе число из первого.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .msw-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .msw-card {
          font-size: 64px;
          font-weight: 800;
          padding: 32px 64px;
          border-radius: 24px;
          border: 8px solid;
          background: rgba(255,255,255,0.05);
          transition: border-color 0.2s, transform 0.1s;
        }
        .msw-controls {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .msw-btn {
          width: 80px;
          height: 80px;
          font-size: 32px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .msw-btn:active { transform: scale(0.95); }
      </style>
      <div class="msw-arena">
        <div class="msw-card" id="msw-card"></div>
        <div class="msw-controls" id="msw-controls"></div>
      </div>
    `;

    const card = el.querySelector('#msw-card') as HTMLElement;
    const controls = el.querySelector('#msw-controls') as HTMLElement;

    let t0 = performance.now();
    let targetAns = 0;
    let phase = 'input';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const isAdd = Math.random() > 0.5;
      card.style.borderColor = isAdd ? '#3b82f6' : '#ef4444'; // blue for add, red for sub
      
      const maxNum = 10 + level * 5;
      const a = Math.floor(Math.random() * maxNum) + 1;
      const b = Math.floor(Math.random() * maxNum) + 1;
      
      card.textContent = `${a}   ${b}`;
      targetAns = isAdd ? a + b : a - b;

      controls.innerHTML = '';
      
      const options = [targetAns];
      while (options.length < 4) {
        // fake options
        const fake1 = a + b;
        const fake2 = a - b;
        let fake = Math.random() > 0.5 ? fake1 : fake2;
        if (options.includes(fake) || Math.random() > 0.5) {
          fake = targetAns + Math.floor(Math.random() * 10) - 5;
        }
        if (!options.includes(fake)) options.push(fake);
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'msw-btn';
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
            card.style.transform = 'scale(1.05)';
          } else {
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            card.style.transform = 'translateX(10px)';
          }

          setTimeout(() => {
            card.style.transform = 'none';
            startRound();
          }, 800);
        };
        controls.appendChild(btn);
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

export default mathSwitchModule;
