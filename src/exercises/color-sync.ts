import { ExerciseModule, BlockResult } from './contract';

const colorSyncModule: ExerciseModule = {
  manifest: {
    id: 'color-sync',
    name: 'Синхронизация',
    domain: 'attention',
    skills: ['inhibition', 'reaction_speed'],
    metricModel: 'timing-precision',
    instruction: 'Нажмите пробел или тапните по экрану, когда цвет внутреннего круга совпадёт с внешним.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // level scaling
    const cycleMs = level > 5 ? 300 : (level > 2 ? 450 : 600);
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316'];

    el.innerHTML = `
      <style>
        .cs-arena {
          display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; outline: none;
          cursor: pointer;
        }
        .cs-target-circle {
          width: 200px; height: 200px; border-radius: 50%;
          border: 16px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          position: relative; transition: border-color 0.2s;
        }
        .cs-inner-circle {
          width: 120px; height: 120px; border-radius: 50%;
          background: transparent; transition: background-color 0.1s;
        }
        .cs-msg {
          position: absolute; font-size: 24px; font-weight: bold; opacity: 0; transition: opacity 0.2s;
        }
        .cs-msg.show {
          opacity: 1;
        }
        .cs-msg.ok { color: var(--ok); }
        .cs-msg.err { color: var(--danger); }
      </style>
      <div class="cs-arena" id="cs-arena" tabindex="0">
        <div class="cs-target-circle" id="cs-outer">
          <div class="cs-inner-circle" id="cs-inner"></div>
          <div class="cs-msg" id="cs-msg"></div>
        </div>
      </div>
    `;

    const arena = el.querySelector('#cs-arena') as HTMLElement;
    const outer = el.querySelector('#cs-outer') as HTMLElement;
    const inner = el.querySelector('#cs-inner') as HTMLElement;
    const msg = el.querySelector('#cs-msg') as HTMLElement;

    let targetColor = '';
    let currentColor = '';
    let cycleTimer: any = null;
    let locked = true;
    let t0 = performance.now();
    let currentOptions: string[] = [];
    let cycleIndex = 0;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      locked = false;
      msg.className = 'cs-msg';
      msg.textContent = '';
      
      // select target
      targetColor = colors[Math.floor(Math.random() * colors.length)];
      outer.style.borderColor = targetColor;

      // prepare distractors
      currentOptions = colors.filter(c => c !== targetColor);
      // shuffle distractors
      currentOptions.sort(() => Math.random() - 0.5);
      
      // insert target into options at a random position (not first)
      const targetPos = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      currentOptions.splice(targetPos, 0, targetColor);

      cycleIndex = 0;
      t0 = performance.now();
      
      scheduleNextCycle();
      arena.focus();
    };

    const scheduleNextCycle = () => {
      if (isGameOver || locked) return;
      currentColor = currentOptions[cycleIndex % currentOptions.length];
      inner.style.backgroundColor = currentColor;
      
      cycleIndex++;
      cycleTimer = setTimeout(scheduleNextCycle, cycleMs);
    };

    const handleAction = (e?: Event) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (locked || isGameOver) return;
      locked = true;
      clearTimeout(cycleTimer);
      rounds++;
      
      const isMatch = currentColor === targetColor;
      
      // Calculate RT: difference between when the color appeared and when clicked.
      // But we just measure block RT standardly or total time. Let's just use total time from round start.
      rts.push(performance.now() - t0);

      msg.className = 'cs-msg show ' + (isMatch ? 'ok' : 'err');
      msg.textContent = isMatch ? '✓' : '✗';
      
      if (isMatch) correct++;

      inner.style.backgroundColor = 'transparent';

      setTimeout(startRound, isMatch ? 500 : 1000);
    };

    arena.addEventListener('mousedown', handleAction);
    arena.addEventListener('touchstart', handleAction, { passive: false });
    
    const keydownHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') handleAction(e);
    };
    arena.addEventListener('keydown', keydownHandler);

    // Initial delay
    setTimeout(startRound, 500);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(cycleTimer);
      arena.removeEventListener('mousedown', handleAction);
      arena.removeEventListener('touchstart', handleAction);
      arena.removeEventListener('keydown', keydownHandler);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(cycleTimer);
    };
  }
};

export default colorSyncModule;
