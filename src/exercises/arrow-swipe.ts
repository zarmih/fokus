import { ExerciseModule, BlockResult } from './contract';

const arrowSwipeModule: ExerciseModule = {
  manifest: {
    id: 'arrow-swipe',
    name: 'Свайп',
    domain: 'attention',
    skills: ['inhibition', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'ЗЕЛЁНАЯ стрелка — нажимайте туда, куда она указывает. КРАСНАЯ — в ПРОТИВОПОЛОЖНУЮ сторону.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sw-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .sw-target {
          font-size: 100px;
          line-height: 1;
        }
        .sw-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 10px;
        }
        .sw-btn {
          width: 80px;
          height: 80px;
          font-size: 32px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s, border-color 0.2s;
        }
        .sw-btn:active { transform: scale(0.95); }
        .sw-btn.hidden { visibility: hidden; }
      </style>
      <div class="sw-arena">
        <div class="sw-target" id="sw-target"></div>
        <div class="sw-grid">
          <div class="sw-btn hidden"></div>
          <button class="sw-btn" id="sw-btn-up">⬆️</button>
          <div class="sw-btn hidden"></div>
          <button class="sw-btn" id="sw-btn-left">⬅️</button>
          <div class="sw-btn hidden"></div>
          <button class="sw-btn" id="sw-btn-right">➡️</button>
          <div class="sw-btn hidden"></div>
          <button class="sw-btn" id="sw-btn-down">⬇️</button>
          <div class="sw-btn hidden"></div>
        </div>
      </div>
    `;

    const targetEl = el.querySelector('#sw-target') as HTMLElement;
    const btnUp = el.querySelector('#sw-btn-up') as HTMLElement;
    const btnDown = el.querySelector('#sw-btn-down') as HTMLElement;
    const btnLeft = el.querySelector('#sw-btn-left') as HTMLElement;
    const btnRight = el.querySelector('#sw-btn-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetDir = '';

    const dirs = ['up', 'down', 'left', 'right'];
    const arrows: Record<string, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
    const opposites: Record<string, string> = { up: 'down', down: 'up', left: 'right', right: 'left' };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const isRed = Math.random() > 0.5;
      const visualDir = dirs[Math.floor(Math.random() * dirs.length)];
      
      targetDir = isRed ? opposites[visualDir] : visualDir;

      // In CSS, emoji color might not be modifiable easily if it's a raw emoji.
      // We will use standard unicode arrow with text-shadow to colorize, or simpler: use ▲, ▼, ◀, ▶ with color.
      const charMap: Record<string, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
      targetEl.textContent = charMap[visualDir];
      targetEl.style.color = isRed ? 'var(--danger)' : 'var(--ok)';

      [btnUp, btnDown, btnLeft, btnRight].forEach(b => b.style.borderColor = 'var(--line)');

      t0 = performance.now();
    };

    const handleAns = (dir: string, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = dir === targetDir;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnUp.onclick = () => handleAns('up', btnUp);
    btnDown.onclick = () => handleAns('down', btnDown);
    btnLeft.onclick = () => handleAns('left', btnLeft);
    btnRight.onclick = () => handleAns('right', btnRight);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') handleAns('up', btnUp);
      if (e.code === 'ArrowDown') handleAns('down', btnDown);
      if (e.code === 'ArrowLeft') handleAns('left', btnLeft);
      if (e.code === 'ArrowRight') handleAns('right', btnRight);
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

export default arrowSwipeModule;
