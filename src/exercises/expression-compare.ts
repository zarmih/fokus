import { ExerciseModule, BlockResult } from './contract';

const expressionCompareModule: ExerciseModule = {
  manifest: {
    id: 'expression-compare',
    name: 'Дуэль Чисел',
    domain: 'logic',
    skills: ['mental_calculation', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Сравните два выражения и выберите то, результат которого БОЛЬШЕ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ec-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .ec-title {
          font-size: 24px;
          color: var(--text);
          opacity: 0.8;
        }
        .ec-controls {
          display: flex;
          gap: 40px;
          width: 100%;
          justify-content: center;
        }
        .ec-btn {
          flex: 1;
          max-width: 240px;
          height: 160px;
          font-size: 48px;
          font-weight: bold;
          border-radius: 24px;
          background: rgba(255,255,255,0.05);
          border: 4px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .ec-btn:active { transform: scale(0.95); }
      </style>
      <div class="ec-arena">
        <div class="ec-title">Что больше?</div>
        <div class="ec-controls">
          <button class="ec-btn" id="ec-left"></button>
          <button class="ec-btn" id="ec-right"></button>
        </div>
      </div>
    `;

    const btnLeft = el.querySelector('#ec-left') as HTMLElement;
    const btnRight = el.querySelector('#ec-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let leftIsLarger = false;

    const generateExpr = () => {
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b, val, str;
      if (op === '+') {
        a = Math.floor(Math.random() * 20) + 1;
        b = Math.floor(Math.random() * 20) + 1;
        val = a + b;
        str = `${a} + ${b}`;
      } else if (op === '-') {
        a = Math.floor(Math.random() * 30) + 10;
        b = Math.floor(Math.random() * 20) + 1;
        val = a - b;
        str = `${a} - ${b}`;
      } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        val = a * b;
        str = `${a} × ${b}`;
      }
      return { val, str };
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      let exprL = generateExpr();
      let exprR = generateExpr();
      while (exprL.val === exprR.val) {
        exprR = generateExpr();
      }

      leftIsLarger = exprL.val > exprR.val;

      btnLeft.textContent = exprL.str;
      btnRight.textContent = exprR.str;
      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      if (choseLeft === leftIsLarger) {
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

export default expressionCompareModule;
