import { ExerciseModule, BlockResult } from './contract';

const azColorMatchModule: ExerciseModule = {
  manifest: {
    id: 'az-color-match',
    name: 'Цветовое Совпадение AZ',
    domain: 'memory',
    skills: ['working_memory', 'cognitive_flexibility'] as any,
    metricModel: 'speed-accuracy',
    instruction: 'Совпадает ли цвет с предыдущим? Влево - ДА, Вправо - НЕТ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .az-cm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .az-cm-obj {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          transition: background-color 0.2s;
          margin-bottom: 40px;
        }
        .az-cm-controls {
          display: flex;
          gap: 40px;
        }
        .az-cm-btn {
          padding: 15px 30px;
          font-size: 20px;
          font-weight: bold;
          border: 2px solid var(--line);
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: var(--text);
          cursor: pointer;
        }
        .az-cm-btn.yes { border-color: var(--ok); }
        .az-cm-btn.no { border-color: var(--danger); }
      </style>
      <div class="az-cm-arena">
        <div class="az-cm-obj" id="az-cm-obj"></div>
        <div class="az-cm-controls">
          <button class="az-cm-btn yes" id="az-cm-yes">ДА (Влево)</button>
          <button class="az-cm-btn no" id="az-cm-no">НЕТ (Вправо)</button>
        </div>
      </div>
    `;

    const objEl = el.querySelector('#az-cm-obj') as HTMLElement;
    const btnYes = el.querySelector('#az-cm-yes') as HTMLButtonElement;
    const btnNo = el.querySelector('#az-cm-no') as HTMLButtonElement;

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    let prevColor: string | null = null;
    let currentColor = '';
    let t0 = performance.now();
    let phase = 'start';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      let isMatch = Math.random() < 0.4 && prevColor !== null;
      
      if (isMatch && prevColor) {
        currentColor = prevColor;
      } else {
        do {
          currentColor = colors[Math.floor(Math.random() * colors.length)];
        } while (currentColor === prevColor && colors.length > 1);
      }

      objEl.style.backgroundColor = currentColor;
      t0 = performance.now();

      if (prevColor === null) {
        // First round, no previous color. Auto-advance after 1s
        phase = 'wait';
        objEl.textContent = 'Запомни';
        objEl.style.display = 'flex';
        objEl.style.alignItems = 'center';
        objEl.style.justifyContent = 'center';
        objEl.style.color = '#fff';
        objEl.style.fontWeight = 'bold';
        
        setTimeout(() => {
          if (isGameOver) return;
          prevColor = currentColor;
          objEl.textContent = '';
          startRound();
        }, 1500);
      }
    };

    const handleAnswer = (answer: boolean) => {
      if (phase !== 'input') return;
      phase = 'wait';

      rounds++;
      rts.push(performance.now() - t0);

      const isMatch = currentColor === prevColor;
      const isCorrect = answer === isMatch;

      if (isCorrect) correct++;

      objEl.style.transform = 'scale(1.1)';
      objEl.style.boxShadow = isCorrect ? '0 0 20px var(--ok)' : '0 0 20px var(--danger)';

      setTimeout(() => {
        objEl.style.transform = 'scale(1)';
        objEl.style.boxShadow = 'none';
        prevColor = currentColor;
        startRound();
      }, 400);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAnswer(true);
      if (e.key === 'ArrowRight') handleAnswer(false);
    };

    window.addEventListener('keydown', onKey);
    btnYes.onclick = () => handleAnswer(true);
    btnNo.onclick = () => handleAnswer(false);

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

export default azColorMatchModule;
