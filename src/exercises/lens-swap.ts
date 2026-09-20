import { ExerciseModule, BlockResult } from './contract';

const lensSwapModule: ExerciseModule = {
  manifest: {
    id: 'lens-swap',
    name: 'Смена линзы',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуры по текущему правилу (ЦВЕТ или ФОРМА). Внимательно следите за сменой правила!'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // Bins: [Red Circle, Blue Square]
    const bins = [
      { color: '#e74c3c', shape: 'circle', label: 'Красный Круг' },
      { color: '#3498db', shape: 'square', label: 'Синий Квадрат' }
    ];

    // Tokens that conflict: Red Square, Blue Circle
    const tokens = [
      { color: '#e74c3c', shape: 'square' },
      { color: '#3498db', shape: 'circle' }
    ];

    const swapProb = Math.min(0.5, 0.15 + level * 0.05);

    el.innerHTML = `
      <style>
        .ls-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 40px 20px;
          box-sizing: border-box;
        }
        .ls-rule {
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 8px;
          background: var(--surface);
          border: 2px solid var(--text);
          transition: transform 0.2s, color 0.2s, border-color 0.2s;
        }
        .ls-rule.swapped {
          transform: scale(1.2);
          color: var(--accent);
          border-color: var(--accent);
        }
        .ls-token {
          width: 100px;
          height: 100px;
          transition: transform 0.1s;
        }
        .ls-bins {
          display: flex;
          gap: 40px;
          width: 100%;
          justify-content: center;
        }
        .ls-bin {
          width: 140px;
          height: 140px;
          border: 3px solid var(--line);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: var(--surface);
        }
        .ls-bin:active {
          transform: scale(0.95);
        }
        .shape-circle {
          border-radius: 50%;
        }
        .shape-square {
          border-radius: 12px;
        }
      </style>
      <div class="ls-arena">
        <div class="ls-rule" id="ls-rule"></div>
        <div id="ls-token-container"></div>
        <div class="ls-bins">
          <div class="ls-bin" id="bin-0">
            <div style="width:60px; height:60px; background:${bins[0].color};" class="shape-${bins[0].shape}"></div>
          </div>
          <div class="ls-bin" id="bin-1">
            <div style="width:60px; height:60px; background:${bins[1].color};" class="shape-${bins[1].shape}"></div>
          </div>
        </div>
      </div>
    `;

    const ruleEl = el.querySelector('#ls-rule') as HTMLElement;
    const tokenContainer = el.querySelector('#ls-token-container') as HTMLElement;
    const bin0 = el.querySelector('#bin-0') as HTMLElement;
    const bin1 = el.querySelector('#bin-1') as HTMLElement;

    let currentRule: 'color' | 'shape' = 'color';
    let currentToken = tokens[0];
    let t0 = 0;
    let phase = 'input';
    let consecutiveSameRule = 0;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'input';
      
      const oldRule = currentRule;
      // Swap logic
      if (consecutiveSameRule > 3 || (Math.random() < swapProb && consecutiveSameRule > 0)) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
        consecutiveSameRule = 0;
      } else {
        consecutiveSameRule++;
      }

      currentToken = tokens[Math.floor(Math.random() * tokens.length)];

      ruleEl.textContent = currentRule === 'color' ? 'ЦВЕТ' : 'ФОРМА';
      if (oldRule !== currentRule) {
        ruleEl.classList.add('swapped');
        setTimeout(() => ruleEl.classList.remove('swapped'), 400);
      }

      tokenContainer.innerHTML = `<div class="ls-token shape-${currentToken.shape}" style="background:${currentToken.color};"></div>`;
      tokenContainer.style.transform = 'none';
      tokenContainer.style.opacity = '1';

      t0 = performance.now();
    };

    const handleAns = (binIdx: number) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      const rt = performance.now() - t0;
      rts.push(rt);

      let isCorrect = false;
      if (currentRule === 'color' && currentToken.color === bins[binIdx].color) isCorrect = true;
      if (currentRule === 'shape' && currentToken.shape === bins[binIdx].shape) isCorrect = true;

      const tokenEl = tokenContainer.querySelector('.ls-token') as HTMLElement;

      if (isCorrect) {
        correct++;
        const targetBin = binIdx === 0 ? bin0 : bin1;
        const rect1 = tokenEl.getBoundingClientRect();
        const rect2 = targetBin.getBoundingClientRect();
        const dx = rect2.left + rect2.width/2 - (rect1.left + rect1.width/2);
        const dy = rect2.top + rect2.height/2 - (rect1.top + rect1.height/2);
        
        tokenEl.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
        tokenEl.style.opacity = '0';
      } else {
        // Penalty or visual feedback for error
        tokenEl.style.transform = 'translateX(15px)';
        tokenContainer.style.color = 'var(--danger)'; // not really visible on shapes, maybe outline?
        tokenEl.style.boxShadow = '0 0 20px var(--danger)';
      }

      setTimeout(() => {
        startRound();
      }, isCorrect ? 300 : 500);
    };

    bin0.onclick = () => handleAns(0);
    bin1.onclick = () => handleAns(1);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns(0);
      if (e.key === 'ArrowRight') handleAns(1);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return endBlock;
  }
};

export default lensSwapModule;
