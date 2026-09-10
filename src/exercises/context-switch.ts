import { ExerciseModule, BlockResult } from './contract';

const contextSwitchModule: ExerciseModule = {
  manifest: {
    id: 'context-switch',
    name: 'Хамелеон',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Светлый фон: выберите кнопку с ТЕМ ЖЕ ЦВЕТОМ. Тёмный фон: выберите кнопку с ТОЙ ЖЕ ФОРМОЙ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // Use light and dark theme backgrounds
    el.innerHTML = `
      <style>
        .cs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
          border-radius: 24px;
          transition: background-color 0.2s, color 0.2s;
        }
        .cs-arena.light {
          background-color: #f1f5f9;
          color: #0f172a;
        }
        .cs-arena.dark {
          background-color: #0f172a;
          color: #f8fafc;
        }
        .cs-target {
          font-size: 100px;
        }
        .cs-controls {
          display: flex;
          gap: 40px;
        }
        .cs-btn {
          width: 120px;
          height: 120px;
          font-size: 64px;
          border-radius: 24px;
          background: rgba(128,128,128,0.1);
          border: 4px solid transparent;
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cs-btn:active { transform: scale(0.95); }
      </style>
      <div class="cs-arena" id="cs-arena">
        <div class="cs-target" id="cs-target"></div>
        <div class="cs-controls">
          <button class="cs-btn" id="cs-left"></button>
          <button class="cs-btn" id="cs-right"></button>
        </div>
      </div>
    `;

    const arena = el.querySelector('#cs-arena') as HTMLElement;
    const targetEl = el.querySelector('#cs-target') as HTMLElement;
    const btnLeft = el.querySelector('#cs-left') as HTMLElement;
    const btnRight = el.querySelector('#cs-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let isLight = false;
    let targetLeft = false;

    const shapes = ['●', '■', '▲', '★'];
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      isLight = Math.random() > 0.5;
      arena.className = `cs-arena ${isLight ? 'light' : 'dark'}`;

      const tShape = shapes[Math.floor(Math.random() * shapes.length)];
      const tColor = colors[Math.floor(Math.random() * colors.length)];

      targetEl.textContent = tShape;
      targetEl.style.color = tColor;

      // Light -> Match Color. Dark -> Match Shape.
      targetLeft = Math.random() > 0.5;

      let lShape, lColor, rShape, rColor;

      // Distractor logic: Ensure one button matches shape and one matches color
      if (targetLeft) {
        if (isLight) {
          // Left matches Color, Right matches Shape
          lColor = tColor;
          lShape = shapes.find(s => s !== tShape) || shapes[0];
          rShape = tShape;
          rColor = colors.find(c => c !== tColor) || colors[0];
        } else {
          // Left matches Shape, Right matches Color
          lShape = tShape;
          lColor = colors.find(c => c !== tColor) || colors[0];
          rColor = tColor;
          rShape = shapes.find(s => s !== tShape) || shapes[0];
        }
      } else {
        if (isLight) {
          // Right matches Color, Left matches Shape
          rColor = tColor;
          rShape = shapes.find(s => s !== tShape) || shapes[0];
          lShape = tShape;
          lColor = colors.find(c => c !== tColor) || colors[0];
        } else {
          // Right matches Shape, Left matches Color
          rShape = tShape;
          rColor = colors.find(c => c !== tColor) || colors[0];
          lColor = tColor;
          lShape = shapes.find(s => s !== tShape) || shapes[0];
        }
      }

      btnLeft.textContent = lShape;
      btnLeft.style.color = lColor;
      btnLeft.style.borderColor = 'transparent';

      btnRight.textContent = rShape;
      btnRight.style.color = rColor;
      btnRight.style.borderColor = 'transparent';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = choseLeft === targetLeft;

      if (isCorrect) {
        correct++;
        if (choseLeft) btnLeft.style.borderColor = '#10b981';
        else btnRight.style.borderColor = '#10b981';
      } else {
        if (choseLeft) btnLeft.style.borderColor = '#ef4444';
        else btnRight.style.borderColor = '#ef4444';
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
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default contextSwitchModule;
