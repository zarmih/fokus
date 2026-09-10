import { ExerciseModule, BlockResult } from './contract';

const sizeCompareModule: ExerciseModule = {
  manifest: {
    id: 'size-compare',
    name: 'Масштаб',
    domain: 'logic',
    skills: ['logical_reasoning', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Несмотря на размер картинки на экране, выберите животное или объект, который БОЛЬШЕ В РЕАЛЬНОЙ ЖИЗНИ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .sc-controls {
          display: flex;
          gap: 60px;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .sc-btn {
          width: 160px;
          height: 160px;
          border-radius: 24px;
          background: rgba(255,255,255,0.05);
          border: 4px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s, border-color 0.2s;
        }
        .sc-btn:active { transform: scale(0.95); }
      </style>
      <div class="sc-arena">
        <div class="sc-controls">
          <button class="sc-btn" id="sc-left"></button>
          <button class="sc-btn" id="sc-right"></button>
        </div>
      </div>
    `;

    const btnLeft = el.querySelector('#sc-left') as HTMLElement;
    const btnRight = el.querySelector('#sc-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let leftIsLargerReal = false;

    // sorted roughly by real world size, smallest to largest
    const items = [
      '🐜','🕷','🐝','🐞','🦋','🐌','🐛',
      '🐭','🐸','🐹','🐟','🐢','🐍','🦎',
      '🐰','🐱','🐔','🦆','🐧','🦉',
      '🐶','🦊','🐒','🐑','🐷','🐺',
      '🦓','🐆','🐅','🐎','🐮','🐻','🦍',
      '🦒','🦏','🦛','🐘','🐳'
    ];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      // pick two distinct items
      let idx1 = Math.floor(Math.random() * items.length);
      let idx2 = Math.floor(Math.random() * items.length);
      while(Math.abs(idx1 - idx2) < 3) {
        // ensure they are noticeably different in size rank to avoid ambiguity
        idx1 = Math.floor(Math.random() * items.length);
        idx2 = Math.floor(Math.random() * items.length);
      }

      leftIsLargerReal = Math.random() > 0.5;

      const realLargerIdx = Math.max(idx1, idx2);
      const realSmallerIdx = Math.min(idx1, idx2);

      const lIdx = leftIsLargerReal ? realLargerIdx : realSmallerIdx;
      const rIdx = leftIsLargerReal ? realSmallerIdx : realLargerIdx;

      btnLeft.textContent = items[lIdx];
      btnRight.textContent = items[rIdx];

      // Randomize font size to create Stroop-like interference
      const sizes = ['40px', '100px'];
      const lSizeIsLarge = Math.random() > 0.5;
      
      btnLeft.style.fontSize = lSizeIsLarge ? sizes[1] : sizes[0];
      btnRight.style.fontSize = lSizeIsLarge ? sizes[0] : sizes[1];

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = choseLeft === leftIsLargerReal;

      if (isCorrect) {
        correct++;
        if (choseLeft) btnLeft.style.borderColor = 'var(--ok)';
        else btnRight.style.borderColor = 'var(--ok)';
      } else {
        if (choseLeft) btnLeft.style.borderColor = 'var(--danger)';
        else btnRight.style.borderColor = 'var(--danger)';
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

export default sizeCompareModule;
