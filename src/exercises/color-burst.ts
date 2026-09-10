import { ExerciseModule, BlockResult } from './contract';

const colorBurstModule: ExerciseModule = {
  manifest: {
    id: 'color-burst',
    name: 'Вспышка',
    domain: 'speed',
    skills: ['reaction_speed', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Как только появится круг — нажмите на него МАКСИМАЛЬНО БЫСТРО.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cb-arena {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
        }
        .cb-target {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          display: none;
          transform: scale(0);
          transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cb-target.visible {
          display: block;
          transform: scale(1);
        }
        .cb-error-flash {
          position: absolute;
          inset: 0;
          background: var(--danger);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        .cb-error-flash.show {
          opacity: 0.3;
        }
      </style>
      <div class="cb-arena" id="cb-arena">
        <div class="cb-error-flash" id="cb-flash"></div>
        <div class="cb-target" id="cb-target"></div>
      </div>
    `;

    const arena = el.querySelector('#cb-arena') as HTMLElement;
    const target = el.querySelector('#cb-target') as HTMLElement;
    const flash = el.querySelector('#cb-flash') as HTMLElement;

    let t0 = 0;
    let phase = 'wait';
    let timeoutId: any;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'wait';
      target.classList.remove('visible');
      
      const delay = Math.random() * 2000 + 800; // 0.8s to 2.8s
      
      timeoutId = setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        
        // Random position
        const arenaRect = arena.getBoundingClientRect();
        // keep target fully inside arena (target is 100x100)
        const maxX = arenaRect.width - 100;
        const maxY = arenaRect.height - 100;
        
        const safeMaxX = maxX > 0 ? maxX : 200;
        const safeMaxY = maxY > 0 ? maxY : 300;

        const x = Math.floor(Math.random() * safeMaxX);
        const y = Math.floor(Math.random() * safeMaxY);

        target.style.left = `${x}px`;
        target.style.top = `${y}px`;

        // Random color
        const hues = [0, 120, 240, 60, 280, 30];
        const h = hues[Math.floor(Math.random() * hues.length)];
        target.style.background = `hsl(${h}, 80%, 60%)`;

        target.classList.add('visible');
        t0 = performance.now();

      }, delay);
    };

    target.onclick = (e) => {
      e.stopPropagation();
      if (phase !== 'input' || isGameOver) return;
      
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;
      correct++;
      
      target.classList.remove('visible');
      phase = 'wait';
      
      setTimeout(startRound, 300);
    };

    // penalty for misclick
    arena.onclick = () => {
      if (phase === 'wait' && !isGameOver) {
        clearTimeout(timeoutId);
        rounds++;
        rts.push(3000); // penalty
        flash.classList.add('show');
        setTimeout(() => flash.classList.remove('show'), 200);
        setTimeout(startRound, 600);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default colorBurstModule;
