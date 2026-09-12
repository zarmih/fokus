import { ExerciseModule, BlockResult } from './contract';

const mirrorRealmModule: ExerciseModule = {
  manifest: {
    id: 'mirror-realm',
    name: 'Зеркальное измерение',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility', 'reaction_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Синий фон: атакуйте туда, где появился враг. Фиолетовый фон: атакуйте в ПРОТИВОПОЛОЖНУЮ сторону. Используйте стрелки или кнопки.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mr-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          transition: background-color 0.3s;
          border-radius: 20px;
          padding: 20px;
        }
        .mr-board {
          position: relative;
          width: 300px;
          height: 300px;
        }
        .mr-center {
          position: absolute;
          width: 60px;
          height: 60px;
          background: #fff;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          margin-top: -30px;
          margin-left: -30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          color: #000;
          box-shadow: 0 0 20px rgba(255,255,255,0.5);
        }
        .mr-enemy {
          position: absolute;
          width: 50px;
          height: 50px;
          background: #ff3366;
          border-radius: 12px;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .mr-enemy[data-pos="up"] { top: 10px; left: 125px; }
        .mr-enemy[data-pos="down"] { bottom: 10px; left: 125px; }
        .mr-enemy[data-pos="left"] { top: 125px; left: 10px; }
        .mr-enemy[data-pos="right"] { top: 125px; right: 10px; }
        
        .mr-controls {
          display: grid;
          grid-template-columns: 60px 60px 60px;
          grid-template-rows: 60px 60px 60px;
          gap: 10px;
        }
        .mr-btn {
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          color: var(--text);
          font-size: 24px;
          cursor: pointer;
        }
        .mr-btn:active { transform: scale(0.95); }
        .mr-btn-up { grid-column: 2; grid-row: 1; }
        .mr-btn-left { grid-column: 1; grid-row: 2; }
        .mr-btn-right { grid-column: 3; grid-row: 2; }
        .mr-btn-down { grid-column: 2; grid-row: 3; }
      </style>
      <div class="mr-arena" id="mr-arena">
        <div class="mr-board">
          <div class="mr-center">⚔️</div>
          <div class="mr-enemy" data-pos="up" id="mr-up">👾</div>
          <div class="mr-enemy" data-pos="down" id="mr-down">👾</div>
          <div class="mr-enemy" data-pos="left" id="mr-left">👾</div>
          <div class="mr-enemy" data-pos="right" id="mr-right">👾</div>
        </div>
        <div class="mr-controls">
          <button class="mr-btn mr-btn-up" data-dir="up">↑</button>
          <button class="mr-btn mr-btn-left" data-dir="left">←</button>
          <button class="mr-btn mr-btn-right" data-dir="right">→</button>
          <button class="mr-btn mr-btn-down" data-dir="down">↓</button>
        </div>
      </div>
    `;

    const arena = el.querySelector('#mr-arena') as HTMLElement;
    const enemies = {
      up: el.querySelector('#mr-up') as HTMLElement,
      down: el.querySelector('#mr-down') as HTMLElement,
      left: el.querySelector('#mr-left') as HTMLElement,
      right: el.querySelector('#mr-right') as HTMLElement,
    };
    const btns = el.querySelectorAll('.mr-btn');

    let t0 = performance.now();
    let phase = 'wait'; // wait, input
    let currentMode = 'normal'; // normal, mirror
    let currentPos = 'up';

    const dirs = ['up', 'down', 'left', 'right'];
    
    const opposites: Record<string, string> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    };

    let waitTimeout: any;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'wait';
      Object.values(enemies).forEach(e => e.style.display = 'none');
      
      // Random delay
      const delay = Math.random() * 500 + 400;
      waitTimeout = setTimeout(() => {
        spawnEnemy();
      }, delay);
    };

    const spawnEnemy = () => {
      if (isGameOver) return;
      phase = 'input';
      
      // Decide mode
      currentMode = Math.random() > 0.5 ? 'normal' : 'mirror';
      if (currentMode === 'normal') {
        arena.style.backgroundColor = 'rgba(0, 100, 255, 0.1)'; // Blueish
        arena.style.border = '2px solid #0066ff';
      } else {
        arena.style.backgroundColor = 'rgba(150, 0, 255, 0.1)'; // Purplish
        arena.style.border = '2px solid #9900ff';
      }

      currentPos = dirs[Math.floor(Math.random() * dirs.length)];
      enemies[currentPos as keyof typeof enemies].style.display = 'flex';
      
      t0 = performance.now();
    };

    const handleAns = (dir: string) => {
      if (phase !== 'input' || isGameOver) return;
      clearTimeout(waitTimeout);
      phase = 'wait';
      rounds++;
      rts.push(performance.now() - t0);

      const expected = currentMode === 'normal' ? currentPos : opposites[currentPos];
      
      if (dir === expected) {
        correct++;
        arena.style.boxShadow = 'inset 0 0 50px rgba(0, 255, 0, 0.2)';
      } else {
        arena.style.boxShadow = 'inset 0 0 50px rgba(255, 0, 0, 0.3)';
      }

      Object.values(enemies).forEach(e => e.style.display = 'none');

      setTimeout(() => {
        if (!isGameOver) {
          arena.style.boxShadow = 'none';
          startRound();
        }
      }, 300);
    };

    btns.forEach((b: any) => {
      b.onclick = () => handleAns(b.dataset.dir);
    });

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
      clearTimeout(waitTimeout);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(waitTimeout);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default mirrorRealmModule;
