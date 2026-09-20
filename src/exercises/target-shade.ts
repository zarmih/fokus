import { ExerciseModule, BlockResult } from './contract';

const targetShadeModule: ExerciseModule = {
  manifest: {
    id: 'target-shade',
    name: 'Точный оттенок',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Сверху показан целевой цвет. Найдите среди вариантов снизу тот, который совпадает с ним в точности.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ts-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .ts-target-wrapper {
          text-align: center;
        }
        .ts-label {
          font-size: 14px;
          color: var(--text-dim);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .ts-target {
          width: 120px;
          height: 120px;
          border-radius: 20px;
          border: 4px solid var(--line);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .ts-grid {
          display: grid;
          gap: 16px;
        }
        .ts-option {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.1s;
        }
        .ts-option:active { transform: scale(0.95); }
      </style>
      <div class="ts-arena">
        <div class="ts-target-wrapper">
          <div class="ts-label">Цель</div>
          <div class="ts-target" id="ts-target"></div>
        </div>
        <div class="ts-grid" id="ts-grid"></div>
      </div>
    `;

    const targetEl = el.querySelector('#ts-target') as HTMLElement;
    const gridEl = el.querySelector('#ts-grid') as HTMLElement;

    let t0 = performance.now();
    let targetIndex = -1;
    let clickDisabled = false;

    const generateColor = () => {
      const h = Math.floor(Math.random() * 360);
      const s = 50 + Math.floor(Math.random() * 40);
      const l = 40 + Math.floor(Math.random() * 20);
      return { h, s, l };
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      clickDisabled = false;
      const base = generateColor();
      
      // Determine difficulty based on level
      const gridCols = level < 5 ? 2 : (level < 10 ? 3 : 4);
      const gridRows = level < 3 ? 2 : (level < 8 ? 3 : 4);
      const totalOptions = gridCols * gridRows;
      
      gridEl.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
      
      // Calculate delta for distractors (smaller delta = harder)
      const maxDelta = Math.max(5, 20 - level * 1.5);
      
      targetIndex = Math.floor(Math.random() * totalOptions);
      const options = [];
      
      for (let i = 0; i < totalOptions; i++) {
        if (i === targetIndex) {
          options.push(`hsl(${base.h}, ${base.s}%, ${base.l}%)`);
        } else {
          // Add random variation to hue, sat, or lit
          const mode = Math.floor(Math.random() * 3);
          let dh = 0, ds = 0, dl = 0;
          const sign = Math.random() > 0.5 ? 1 : -1;
          const delta = Math.max(3, Math.random() * maxDelta) * sign;
          
          if (mode === 0) dh = delta;
          else if (mode === 1) ds = delta;
          else dl = delta;
          
          options.push(`hsl(${(base.h + dh + 360) % 360}, ${Math.min(100, Math.max(0, base.s + ds))}%, ${Math.min(100, Math.max(0, base.l + dl))}%)`);
        }
      }
      
      targetEl.style.backgroundColor = options[targetIndex];
      
      gridEl.innerHTML = '';
      options.forEach((color, i) => {
        const btn = document.createElement('div');
        btn.className = 'ts-option';
        btn.style.backgroundColor = color;
        btn.onclick = () => handleAns(i, btn);
        gridEl.appendChild(btn);
      });
      
      t0 = performance.now();
    };

    const handleAns = (idx: number, btn: HTMLElement) => {
      if (isGameOver || clickDisabled) return;
      clickDisabled = true;
      rounds++;
      rts.push(performance.now() - t0);

      if (idx === targetIndex) {
        correct++;
        btn.style.border = '4px solid var(--ok)';
        setTimeout(startRound, 300);
      } else {
        btn.style.border = '4px solid var(--danger)';
        const correctBtn = gridEl.children[targetIndex] as HTMLElement;
        if (correctBtn) correctBtn.style.border = '4px solid var(--ok)';
        setTimeout(startRound, 800);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default targetShadeModule;
