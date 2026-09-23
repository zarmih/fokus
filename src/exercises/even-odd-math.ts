import { ExerciseModule, BlockResult } from './contract';

const evenOddMathModule: ExerciseModule = {
  manifest: {
    id: 'even-odd-math',
    name: 'Чёт-нечет',
    domain: 'logic',
    skills: ['mental_calculation', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Решите выражение. Если результат ЧЁТНЫЙ, нажмите «Чётный» (Влево). Если НЕЧЁТНЫЙ — «Нечётный» (Вправо).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .eom-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .eom-target {
          font-size: 80px;
          line-height: 1;
          font-weight: bold;
        }
        .eom-controls {
          display: flex;
          gap: 20px;
        }
        .eom-btn {
          padding: 20px 40px;
          font-size: 24px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .eom-btn:active { transform: scale(0.95); }
      </style>
      <div class="eom-arena">
        <div class="eom-target" id="eom-target"></div>
        <div class="eom-controls">
          <button class="eom-btn" id="eom-btn-even">Влево (Чётный)</button>
          <button class="eom-btn" id="eom-btn-odd">Вправо (Нечётный)</button>
        </div>
      </div>
    `;

    const targetEl = el.querySelector('#eom-target') as HTMLElement;
    const btnEven = el.querySelector('#eom-btn-even') as HTMLElement;
    const btnOdd = el.querySelector('#eom-btn-odd') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsEven = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const op = Math.random() > 0.5 ? '+' : '-';
      
      let res = op === '+' ? a + b : Math.abs(a - b);
      // to avoid 0 (which is even, but let's keep it simple)
      if (res === 0) res = 2;

      targetIsEven = res % 2 === 0;
      targetEl.textContent = op === '+' ? `${a} + ${b}` : `${Math.max(a, b)} - ${Math.min(a, b)}`;

      btnEven.style.borderColor = 'var(--line)';
      btnOdd.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (isEven: boolean, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = isEven === targetIsEven;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnEven.onclick = () => handleAns(true, btnEven);
    btnOdd.onclick = () => handleAns(false, btnOdd);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true, btnEven);
      if (e.code === 'ArrowRight') handleAns(false, btnOdd);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default evenOddMathModule;
