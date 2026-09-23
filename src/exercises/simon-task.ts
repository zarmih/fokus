import { ExerciseModule, BlockResult } from './contract';

const simonTaskModule: ExerciseModule = {
  manifest: {
    id: 'simon-task',
    name: 'Эффект Саймона',
    domain: 'attention',
    skills: ['inhibition', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Игнорируйте то, с какой стороны появилась стрелка. Нажимайте ту кнопку (Влево/Вправо), КУДА указывает стрелка.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .st-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          outline: none;
        }
        .st-stimulus-container {
          display: flex;
          width: 100%;
          max-width: 400px;
          justify-content: space-between;
          align-items: center;
          height: 100px;
          padding: 0 40px;
        }
        .st-side {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 64px;
          font-weight: bold;
          color: var(--accent);
          transition: transform 0.1s;
        }
        .st-controls {
          display: flex;
          gap: 40px;
        }
        .st-btn {
          width: 120px;
          height: 80px;
          font-size: 40px;
          background: var(--surface);
          border: 3px solid var(--line);
          border-radius: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          transition: transform 0.1s, border-color 0.1s;
        }
        .st-btn:active { transform: scale(0.9); }
        .st-error {
          position: absolute;
          inset: 0;
          background: rgba(239, 68, 68, 0.2);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        .st-error.show { opacity: 1; }
      </style>
      <div class="st-arena" tabindex="0" id="st-arena">
        <div class="st-error" id="st-error"></div>
        <div class="st-stimulus-container">
          <div class="st-side" id="st-left"></div>
          <div class="st-side" id="st-right"></div>
        </div>
        <div class="st-controls">
          <div class="st-btn" id="btn-left">←</div>
          <div class="st-btn" id="btn-right">→</div>
        </div>
      </div>
    `;

    const arena = el.querySelector('#st-arena') as HTMLElement;
    const leftSide = el.querySelector('#st-left') as HTMLElement;
    const rightSide = el.querySelector('#st-right') as HTMLElement;
    const btnLeft = el.querySelector('#btn-left') as HTMLElement;
    const btnRight = el.querySelector('#btn-right') as HTMLElement;
    const errorFlash = el.querySelector('#st-error') as HTMLElement;

    let t0 = performance.now();
    let clickDisabled = false;
    let correctDirection = '';

    arena.focus();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      clickDisabled = false;
      leftSide.innerHTML = '';
      rightSide.innerHTML = '';
      
      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      // 'left' or 'right'
      const stimulusDirection = Math.random() > 0.5 ? 'left' : 'right';
      const stimulusPosition = Math.random() > 0.5 ? 'left' : 'right';
      
      // Level scaling: 
      // Higher levels can introduce 'UP/DOWN' with a rule, but keeping it simple Simon effect is best.
      // We can just adjust the timeout before stimulus appears for unpredictability.
      
      correctDirection = stimulusDirection;
      const arrowChar = stimulusDirection === 'left' ? '←' : '→';

      setTimeout(() => {
          if (isGameOver) return;
          if (stimulusPosition === 'left') {
              leftSide.innerHTML = arrowChar;
          } else {
              rightSide.innerHTML = arrowChar;
          }
          t0 = performance.now();
      }, Math.random() * 400 + 200);
    };

    const handleAns = (ans: string) => {
      if (clickDisabled || isGameOver || !leftSide.innerHTML && !rightSide.innerHTML) return;
      clickDisabled = true;
      rounds++;
      rts.push(performance.now() - t0);

      const targetBtn = ans === 'left' ? btnLeft : btnRight;

      if (ans === correctDirection) {
        correct++;
        targetBtn.style.borderColor = 'var(--ok)';
        setTimeout(startRound, 250);
      } else {
        targetBtn.style.borderColor = 'var(--danger)';
        errorFlash.classList.add('show');
        setTimeout(() => errorFlash.classList.remove('show'), 200);
        setTimeout(startRound, 600);
      }
    };

    btnLeft.onclick = () => handleAns('left');
    btnRight.onclick = () => handleAns('right');

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns('left');
      if (e.key === 'ArrowRight') handleAns('right');
    };
    arena.addEventListener('keydown', keydownHandler);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 800;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      arena.removeEventListener('keydown', keydownHandler);
    };
  }
};

export default simonTaskModule;
