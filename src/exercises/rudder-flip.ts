import { ExerciseModule, BlockResult } from './contract';

const rudderFlipModule: ExerciseModule = {
  manifest: {
    id: 'rudder-flip',
    name: 'Руль',
    domain: 'flexibility',
    skills: ['task_switching', 'rule_switching'],
    metricModel: 'speed-accuracy',
    instruction: 'СИНИЙ фон — рулите (нажимайте) в сторону стрелки. КРАСНЫЙ фон — рулите в ПРОТИВОПОЛОЖНУЮ сторону.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rudder-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
          transition: background-color 0.2s;
          border-radius: 12px;
          padding: 20px;
        }
        .rudder-target {
          font-size: 100px;
          line-height: 1;
        }
        .rudder-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .rudder-btn {
          width: 100px;
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
        .rudder-btn:active { transform: scale(0.95); }
      </style>
      <div class="rudder-arena" id="rudder-arena">
        <div class="rudder-target" id="rudder-target"></div>
        <div class="rudder-grid">
          <button class="rudder-btn" id="rudder-btn-left">⬅️</button>
          <button class="rudder-btn" id="rudder-btn-right">➡️</button>
        </div>
      </div>
    `;

    const arena = el.querySelector('#rudder-arena') as HTMLElement;
    const targetEl = el.querySelector('#rudder-target') as HTMLElement;
    const btnLeft = el.querySelector('#rudder-btn-left') as HTMLElement;
    const btnRight = el.querySelector('#rudder-btn-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetDir = '';

    const dirs = ['left', 'right'];
    const chars: Record<string, string> = { left: '◀', right: '▶' };
    const opposites: Record<string, string> = { left: 'right', right: 'left' };

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

      targetEl.textContent = chars[visualDir];
      arena.style.backgroundColor = isRed ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 0, 255, 0.15)';

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

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
        btn.style.borderColor = 'var(--ok, green)';
      } else {
        btn.style.borderColor = 'var(--danger, red)';
      }

      setTimeout(startRound, 400);
    };

    btnLeft.onclick = () => handleAns('left', btnLeft);
    btnRight.onclick = () => handleAns('right', btnRight);

    const onKey = (e: KeyboardEvent) => {
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

export default rudderFlipModule;
