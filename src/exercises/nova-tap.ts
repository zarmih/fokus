import { ExerciseModule, BlockResult } from './contract';

const novaTapModule: ExerciseModule = {
  manifest: {
    id: 'nova-tap',
    name: 'Нова',
    domain: 'attention',
    skills: ['selective_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте ПРОБЕЛ (или кликайте по экрану), когда появляется ЗВЕЗДА. Игнорируйте другие фигуры.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .nova-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          cursor: pointer;
        }
        .nova-shape {
          font-size: 120px;
          line-height: 1;
          transition: transform 0.1s;
        }
      </style>
      <div class="nova-arena" id="nova-arena">
        <div class="nova-shape" id="nova-shape"></div>
      </div>
    `;

    const arena = el.querySelector('#nova-arena') as HTMLElement;
    const shapeEl = el.querySelector('#nova-shape') as HTMLElement;

    let t0 = performance.now();
    let phase = 'wait';
    let isTarget = false;
    let timeoutId: any;

    const shapes = ['⭐', '🔵', '🟥', '🔺', '🌙'];

    const nextRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'wait';
      shapeEl.textContent = '';
      
      timeoutId = setTimeout(() => {
        if (isGameOver) return;
        phase = 'show';
        isTarget = Math.random() > 0.5;
        
        if (isTarget) {
          shapeEl.textContent = '⭐';
        } else {
          const others = shapes.filter(s => s !== '⭐');
          shapeEl.textContent = others[Math.floor(Math.random() * others.length)];
        }
        t0 = performance.now();
        
        timeoutId = setTimeout(() => {
          if (phase === 'show') {
            handleTimeout();
          }
        }, Math.max(1000 - level * 50, 400));
      }, Math.random() * 1000 + 500);
    };

    const handleTimeout = () => {
      if (isGameOver) return;
      rounds++;
      if (!isTarget) {
        correct++; // correctly ignored
      } else {
        // missed target
      }
      nextRound();
    };

    const handleAction = () => {
      if (phase !== 'show' || isGameOver) return;
      clearTimeout(timeoutId);
      
      rounds++;
      const rt = performance.now() - t0;
      if (isTarget) {
        rts.push(rt);
        correct++;
        shapeEl.style.color = 'var(--ok, green)';
      } else {
        shapeEl.style.color = 'var(--danger, red)';
      }
      
      phase = 'anim';
      setTimeout(() => {
        shapeEl.style.color = '';
        nextRound();
      }, 300);
    };

    arena.onmousedown = handleAction;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleAction();
      }
    };
    window.addEventListener('keydown', onKey);

    nextRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default novaTapModule;
