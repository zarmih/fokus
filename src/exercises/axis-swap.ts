import { ExerciseModule, BlockResult } from './contract';

const axisSwapModule: ExerciseModule = {
  manifest: {
    id: 'axis-swap',
    name: 'Смена оси',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Правило: ГОРИЗОНТАЛЬ (Влево/Вправо) или ВЕРТИКАЛЬ (Вверх/Вниз). Укажите положение точки относительно центра.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .as-arena {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; gap: 30px; user-select: none;
        }
        .as-rule {
          font-size: 32px; font-weight: bold; color: var(--accent);
          padding: 8px 16px; border: 2px solid var(--accent); border-radius: 8px;
        }
        .as-grid {
          position: relative; width: 200px; height: 200px;
          border: 2px dashed var(--line); border-radius: 50%;
        }
        .as-grid::before {
          content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: var(--line);
        }
        .as-grid::after {
          content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--line);
        }
        .as-dot {
          position: absolute; width: 30px; height: 30px; background: var(--text);
          border-radius: 50%; margin-top: -15px; margin-left: -15px;
          transition: all 0.1s;
        }
        .as-controls {
          display: grid; grid-template-columns: 60px 60px 60px; grid-template-rows: 60px 60px;
          gap: 10px; align-items: center; justify-items: center;
        }
        .as-btn {
          width: 100%; height: 100%; font-size: 24px; background: var(--surface);
          border: 2px solid var(--line); border-radius: 8px; cursor: pointer; color: var(--text);
        }
        .as-btn:active { transform: scale(0.9); }
        .as-btn-up { grid-column: 2; grid-row: 1; }
        .as-btn-left { grid-column: 1; grid-row: 2; }
        .as-btn-down { grid-column: 2; grid-row: 2; }
        .as-btn-right { grid-column: 3; grid-row: 2; }
      </style>
      <div class="as-arena">
        <div class="as-rule" id="as-rule">ГОРИЗОНТАЛЬ</div>
        <div class="as-grid">
          <div class="as-dot" id="as-dot"></div>
        </div>
        <div class="as-controls">
          <button class="as-btn as-btn-up" id="as-up">↑</button>
          <button class="as-btn as-btn-left" id="as-left">←</button>
          <button class="as-btn as-btn-down" id="as-down">↓</button>
          <button class="as-btn as-btn-right" id="as-right">→</button>
        </div>
      </div>
    `;

    const ruleEl = el.querySelector('#as-rule') as HTMLElement;
    const dotEl = el.querySelector('#as-dot') as HTMLElement;
    
    let currentRule: 'horiz' | 'vert' = 'horiz';
    let currentPos = { x: 1, y: 1 }; // x: 1 (right), -1 (left). y: 1 (bottom), -1 (top)
    let t0 = performance.now();
    let phase = 'input';
    let timeoutId: any;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      // Chance to swap rule
      const swapChance = level > 5 ? 0.4 : 0.2;
      if (Math.random() < swapChance) {
        currentRule = currentRule === 'horiz' ? 'vert' : 'horiz';
      }
      
      ruleEl.textContent = currentRule === 'horiz' ? 'ГОРИЗОНТАЛЬ' : 'ВЕРТИКАЛЬ';
      
      currentPos.x = Math.random() > 0.5 ? 1 : -1;
      currentPos.y = Math.random() > 0.5 ? 1 : -1;
      
      // Calculate CSS pos
      const left = 50 + currentPos.x * 30;
      const top = 50 + currentPos.y * 30;
      dotEl.style.left = left + '%';
      dotEl.style.top = top + '%';
      
      t0 = performance.now();
    };

    const handleAns = (ans: 'up'|'down'|'left'|'right') => {
      if (phase !== 'input' || isGameOver) return;
      
      let isCorrect = false;
      if (currentRule === 'horiz') {
        if (ans === 'left' && currentPos.x === -1) isCorrect = true;
        if (ans === 'right' && currentPos.x === 1) isCorrect = true;
      } else {
        if (ans === 'up' && currentPos.y === -1) isCorrect = true;
        if (ans === 'down' && currentPos.y === 1) isCorrect = true;
      }

      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);
      
      if (isCorrect) {
        correct++;
        dotEl.style.background = 'var(--ok)';
      } else {
        dotEl.style.background = 'var(--danger)';
      }
      
      timeoutId = setTimeout(() => {
        dotEl.style.background = 'var(--text)';
        startRound();
      }, 300);
    };

    el.querySelector('#as-up')!.addEventListener('click', () => handleAns('up'));
    el.querySelector('#as-down')!.addEventListener('click', () => handleAns('down'));
    el.querySelector('#as-left')!.addEventListener('click', () => handleAns('left'));
    el.querySelector('#as-right')!.addEventListener('click', () => handleAns('right'));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handleAns('up');
      if (e.key === 'ArrowDown') handleAns('down');
      if (e.key === 'ArrowLeft') handleAns('left');
      if (e.key === 'ArrowRight') handleAns('right');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default axisSwapModule;
