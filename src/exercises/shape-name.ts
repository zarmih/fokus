import { ExerciseModule, BlockResult } from './contract';

const shapeNameModule: ExerciseModule = {
  manifest: {
    id: 'shape-name',
    name: 'Ассоциации',
    domain: 'memory',
    skills: ['visual_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните вымышленные названия фигур, а затем выберите правильное имя для указанной фигуры.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sn-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .sn-prompt {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
        }
        .sn-pairs {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .sn-pair {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 2px solid var(--line);
          border-radius: 12px;
          background: var(--surface);
        }
        .sn-shape {
          font-size: 64px;
          line-height: 1;
        }
        .sn-name {
          font-size: 20px;
          font-weight: bold;
          text-transform: capitalize;
        }
        .sn-target {
          font-size: 100px;
          line-height: 1;
        }
        .sn-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          max-width: 600px;
        }
        .sn-btn {
          padding: 16px 32px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .sn-btn:active { transform: scale(0.95); }
      </style>
      <div class="sn-arena">
        <div class="sn-prompt" id="sn-prompt"></div>
        <div class="sn-pairs" id="sn-view"></div>
      </div>
    `;

    const promptEl = el.querySelector('#sn-prompt') as HTMLElement;
    const viewEl = el.querySelector('#sn-view') as HTMLElement;

    const shapesPool = ['⚡️', '🌀', '🌙', '❄️', '🔥', '💧', '☀️', '☁️', '🪐', '🍄'];
    const namesPool = ['Лури', 'Кепт', 'Зома', 'Филь', 'Ракт', 'Нуби', 'Гарш', 'Воль', 'Тико', 'Меза'];

    let phase = 'memorize';
    let t0 = 0;
    let targetShape = '';
    let targetName = '';
    let currentOptions: string[] = [];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      
      const numPairs = level > 5 ? 4 : (level > 2 ? 3 : 2);

      // Shuffle and pick
      let shuffledShapes = [...shapesPool].sort(() => Math.random() - 0.5);
      let shuffledNames = [...namesPool].sort(() => Math.random() - 0.5);

      const activeShapes = shuffledShapes.slice(0, numPairs);
      const activeNames = shuffledNames.slice(0, numPairs);

      // Render pairs
      promptEl.textContent = 'Запомните названия!';
      viewEl.innerHTML = activeShapes.map((s, i) => `
        <div class="sn-pair">
          <div class="sn-shape">${s}</div>
          <div class="sn-name">${activeNames[i]}</div>
        </div>
      `).join('');

      // Pick target
      const targetIdx = Math.floor(Math.random() * numPairs);
      targetShape = activeShapes[targetIdx];
      targetName = activeNames[targetIdx];

      // Options = all active names
      currentOptions = [...activeNames].sort(() => Math.random() - 0.5);

      setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        
        promptEl.textContent = 'Как называлась эта фигура?';
        
        viewEl.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; gap:40px;">
            <div class="sn-target">${targetShape}</div>
            <div class="sn-controls">
              ${currentOptions.map(opt => `<button class="sn-btn" data-name="${opt}">${opt}</button>`).join('')}
            </div>
          </div>
        `;

        const btns = viewEl.querySelectorAll('.sn-btn');
        btns.forEach(b => {
          (b as HTMLElement).onclick = () => handleAns(b.getAttribute('data-name') as string, b as HTMLElement);
        });

        t0 = performance.now();
      }, 3000 + (numPairs * 1000));
    };

    const handleAns = (name: string, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = name === targetName;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
        const correctBtn = viewEl.querySelector(`[data-name="${targetName}"]`) as HTMLElement;
        if (correctBtn) correctBtn.style.borderColor = 'var(--ok)';
      }

      setTimeout(startRound, 1200);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default shapeNameModule;
