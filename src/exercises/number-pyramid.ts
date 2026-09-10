import { ExerciseModule, BlockResult } from './contract';

const numberPyramidModule: ExerciseModule = {
  manifest: {
    id: 'number-pyramid',
    name: 'Пирамида',
    domain: 'logic',
    skills: ['logical_reasoning', 'mental_calculation'],
    metricModel: 'logic-correctness',
    instruction: 'Каждый блок равен СУММЕ двух блоков под ним. Найдите число для выделенного блока.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .np-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .np-pyramid {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .np-row {
          display: flex;
          gap: 8px;
        }
        .np-block {
          width: 64px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--line);
          border-radius: 8px;
          font-size: 20px;
          font-weight: 700;
        }
        .np-block.target {
          border-color: var(--accent);
          color: var(--accent);
          background: rgba(59, 130, 246, 0.1);
        }
        .np-controls {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .np-btn {
          width: 64px;
          height: 48px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .np-btn:active { transform: scale(0.95); }
      </style>
      <div class="np-arena">
        <div class="np-pyramid" id="np-pyramid"></div>
        <div class="np-controls" id="np-controls"></div>
      </div>
    `;

    const pyramidEl = el.querySelector('#np-pyramid') as HTMLElement;
    const controls = el.querySelector('#np-controls') as HTMLElement;

    let t0 = performance.now();
    let targetAns = 0;
    let phase = 'input';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const height = level > 5 ? 4 : 3;
      
      // Generate bottom row
      let bottomRow = [];
      for (let i = 0; i < height; i++) {
        bottomRow.push(Math.floor(Math.random() * (5 + level)) + 1);
      }

      // Build pyramid
      let pyramid = [bottomRow];
      for (let r = 1; r < height; r++) {
        let prevRow = pyramid[r - 1];
        let newRow = [];
        for (let i = 0; i < prevRow.length - 1; i++) {
          newRow.push(prevRow[i] + prevRow[i+1]);
        }
        pyramid.push(newRow);
      }

      // Reverse so top is at index 0
      pyramid.reverse();

      // Pick a target block to hide (not bottom row if possible, to make it interesting)
      const hiddenR = Math.floor(Math.random() * (height - 1));
      const hiddenC = Math.floor(Math.random() * pyramid[hiddenR].length);
      
      targetAns = pyramid[hiddenR][hiddenC];

      // Draw pyramid
      pyramidEl.innerHTML = '';
      for (let r = 0; r < height; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'np-row';
        for (let c = 0; c < pyramid[r].length; c++) {
          const block = document.createElement('div');
          block.className = 'np-block';
          if (r === hiddenR && c === hiddenC) {
            block.classList.add('target');
            block.id = 'np-target';
            block.textContent = '?';
          } else {
            block.textContent = pyramid[r][c].toString();
          }
          rowEl.appendChild(block);
        }
        pyramidEl.appendChild(rowEl);
      }

      // Options
      controls.innerHTML = '';
      const options = [targetAns];
      while (options.length < 4) {
        const fake = targetAns + Math.floor(Math.random() * 9) - 4;
        if (fake > 0 && !options.includes(fake)) options.push(fake);
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'np-btn';
        btn.textContent = opt.toString();
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          const targetBlock = document.getElementById('np-target');
          if (targetBlock) targetBlock.textContent = opt.toString();

          if (opt === targetAns) {
            correct++;
            if (targetBlock) targetBlock.style.borderColor = 'var(--ok)';
            if (targetBlock) targetBlock.style.color = 'var(--ok)';
            btn.style.borderColor = 'var(--ok)';
          } else {
            if (targetBlock) targetBlock.style.borderColor = 'var(--danger)';
            if (targetBlock) targetBlock.style.color = 'var(--danger)';
            btn.style.borderColor = 'var(--danger)';
          }

          setTimeout(startRound, 1000);
        };
        controls.appendChild(btn);
      });

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 4000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default numberPyramidModule;
