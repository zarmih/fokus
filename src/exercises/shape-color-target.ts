import { ExerciseModule, BlockResult } from './contract';

const COLORS = [
  { id: 'red', name: 'Красный', hex: '#f44336' },
  { id: 'blue', name: 'Синий', hex: '#2196f3' },
  { id: 'green', name: 'Зеленый', hex: '#4caf50' }
];

const SHAPES = [
  { id: 'circle', name: 'Круг', css: 'border-radius: 50%;' },
  { id: 'square', name: 'Квадрат', css: 'border-radius: 8px;' },
  { id: 'triangle', name: 'Треугольник', css: 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%); background-color: currentColor;' }
];

const shapeColorTargetModule: ExerciseModule = {
  manifest: {
    id: 'shape-color-target',
    name: 'Цветная Фигура',
    domain: 'attention',
    skills: ['selective_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните цель. Если фигура совпадает с целью — жмите «Да» (Влево), иначе «Нет» (Вправо).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sct-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .sct-prompt {
          font-size: 32px;
          font-weight: bold;
          color: var(--text-secondary);
        }
        .sct-shape-container {
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sct-shape {
          width: 120px;
          height: 120px;
          transition: transform 0.2s;
        }
        .sct-controls {
          display: flex;
          gap: 20px;
        }
        .sct-btn {
          padding: 20px 40px;
          font-size: 24px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .sct-btn:active { transform: scale(0.95); }
      </style>
      <div class="sct-arena">
        <div class="sct-prompt" id="sct-prompt"></div>
        <div class="sct-shape-container">
          <div class="sct-shape" id="sct-shape"></div>
        </div>
        <div class="sct-controls">
          <button class="sct-btn" id="sct-yes">Да (Влево)</button>
          <button class="sct-btn" id="sct-no">Нет (Вправо)</button>
        </div>
      </div>
    `;

    const promptEl = el.querySelector('#sct-prompt') as HTMLElement;
    const shapeEl = el.querySelector('#sct-shape') as HTMLElement;
    const btnYes = el.querySelector('#sct-yes') as HTMLElement;
    const btnNo = el.querySelector('#sct-no') as HTMLElement;

    let targetColor = COLORS[0];
    let targetShape = SHAPES[0];
    let currentColor = COLORS[0];
    let currentShape = SHAPES[0];

    let t0 = performance.now();
    let phase = 'input';

    const setTarget = () => {
      targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      promptEl.textContent = `Цель: ${targetColor.name} ${targetShape.name}`;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      // 30% chance to be the exact target, else random
      if (Math.random() < 0.3) {
        currentColor = targetColor;
        currentShape = targetShape;
      } else {
        do {
          currentColor = COLORS[Math.floor(Math.random() * COLORS.length)];
          currentShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        } while (currentColor.id === targetColor.id && currentShape.id === targetShape.id);
      }
      
      shapeEl.style.cssText = `background-color: ${currentColor.hex}; color: ${currentColor.hex}; ${currentShape.css}`;
      shapeEl.style.transform = 'scale(1)';

      btnYes.style.borderColor = 'var(--line)';
      btnNo.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (yes: boolean, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isMatch = currentColor.id === targetColor.id && currentShape.id === targetShape.id;
      const isCorrect = yes === isMatch;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }
      
      shapeEl.style.transform = 'scale(0)';

      setTimeout(() => {
        // change target every 5 rounds
        if (rounds % 5 === 0) {
          setTarget();
        }
        startRound();
      }, 300);
    };

    btnYes.onclick = () => handleAns(true, btnYes);
    btnNo.onclick = () => handleAns(false, btnNo);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true, btnYes);
      if (e.code === 'ArrowRight') handleAns(false, btnNo);
    };
    window.addEventListener('keydown', onKey);

    setTarget();
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

export default shapeColorTargetModule;
