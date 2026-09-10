import { ExerciseModule, BlockResult } from './contract';

const spatialSpeedModule: ExerciseModule = {
  manifest: {
    id: 'spatial-speed',
    name: 'Радар',
    domain: 'speed',
    skills: ['visual_scanning', 'reaction_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Уничтожайте цели до того, как они исчезнут.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ss-arena {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          border-radius: 16px;
        }
        .ss-target {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          transform: translate(-50%, -50%) scale(0);
          animation: ss-pop 0.2s forwards;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px var(--accent);
        }
        @keyframes ss-pop {
          to { transform: translate(-50%, -50%) scale(1); }
        }
        .ss-target:active { transform: translate(-50%, -50%) scale(0.8) !important; }
      </style>
      <div class="ss-arena" id="ss-arena"></div>
    `;

    const arena = el.querySelector('#ss-arena') as HTMLElement;
    let timeoutId: any;

    const spawnObj = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      const obj = document.createElement('div');
      obj.className = 'ss-target';
      
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 80;
      obj.style.left = `${x}%`;
      obj.style.top = `${y}%`;

      const t0 = performance.now();
      let clicked = false;

      obj.onmousedown = () => {
        if (isGameOver || clicked) return;
        clicked = true;
        rounds++;
        correct++;
        rts.push(performance.now() - t0);
        
        obj.style.background = 'var(--ok)';
        obj.style.boxShadow = 'none';
        obj.style.opacity = '0';
        obj.style.transition = 'opacity 0.2s';
        setTimeout(() => obj.remove(), 200);
      };

      arena.appendChild(obj);

      const lifetime = Math.max(600, 1500 - level * 100);
      
      setTimeout(() => {
        if (isGameOver) return;
        if (!clicked) {
          rounds++;
          errors++;
          obj.style.background = 'var(--danger)';
          obj.style.boxShadow = 'none';
          obj.style.opacity = '0';
          obj.style.transition = 'opacity 0.3s';
          setTimeout(() => obj.remove(), 300);
        }
      }, lifetime);

      // Multiple targets at once at higher levels
      let nextDelay = Math.max(400, 1200 - level * 120) + Math.random() * 500;
      
      if (level > 4 && Math.random() > 0.7) {
        nextDelay = 100; // rapid double spawn
      }

      timeoutId = setTimeout(spawnObj, nextDelay);
    };

    timeoutId = setTimeout(spawnObj, 1000);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds: correct }); // metric based on correct hits
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default spatialSpeedModule;
