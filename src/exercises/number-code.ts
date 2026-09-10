import { ExerciseModule, BlockResult } from './contract';

const numberCodeModule: ExerciseModule = {
  manifest: {
    id: 'number-code',
    name: 'Код',
    domain: 'memory',
    skills: ['working_memory', 'sustained_attention'],
    metricModel: 'speed-accuracy', // actually speed is fine too but mostly accuracy
    instruction: 'Запомните последовательность цифр. Затем введите её на клавиатуре.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .nc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .nc-display {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: 8px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-variant-numeric: tabular-nums;
        }
        .nc-numpad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .nc-numpad.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .nc-btn {
          width: 80px;
          height: 80px;
          font-size: 32px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .nc-btn:active { transform: scale(0.95); }
      </style>
      <div class="nc-arena">
        <div class="nc-display" id="nc-display"></div>
        <div class="nc-numpad" id="nc-numpad"></div>
      </div>
    `;

    const display = el.querySelector('#nc-display') as HTMLElement;
    const numpad = el.querySelector('#nc-numpad') as HTMLElement;

    let t0 = performance.now();
    let phase = 'memorize';
    let targetSequence: string[] = [];
    let inputSequence: string[] = [];

    // Build numpad
    const keys = ['1','2','3','4','5','6','7','8','9','X','0','OK'];
    keys.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'nc-btn';
      btn.textContent = k;
      if (k === 'X') {
        btn.style.color = 'var(--danger)';
        btn.onclick = () => {
          if (phase !== 'input') return;
          inputSequence.pop();
          updateDisplay();
        };
      } else if (k === 'OK') {
        btn.style.color = 'var(--ok)';
        btn.onclick = () => {
          if (phase !== 'input') return;
          submitAns();
        };
      } else {
        btn.onclick = () => {
          if (phase !== 'input') return;
          if (inputSequence.length < targetSequence.length) {
            inputSequence.push(k);
            updateDisplay();
            if (inputSequence.length === targetSequence.length) {
              submitAns();
            }
          }
        };
      }
      numpad.appendChild(btn);
    });

    const updateDisplay = () => {
      display.textContent = inputSequence.join('') + '_'.repeat(targetSequence.length - inputSequence.length);
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      numpad.classList.remove('visible');
      display.style.color = 'var(--text)';
      inputSequence = [];
      targetSequence = [];
      
      const count = Math.min(8, 3 + Math.floor(level / 2));
      for (let i = 0; i < count; i++) {
        targetSequence.push(Math.floor(Math.random() * 10).toString());
      }

      // Flash numbers
      let i = 0;
      const flashNext = () => {
        if (isGameOver) return;
        if (i < targetSequence.length) {
          display.textContent = targetSequence[i];
          setTimeout(() => {
            if (isGameOver) return;
            display.textContent = '';
            setTimeout(() => {
              i++;
              flashNext();
            }, 100);
          }, 600);
        } else {
          // done flashing
          phase = 'input';
          numpad.classList.add('visible');
          updateDisplay();
          t0 = performance.now();
        }
      };

      display.textContent = 'Готов?';
      setTimeout(flashNext, 1000);
    };

    const submitAns = () => {
      phase = 'result';
      rounds++;
      rts.push(performance.now() - t0);
      numpad.classList.remove('visible');

      const isCorrect = inputSequence.join('') === targetSequence.join('');
      display.textContent = targetSequence.join('');
      
      if (isCorrect) {
        correct++;
        display.style.color = 'var(--ok)';
      } else {
        display.style.color = 'var(--danger)';
      }

      setTimeout(startRound, 1500);
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

export default numberCodeModule;
