import { ExerciseModule, BlockResult } from './contract';

const focusCircleModule: ExerciseModule = {
  manifest: {
    id: 'focus-circle',
    name: 'Снайпер',
    domain: 'attention',
    skills: ['selective_attention', 'reaction_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажмите кнопку, когда сужающийся круг точно совпадёт с кольцом-мишенью.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .fc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          position: relative;
        }
        .fc-target {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid var(--line);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fc-ring {
          position: absolute;
          border-radius: 50%;
          border: 4px solid var(--accent);
          pointer-events: none;
        }
        .fc-btn {
          padding: 16px 32px;
          font-size: 24px;
          font-weight: 600;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          user-select: none;
        }
        .fc-btn:active { transform: scale(0.95); }
      </style>
      <div class="fc-arena">
        <div class="fc-target" id="fc-target">
          <div class="fc-ring" id="fc-ring"></div>
        </div>
        <button class="fc-btn" id="fc-btn">СЕЙЧАС!</button>
      </div>
    `;

    const ring = el.querySelector('#fc-ring') as HTMLElement;
    const btn = el.querySelector('#fc-btn') as HTMLElement;
    
    let raf: number;
    let t0 = performance.now();
    let currentSize = 300;
    const targetSize = 120;
    let speed = 2 + level * 0.5;
    let phase = 'wait';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'wait';
      currentSize = 300 + Math.random() * 100;
      speed = 2 + level * 0.5 + Math.random();
      ring.style.width = `${currentSize}px`;
      ring.style.height = `${currentSize}px`;
      ring.style.borderColor = 'var(--accent)';
      
      setTimeout(() => {
        if (isGameOver) return;
        phase = 'shrink';
        t0 = performance.now();
        tick();
      }, 500 + Math.random() * 1000);
    };

    const tick = () => {
      if (isGameOver || phase !== 'shrink') return;
      
      currentSize -= speed;
      ring.style.width = `${currentSize}px`;
      ring.style.height = `${currentSize}px`;

      if (currentSize < targetSize - 40) {
        // missed completely
        handleHit(false);
        return;
      }
      
      raf = requestAnimationFrame(tick);
    };

    const handleHit = (clicked: boolean) => {
      if (phase !== 'shrink') return;
      phase = 'result';
      cancelAnimationFrame(raf);
      rounds++;

      let errorMargin = Math.abs(currentSize - targetSize);
      
      if (clicked && errorMargin < 20) {
        correct++;
        ring.style.borderColor = 'var(--ok)';
      } else {
        ring.style.borderColor = 'var(--danger)';
      }
      
      rts.push(performance.now() - t0);
      
      setTimeout(startRound, 800);
    };

    btn.onclick = () => {
      if (phase === 'shrink') handleHit(true);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'shrink') handleHit(true);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default focusCircleModule;
