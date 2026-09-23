import { ExerciseModule, BlockResult } from './contract';

const shapeSidesMatchModule: ExerciseModule = {
  manifest: {
    id: 'shape-sides-match',
    name: 'Стороны фигур',
    domain: 'logic',
    skills: ['pattern_recognition', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Совпадает ли число со количеством углов/сторон фигуры? Да (Влево), Нет (Вправо).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ssm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .ssm-target {
          display: flex;
          align-items: center;
          gap: 30px;
          font-size: 80px;
          line-height: 1;
        }
        .ssm-shape {
          color: var(--primary);
        }
        .ssm-controls {
          display: flex;
          gap: 20px;
        }
        .ssm-btn {
          padding: 20px 40px;
          font-size: 24px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .ssm-btn:active { transform: scale(0.95); }
      </style>
      <div class="ssm-arena">
        <div class="ssm-target">
          <div id="ssm-number"></div>
          <div id="ssm-shape" class="ssm-shape"></div>
        </div>
        <div class="ssm-controls">
          <button class="ssm-btn" id="ssm-btn-yes">Влево (Да)</button>
          <button class="ssm-btn" id="ssm-btn-no">Вправо (Нет)</button>
        </div>
      </div>
    `;

    const numberEl = el.querySelector('#ssm-number') as HTMLElement;
    const shapeEl = el.querySelector('#ssm-shape') as HTMLElement;
    const btnYes = el.querySelector('#ssm-btn-yes') as HTMLElement;
    const btnNo = el.querySelector('#ssm-btn-no') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetMatch = false;

    const shapes = [
      { char: '▲', sides: 3 },
      { char: '◼', sides: 4 },
      { char: '⬟', sides: 5 },
      { char: '⬢', sides: 6 },
    ];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      targetMatch = Math.random() > 0.5;
      
      let num = shape.sides;
      if (!targetMatch) {
        const otherSides = [3, 4, 5, 6].filter(s => s !== shape.sides);
        num = otherSides[Math.floor(Math.random() * otherSides.length)];
      }
      
      numberEl.textContent = num.toString();
      shapeEl.textContent = shape.char;

      btnYes.style.borderColor = 'var(--line)';
      btnNo.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (isYes: boolean, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = isYes === targetMatch;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnYes.onclick = () => handleAns(true, btnYes);
    btnNo.onclick = () => handleAns(false, btnNo);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true, btnYes);
      if (e.code === 'ArrowRight') handleAns(false, btnNo);
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

export default shapeSidesMatchModule;
