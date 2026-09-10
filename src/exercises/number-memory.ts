import { ExerciseModule, BlockResult } from './contract';

const numberMemoryModule: ExerciseModule = {
  manifest: {
    id: 'number-memory',
    name: 'Числовой Код',
    domain: 'memory',
    skills: ['working_memory', 'visual_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните число. После его исчезновения введите его по памяти.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let rts: number[] = [];

    let span = Math.max(3, Math.floor(level / 2) + 4); // start with 4-5 digits
    let currentNumber = '';
    let t0 = performance.now();
    let phase = 'show';

    el.innerHTML = `
      <style>
        .nm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .nm-display {
          font-size: 64px;
          font-weight: 800;
          letter-spacing: 4px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nm-input-wrapper {
          display: flex;
          gap: 8px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        .nm-input-wrapper.active {
          opacity: 1;
          pointer-events: auto;
        }
        .nm-input {
          font-size: 32px;
          padding: 12px 24px;
          border-radius: 12px;
          border: 2px solid var(--line);
          background: rgba(0,0,0,0.2);
          color: var(--text);
          text-align: center;
          width: 200px;
        }
        .nm-btn {
          padding: 12px 24px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--accent);
          color: white;
          border: none;
          cursor: pointer;
        }
        .nm-btn:active { transform: scale(0.95); }
      </style>
      <div class="nm-arena">
        <div class="nm-display" id="nm-display"></div>
        <form class="nm-input-wrapper" id="nm-form">
          <input type="number" class="nm-input" id="nm-input" autocomplete="off" />
          <button type="submit" class="nm-btn">ОК</button>
        </form>
      </div>
    `;

    const display = el.querySelector('#nm-display') as HTMLElement;
    const form = el.querySelector('#nm-form') as HTMLFormElement;
    const input = el.querySelector('#nm-input') as HTMLInputElement;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'show';
      form.classList.remove('active');
      input.value = '';
      display.style.color = 'var(--text)';
      
      currentNumber = '';
      for (let i = 0; i < span; i++) {
        currentNumber += Math.floor(Math.random() * 10).toString();
      }

      display.textContent = currentNumber;

      const displayTime = Math.max(1000, span * 400 - level * 100);

      setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        display.textContent = '?';
        form.classList.add('active');
        input.focus();
        t0 = performance.now();
      }, displayTime);
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      if (phase !== 'input' || isGameOver) return;
      
      const val = input.value.trim();
      if (!val) return;

      phase = 'result';
      totalRounds++;
      rts.push(performance.now() - t0);

      if (val === currentNumber) {
        correctRounds++;
        display.style.color = 'var(--ok)';
        display.textContent = currentNumber;
        span++;
      } else {
        display.style.color = 'var(--danger)';
        display.innerHTML = `<s>${val}</s> <br/> ${currentNumber}`;
        span = Math.max(3, span - 1);
      }

      form.classList.remove('active');
      setTimeout(startRound, 1500);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    return () => { isGameOver = true; };
  }
};

export default numberMemoryModule;
