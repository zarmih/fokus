import { ExerciseModule, BlockResult } from './contract';

const colorShapeSwitchModule: ExerciseModule = {
  manifest: {
    id: 'color-shape-switch',
    name: 'Цвет-Форма',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Если фон ТЁМНЫЙ — выберите совпадающую ФОРМУ. Если фон СВЕТЛЫЙ — выберите совпадающий ЦВЕТ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cssw-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          border-radius: 24px;
          transition: background 0.2s, color 0.2s;
        }
        .cssw-target {
          font-size: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cssw-controls {
          display: flex;
          gap: 24px;
        }
        .cssw-btn {
          width: 100px;
          height: 100px;
          font-size: 56px;
          border-radius: 24px;
          background: rgba(255,255,255,0.1);
          border: 4px solid transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s;
        }
        .cssw-btn:active { transform: scale(0.9); }
      </style>
      <div class="cssw-arena" id="cssw-arena">
        <div class="cssw-target" id="cssw-target"></div>
        <div class="cssw-controls" id="cssw-controls"></div>
      </div>
    `;

    const arena = el.querySelector('#cssw-arena') as HTMLElement;
    const targetEl = el.querySelector('#cssw-target') as HTMLElement;
    const controls = el.querySelector('#cssw-controls') as HTMLElement;

    let targetAnsIdx = 0;
    let t0 = performance.now();
    let phase = 'input';

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308'];
    const shapes = ['⬤', '■', '▲', '★'];

    const switchProb = 0.3 + level * 0.05;
    let isDarkBg = true;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      if (Math.random() < switchProb) {
        isDarkBg = !isDarkBg;
      }

      arena.style.background = isDarkBg ? '#1e293b' : '#f8fafc'; // slate-800 or slate-50
      
      const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
      const targetColor = colors[Math.floor(Math.random() * colors.length)];

      targetEl.textContent = targetShape;
      targetEl.style.color = targetColor;

      // Generate 2 options. One matches shape, one matches color.
      // If dark bg -> rule is shape, so correct ans is the one with matching shape.
      // If light bg -> rule is color.
      
      let optShapeMatch = { shape: targetShape, color: '' };
      do { optShapeMatch.color = colors[Math.floor(Math.random() * colors.length)]; } while (optShapeMatch.color === targetColor);

      let optColorMatch = { shape: '', color: targetColor };
      do { optColorMatch.shape = shapes[Math.floor(Math.random() * shapes.length)]; } while (optColorMatch.shape === targetShape);

      const isShapeAnsLeft = Math.random() > 0.5;
      
      targetAnsIdx = isDarkBg ? (isShapeAnsLeft ? 0 : 1) : (isShapeAnsLeft ? 1 : 0);

      controls.innerHTML = '';
      
      const renderBtn = (opt: {shape: string, color: string}, idx: number) => {
        const btn = document.createElement('button');
        btn.className = 'cssw-btn';
        btn.textContent = opt.shape;
        btn.style.color = opt.color;
        // Adjust button border color so it's visible on both backgrounds
        btn.style.borderColor = isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
        
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (idx === targetAnsIdx) {
            correct++;
            btn.style.borderColor = '#10b981'; // ok
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
          } else {
            btn.style.borderColor = '#ef4444'; // danger
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
          }

          setTimeout(startRound, 500);
        };
        controls.appendChild(btn);
      };

      if (isShapeAnsLeft) {
        renderBtn(optShapeMatch, 0);
        renderBtn(optColorMatch, 1);
      } else {
        renderBtn(optColorMatch, 0);
        renderBtn(optShapeMatch, 1);
      }

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default colorShapeSwitchModule;
