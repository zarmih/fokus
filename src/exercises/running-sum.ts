import { ExerciseModule, BlockResult } from './contract';

const runningSumModule: ExerciseModule = {
  manifest: {
    id: 'running-sum',
    name: 'Бегущая сумма',
    domain: 'memory',
    skills: ['working_memory', 'mental_calculation'],
    metricModel: 'speed-accuracy',
    instruction: 'Складывайте текущее число на экране с ПРЕДЫДУЩИМ числом. Первое число нужно просто запомнить.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // level scaling
    const maxNum = level > 5 ? 9 : (level > 2 ? 6 : 4);
    
    el.innerHTML = `
      <style>
        .rs-arena {
          display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; outline: none;
        }
        .rs-display {
          font-size: 80px; font-weight: bold; color: var(--text);
          min-height: 100px; display: flex; align-items: center; justify-content: center;
        }
        .rs-controls {
          display: flex; gap: 16px;
        }
        .rs-btn {
          width: 80px; height: 80px; font-size: 32px; font-weight: bold;
          background: var(--surface); border: 2px solid var(--line); border-radius: 12px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: transform 0.1s, background 0.15s; user-select: none; color: var(--text);
        }
        .rs-btn:active {
          transform: scale(0.92);
        }
        .rs-btn:disabled {
          cursor: default; opacity: 0.8;
        }
        .rs-message {
          font-size: 18px; color: var(--text-secondary); min-height: 24px;
        }
      </style>
      <div class="rs-arena" id="rs-arena" tabindex="0">
        <div class="rs-message" id="rs-message">Запомните число</div>
        <div class="rs-display" id="rs-display"></div>
        <div class="rs-controls" id="rs-controls" style="visibility: hidden;">
          <button class="rs-btn" id="btn-0"></button>
          <button class="rs-btn" id="btn-1"></button>
          <button class="rs-btn" id="btn-2"></button>
        </div>
      </div>
    `;

    const arena = el.querySelector('#rs-arena') as HTMLElement;
    const display = el.querySelector('#rs-display') as HTMLElement;
    const controls = el.querySelector('#rs-controls') as HTMLElement;
    const message = el.querySelector('#rs-message') as HTMLElement;
    const btns = [
      el.querySelector('#btn-0') as HTMLButtonElement,
      el.querySelector('#btn-1') as HTMLButtonElement,
      el.querySelector('#btn-2') as HTMLButtonElement,
    ];

    let t0 = performance.now();
    let previousNum = -1;
    let currentNum = -1;
    let locked = true;
    let currentOptions: number[] = [];
    let isFirst = true;

    const generateOptions = (correctAnswer: number) => {
      const opts = new Set<number>();
      opts.add(correctAnswer);
      while(opts.size < 3) {
        // answer can be from 2 to 2 * maxNum
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let opt = correctAnswer + delta;
        if (opt === correctAnswer || opt < 2) opt = correctAnswer + Math.floor(Math.random() * 4) + 1;
        opts.add(opt);
      }
      return Array.from(opts).sort((a,b) => a - b);
    };

    const startNext = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      locked = true;
      btns.forEach(b => {
        b.style.background = 'var(--surface)';
        b.style.borderColor = 'var(--line)';
        b.style.color = 'var(--text)';
      });

      if (isFirst) {
        previousNum = Math.floor(Math.random() * maxNum) + 1;
        display.textContent = String(previousNum);
        message.textContent = 'Запомните число';
        controls.style.visibility = 'hidden';
        
        setTimeout(() => {
          if (isGameOver) return;
          isFirst = false;
          startNext();
        }, 1500);
      } else {
        currentNum = Math.floor(Math.random() * maxNum) + 1;
        display.textContent = String(currentNum);
        message.textContent = 'Сложите с предыдущим';
        controls.style.visibility = 'visible';
        
        const sum = previousNum + currentNum;
        currentOptions = generateOptions(sum);
        
        btns.forEach((b, i) => {
          b.textContent = String(currentOptions[i]);
          b.disabled = false;
        });
        
        arena.focus();
        t0 = performance.now();
        locked = false;
      }
    };

    const handleAns = (idx: number) => {
      if (locked || isGameOver) return;
      locked = true;
      rounds++;
      rts.push(performance.now() - t0);

      const sum = previousNum + currentNum;
      const selectedAns = currentOptions[idx];
      const isCorrect = selectedAns === sum;

      if (isCorrect) correct++;

      btns.forEach((b, i) => {
        if (currentOptions[i] === sum) {
          b.style.background = 'var(--ok)';
          b.style.color = '#fff';
        } else if (i === idx && !isCorrect) {
          b.style.background = 'var(--danger)';
          b.style.color = '#fff';
        }
        b.disabled = true;
      });

      // current becomes previous for next round
      previousNum = currentNum;

      setTimeout(() => {
        startNext();
      }, isCorrect ? 400 : 800);
    };

    btns.forEach((b, i) => {
      b.onclick = () => handleAns(i);
    });

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'ArrowLeft') handleAns(0);
      if (e.key === '2' || e.key === 'ArrowDown') handleAns(1);
      if (e.key === '3' || e.key === 'ArrowRight') handleAns(2);
    };
    arena.addEventListener('keydown', keydownHandler);

    startNext();

    const endBlock = () => {
      isGameOver = true;
      arena.removeEventListener('keydown', keydownHandler);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      arena.removeEventListener('keydown', keydownHandler);
    };
  }
};

export default runningSumModule;
