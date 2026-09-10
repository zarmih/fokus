import { ExerciseModule, BlockResult } from './contract';

const directionMemoryModule: ExerciseModule = {
  manifest: {
    id: 'direction-memory',
    name: 'Стрелки',
    domain: 'memory',
    skills: ['working_memory', 'spatial_memory'],
    metricModel: 'memory-span', // sequence memory
    instruction: 'Запомните последовательность направлений и повторите её.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .dm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .dm-screen {
          font-size: 100px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dm-controls {
          display: grid;
          grid-template-areas:
            ". up ."
            "left down right";
          gap: 12px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        .dm-controls.visible {
          opacity: 1;
          pointer-events: auto;
        }
        .dm-btn {
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
        }
        .dm-btn:active { transform: scale(0.9); }
        #btn-up { grid-area: up; }
        #btn-left { grid-area: left; }
        #btn-down { grid-area: down; }
        #btn-right { grid-area: right; }
        .dm-progress {
          display: flex;
          gap: 8px;
          height: 16px;
        }
        .dm-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }
        .dm-dot.filled { background: var(--accent); }
        .dm-dot.error { background: var(--danger); }
        .dm-dot.ok { background: var(--ok); }
      </style>
      <div class="dm-arena">
        <div class="dm-progress" id="dm-progress"></div>
        <div class="dm-screen" id="dm-screen"></div>
        <div class="dm-controls" id="dm-controls">
          <button class="dm-btn" id="btn-up">⬆️</button>
          <button class="dm-btn" id="btn-left">⬅️</button>
          <button class="dm-btn" id="btn-right">➡️</button>
          <button class="dm-btn" id="btn-down">⬇️</button>
        </div>
      </div>
    `;

    const screen = el.querySelector('#dm-screen') as HTMLElement;
    const controls = el.querySelector('#dm-controls') as HTMLElement;
    const progress = el.querySelector('#dm-progress') as HTMLElement;

    type Dir = 'up' | 'down' | 'left' | 'right';
    const dirs: Dir[] = ['up', 'down', 'left', 'right'];
    const icons: Record<Dir, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };

    let sequence: Dir[] = [];
    let inputIdx = 0;
    let phase = 'play';
    let t0 = 0;

    const renderProgress = () => {
      progress.innerHTML = '';
      for (let i = 0; i < sequence.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'dm-dot';
        if (phase === 'input' && i < inputIdx) {
           dot.classList.add('ok');
        } else if (phase === 'play') {
           // empty
        }
        progress.appendChild(dot);
      }
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'play';
      controls.classList.remove('visible');
      screen.textContent = '';
      inputIdx = 0;

      const seqLen = Math.min(8, 3 + Math.floor(level / 2));
      sequence = [];
      for (let i = 0; i < seqLen; i++) {
        sequence.push(dirs[Math.floor(Math.random() * dirs.length)]);
      }

      renderProgress();

      let step = 0;
      const playStep = () => {
        if (isGameOver) return;
        if (step < sequence.length) {
          screen.textContent = icons[sequence[step]];
          setTimeout(() => {
            if (isGameOver) return;
            screen.textContent = '';
            setTimeout(() => {
              step++;
              playStep();
            }, 200);
          }, 600);
        } else {
          phase = 'input';
          controls.classList.add('visible');
          renderProgress();
          t0 = performance.now();
        }
      };

      setTimeout(playStep, 1000);
    };

    const handleInput = (d: Dir) => {
      if (phase !== 'input' || isGameOver) return;
      
      if (sequence[inputIdx] === d) {
        inputIdx++;
        renderProgress();
        if (inputIdx === sequence.length) {
          phase = 'result';
          rounds++;
          correct++;
          rts.push(performance.now() - t0);
          screen.textContent = '✔️';
          setTimeout(startRound, 1000);
        }
      } else {
        phase = 'result';
        rounds++;
        rts.push(performance.now() - t0);
        const dots = progress.querySelectorAll('.dm-dot');
        if (dots[inputIdx]) dots[inputIdx].classList.add('error');
        screen.textContent = '❌';
        setTimeout(startRound, 1500);
      }
    };

    el.querySelector('#btn-up')?.addEventListener('click', () => handleInput('up'));
    el.querySelector('#btn-down')?.addEventListener('click', () => handleInput('down'));
    el.querySelector('#btn-left')?.addEventListener('click', () => handleInput('left'));
    el.querySelector('#btn-right')?.addEventListener('click', () => handleInput('right'));

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') handleInput('up');
      if (e.code === 'ArrowDown') handleInput('down');
      if (e.code === 'ArrowLeft') handleInput('left');
      if (e.code === 'ArrowRight') handleInput('right');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default directionMemoryModule;
