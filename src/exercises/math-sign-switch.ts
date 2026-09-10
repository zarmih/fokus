import { ExerciseModule, BlockResult } from './contract';

const mathSignSwitchModule: ExerciseModule = {
  manifest: {
    id: 'math-sign-switch',
    name: 'Знак Числа',
    domain: 'flexibility',
    skills: ['rule_switching', 'mental_calculation'],
    metricModel: 'speed-accuracy',
    instruction: 'Если фон СИНИЙ — СЛОЖИТЕ числа. Если фон ОРАНЖЕВЫЙ — ВЫЧТИТЕ нижнее из верхнего.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mss-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
          border-radius: 24px;
          transition: background-color 0.2s;
        }
        .mss-arena.add {
          background-color: rgba(59, 130, 246, 0.2); /* blue */
        }
        .mss-arena.sub {
          background-color: rgba(249, 115, 22, 0.2); /* orange */
        }
        .mss-problem {
          font-size: 80px;
          font-weight: 800;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .mss-controls {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .mss-btn {
          width: 140px;
          height: 80px;
          font-size: 32px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .mss-btn:active { transform: scale(0.95); }
      </style>
      <div class="mss-arena" id="mss-arena">
        <div class="mss-problem" id="mss-problem"></div>
        <div class="mss-controls">
          <button class="mss-btn" id="mss-left"></button>
          <button class="mss-btn" id="mss-right"></button>
        </div>
      </div>
    `;

    const arena = el.querySelector('#mss-arena') as HTMLElement;
    const problem = el.querySelector('#mss-problem') as HTMLElement;
    const btnLeft = el.querySelector('#mss-left') as HTMLElement;
    const btnRight = el.querySelector('#mss-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetLeft = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const isAdd = Math.random() > 0.5;
      arena.className = `mss-arena ${isAdd ? 'add' : 'sub'}`;

      const maxNum = level > 4 ? 30 : 15;
      const a = Math.floor(Math.random() * maxNum) + 5;
      const b = Math.floor(Math.random() * maxNum) + 5;

      problem.innerHTML = `<div>${a}</div><div>${b}</div>`;

      const correctAns = isAdd ? (a + b) : (a - b);
      // distractor is the opposite operation
      const wrongAns = isAdd ? (a - b) : (a + b);

      targetLeft = Math.random() > 0.5;

      btnLeft.textContent = (targetLeft ? correctAns : wrongAns).toString();
      btnRight.textContent = (targetLeft ? wrongAns : correctAns).toString();

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      if (choseLeft === targetLeft) {
        correct++;
        if (choseLeft) btnLeft.style.borderColor = 'var(--ok)';
        else btnRight.style.borderColor = 'var(--ok)';
      } else {
        if (choseLeft) btnLeft.style.borderColor = 'var(--danger)';
        else btnRight.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnLeft.onclick = () => handleAns(true);
    btnRight.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default mathSignSwitchModule;
