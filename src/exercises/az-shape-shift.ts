import { ExerciseModule, BlockResult } from './contract';

const azShapeShiftModule: ExerciseModule = {
  manifest: {
    id: 'az-shape-shift',
    name: 'Смена Формы AZ',
    domain: 'flexibility',
    skills: ['task_switching', 'visual_scanning'] as any,
    metricModel: 'speed-accuracy',
    instruction: 'Если форма изменилась - жми Вверх, если осталась прежней - жми Вниз.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .az-ss-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .az-ss-obj {
          font-size: 120px;
          transition: transform 0.2s, opacity 0.2s;
          margin-bottom: 40px;
          color: var(--text);
        }
        .az-ss-controls {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .az-ss-btn {
          padding: 15px 40px;
          font-size: 20px;
          font-weight: bold;
          border: 2px solid var(--line);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: var(--text);
          cursor: pointer;
        }
        .az-ss-hint {
          font-size: 14px;
          opacity: 0.7;
          margin-top: 5px;
          text-align: center;
        }
      </style>
      <div class="az-ss-arena">
        <div class="az-ss-obj" id="az-ss-obj"></div>
        <div class="az-ss-controls">
          <button class="az-ss-btn" id="az-ss-up">Изменилась (Вверх)</button>
          <button class="az-ss-btn" id="az-ss-down">Осталась прежней (Вниз)</button>
        </div>
      </div>
    `;

    const objEl = el.querySelector('#az-ss-obj') as HTMLElement;
    const btnUp = el.querySelector('#az-ss-up') as HTMLButtonElement;
    const btnDown = el.querySelector('#az-ss-down') as HTMLButtonElement;

    const shapes = ['■', '▲', '●', '★', '♦'];
    let prevShape: string | null = null;
    let currentShape = '';
    let t0 = performance.now();
    let phase = 'start';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      let isSame = Math.random() < 0.5 && prevShape !== null;
      
      if (isSame && prevShape) {
        currentShape = prevShape;
      } else {
        do {
          currentShape = shapes[Math.floor(Math.random() * shapes.length)];
        } while (currentShape === prevShape && shapes.length > 1);
      }

      objEl.textContent = currentShape;
      objEl.style.opacity = '1';
      objEl.style.transform = 'scale(1)';
      t0 = performance.now();

      if (prevShape === null) {
        phase = 'wait';
        objEl.style.color = 'var(--ok)';
        setTimeout(() => {
          if (isGameOver) return;
          prevShape = currentShape;
          objEl.style.color = 'var(--text)';
          startRound();
        }, 1500);
      }
    };

    const handleAnswer = (isChanged: boolean) => {
      if (phase !== 'input') return;
      phase = 'wait';

      rounds++;
      rts.push(performance.now() - t0);

      const actualChanged = currentShape !== prevShape;
      const isCorrect = isChanged === actualChanged;

      if (isCorrect) correct++;

      objEl.style.transform = 'scale(0.8)';
      objEl.style.opacity = '0';
      
      if (!isCorrect) {
        btnUp.style.borderColor = btnDown.style.borderColor = 'var(--danger)';
      }

      setTimeout(() => {
        btnUp.style.borderColor = btnDown.style.borderColor = 'var(--line)';
        prevShape = currentShape;
        startRound();
      }, 300);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handleAnswer(true);
      if (e.key === 'ArrowDown') handleAnswer(false);
    };

    window.addEventListener('keydown', onKey);
    btnUp.onclick = () => handleAnswer(true);
    btnDown.onclick = () => handleAnswer(false);

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

export default azShapeShiftModule;
