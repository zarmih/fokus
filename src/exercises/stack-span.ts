import { ExerciseModule, BlockResult } from './contract';

const stackSpanModule: ExerciseModule = {
  manifest: {
    id: 'stack-span',
    name: 'Глубина стека',
    domain: 'memory',
    skills: ['working_memory', 'recall'],
    metricModel: 'memory-span',
    instruction: 'Запоминайте элементы, добавляемые в стек. Следите за операциями удаления. Ответьте на вопрос о состоянии стека.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ss-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
        }
        .ss-screen {
          width: 250px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 3px solid var(--line);
          border-radius: 16px;
          font-size: 40px;
          font-weight: bold;
          text-align: center;
        }
        .ss-controls {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .ss-controls.active {
          opacity: 1;
          pointer-events: auto;
        }
        .ss-btn {
          width: 80px;
          height: 80px;
          font-size: 28px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .ss-btn:active { transform: scale(0.95); }
      </style>
      <div class="ss-arena">
        <div class="ss-screen" id="ss-screen">Готов?</div>
        <div class="ss-controls" id="ss-controls"></div>
      </div>
    `;

    const screenEl = el.querySelector('#ss-screen') as HTMLElement;
    const controlsEl = el.querySelector('#ss-controls') as HTMLElement;

    let t0 = 0;
    let targetAns = '';
    let timer: any;

    const symbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      controlsEl.classList.remove('active');
      controlsEl.innerHTML = '';
      
      const numOps = 3 + Math.floor(level / 2);
      let stack: string[] = [];
      let ops: {type: 'push'|'pop', val?: string}[] = [];

      for (let i = 0; i < numOps; i++) {
        // Can only pop if stack has elements and not too often
        const canPop = stack.length > 0 && Math.random() < 0.3 && level > 2;
        if (canPop) {
          ops.push({ type: 'pop' });
          stack.pop();
        } else {
          const val = symbols[Math.floor(Math.random() * symbols.length)];
          ops.push({ type: 'push', val });
          stack.push(val);
        }
      }

      // If stack is empty, push one
      if (stack.length === 0) {
        const val = symbols[Math.floor(Math.random() * symbols.length)];
        ops.push({ type: 'push', val });
        stack.push(val);
      }

      // Max depth to ask
      const maxDepth = stack.length;
      let depth = 1;
      if (level > 4) {
        depth = Math.floor(Math.random() * Math.min(3, maxDepth)) + 1;
      }
      
      targetAns = stack[stack.length - depth];

      // Play sequence
      let step = 0;
      const playStep = () => {
        if (isGameOver) return;
        if (step < ops.length) {
          const op = ops[step];
          if (op.type === 'push') {
            screenEl.innerHTML = `<span style="color: var(--ok)">+ ${op.val}</span>`;
          } else {
            screenEl.innerHTML = `<span style="color: var(--danger)">- СНЯТЬ</span>`;
          }
          step++;
          timer = setTimeout(() => {
            screenEl.innerHTML = '';
            timer = setTimeout(playStep, 200);
          }, 800);
        } else {
          // Ask question
          screenEl.innerHTML = depth === 1 ? 'Что наверху?' : `Что на глубине ${depth}?`;
          setupControls();
        }
      };

      timer = setTimeout(playStep, 1000);
    };

    const setupControls = () => {
      let opts = [targetAns];
      while(opts.length < 4) {
        const fake = symbols[Math.floor(Math.random() * symbols.length)];
        if (!opts.includes(fake)) opts.push(fake);
      }
      opts.sort(() => Math.random() - 0.5);

      controlsEl.innerHTML = opts.map(o => `<button class="ss-btn">${o}</button>`).join('');
      controlsEl.classList.add('active');

      const btns = controlsEl.querySelectorAll('.ss-btn');
      btns.forEach(b => {
        (b as HTMLElement).onclick = () => handleAns(b.textContent || '', b as HTMLElement);
      });
      t0 = performance.now();
    };

    const handleAns = (ans: string, btn: HTMLElement) => {
      if (isGameOver) return;
      controlsEl.classList.remove('active');
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ans === targetAns;
      if (isCorrect) correct++;

      btn.style.borderColor = isCorrect ? 'var(--ok)' : 'var(--danger)';
      btn.style.color = isCorrect ? 'var(--ok)' : 'var(--danger)';

      timer = setTimeout(startRound, 800);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timer);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timer);
    };
  }
};

export default stackSpanModule;
