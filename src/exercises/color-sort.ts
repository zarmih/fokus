import { ExerciseModule, BlockResult } from './contract';

const colorSortModule: ExerciseModule = {
  manifest: {
    id: 'color-sort',
    name: 'Сортировщик',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуры влево или вправо по текущему ПРАВИЛУ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 20px;
        }
        .cs-rule {
          font-size: 24px;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
        }
        .cs-obj {
          font-size: 80px;
          transition: transform 0.2s, opacity 0.2s;
        }
        .cs-bins {
          display: flex;
          width: 100%;
          justify-content: space-between;
        }
        .cs-bin {
          width: 120px;
          height: 100px;
          border: 4px solid var(--line);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          opacity: 0.7;
          gap: 8px;
        }
        .cs-bin-icon { font-size: 24px; }
      </style>
      <div class="cs-arena">
        <div class="cs-rule" id="cs-rule"></div>
        <div class="cs-obj" id="cs-obj"></div>
        <div class="cs-bins">
          <div class="cs-bin" id="cs-bin-left"></div>
          <div class="cs-bin" id="cs-bin-right"></div>
        </div>
      </div>
    `;

    const ruleEl = el.querySelector('#cs-rule') as HTMLElement;
    const objEl = el.querySelector('#cs-obj') as HTMLElement;
    const binLeft = el.querySelector('#cs-bin-left') as HTMLElement;
    const binRight = el.querySelector('#cs-bin-right') as HTMLElement;

    const shapes = ['⬤', '■'];
    const colors = ['#ef4444', '#3b82f6']; // red, blue
    
    let currentRule: 'color' | 'shape' = 'color';
    let currentShape = '';
    let currentColor = '';
    let targetSide = 'left';
    let t0 = performance.now();
    let phase = 'input';

    const switchProb = 0.2 + level * 0.05;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      if (Math.random() < switchProb) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
      }

      currentShape = shapes[Math.floor(Math.random() * shapes.length)];
      currentColor = colors[Math.floor(Math.random() * colors.length)];

      objEl.textContent = currentShape;
      objEl.style.color = currentColor;
      objEl.style.transform = 'translateY(0) scale(1)';
      objEl.style.opacity = '1';

      ruleEl.textContent = currentRule === 'color' ? 'ПО ЦВЕТУ' : 'ПО ФОРМЕ';
      
      if (currentRule === 'color') {
        binLeft.innerHTML = `<span style="color:#ef4444">КРАСНЫЙ</span><span class="cs-bin-icon">←</span>`;
        binRight.innerHTML = `<span style="color:#3b82f6">СИНИЙ</span><span class="cs-bin-icon">→</span>`;
        targetSide = currentColor === '#ef4444' ? 'left' : 'right';
      } else {
        binLeft.innerHTML = `<span>КРУГ</span><span class="cs-bin-icon">←</span>`;
        binRight.innerHTML = `<span>КВАДРАТ</span><span class="cs-bin-icon">→</span>`;
        targetSide = currentShape === '⬤' ? 'left' : 'right';
      }

      t0 = performance.now();
    };

    const handleSort = (side: string) => {
      if (phase !== 'input') return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = side === targetSide;
      if (isCorrect) correct++;

      objEl.style.transform = side === 'left' ? 'translate(-100px, 100px) scale(0.5)' : 'translate(100px, 100px) scale(0.5)';
      objEl.style.opacity = '0';
      
      const bin = side === 'left' ? binLeft : binRight;
      bin.style.borderColor = isCorrect ? 'var(--ok)' : 'var(--danger)';
      
      setTimeout(() => {
        bin.style.borderColor = 'var(--line)';
        startRound();
      }, 400);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleSort('left');
      if (e.key === 'ArrowRight') handleSort('right');
    };
    window.addEventListener('keydown', onKey);
    binLeft.onclick = () => handleSort('left');
    binRight.onclick = () => handleSort('right');

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

export default colorSortModule;
