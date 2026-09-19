import { ExerciseModule, BlockResult } from './contract';

const timeEstimationModule: ExerciseModule = {
  manifest: {
    id: 'time-estimation',
    name: 'Оценка времени',
    domain: 'speed',
    skills: ['sustained_attention', 'processing_speed'],
    metricModel: 'timing-precision',
    instruction: 'Следите за шариком. Нажмите на кнопку ровно в тот момент, когда он должен достичь финиша, скрывшись за стеной.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0; // We'll compute a normalized accuracy per round
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .te-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          user-select: none;
        }
        .te-track {
          position: relative;
          width: 280px;
          height: 40px;
          background: var(--surface, #1e1e1e);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .te-wall {
          position: absolute;
          right: 0;
          top: 0;
          width: 50%;
          height: 100%;
          background: var(--surface-3, #444);
          z-index: 2;
          border-left: 2px solid var(--line, #555);
        }
        .te-ball {
          position: absolute;
          left: 0;
          top: 8px;
          width: 24px;
          height: 24px;
          background: var(--primary, #2196f3);
          border-radius: 50%;
          z-index: 1;
        }
        .te-btn {
          padding: 16px 32px;
          font-size: 16px;
          background: var(--primary, #2196f3);
          color: white;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s;
        }
        .te-btn:active {
          transform: scale(0.95);
        }
        .te-btn:disabled {
          background: var(--text-dim, #888);
          cursor: default;
        }
      </style>
      <div class="te-arena">
        <div class="te-track">
          <div class="te-wall"></div>
          <div class="te-ball" id="te-ball"></div>
        </div>
        <button class="te-btn" id="te-btn">Финиш!</button>
      </div>
    `;

    const ball = el.querySelector('#te-ball') as HTMLElement;
    const btn = el.querySelector('#te-btn') as HTMLButtonElement;

    let t0 = 0;
    let durationMs = 2000;
    let animFrame = 0;
    let roundActive = false;
    let currentPhase = 'idle';

    const animate = () => {
      if (isGameOver || !roundActive) return;
      
      const elapsed = performance.now() - t0;
      let progress = elapsed / durationMs;
      
      if (progress > 1.2) {
        // Missed completely (waited too long)
        handleAns(true);
        return;
      }

      // Max x is track width (280) - ball width (24) = 256
      const currentX = progress * 256;
      ball.style.transform = `translateX(${currentX}px)`;
      
      animFrame = requestAnimationFrame(animate);
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      btn.disabled = false;
      btn.style.background = 'var(--primary, #2196f3)';
      ball.style.transform = 'translateX(0px)';
      
      // Speed variation based on level
      // Level 1: 2000ms. Higher levels can be faster or much slower.
      const minDuration = Math.max(800, 2000 - level * 100);
      const maxDuration = 3000 + level * 50;
      durationMs = minDuration + Math.random() * (maxDuration - minDuration);
      
      roundActive = true;
      currentPhase = 'moving';
      t0 = performance.now();
      animFrame = requestAnimationFrame(animate);
    };

    const handleAns = (missed = false) => {
      if (isGameOver || currentPhase !== 'moving') return;
      roundActive = false;
      currentPhase = 'feedback';
      cancelAnimationFrame(animFrame);
      btn.disabled = true;

      const elapsed = performance.now() - t0;
      rounds++;
      
      let error = Math.abs(elapsed - durationMs);
      if (missed) error = durationMs * 0.5; // Heavy penalty

      // Tolerance based on level (harder = smaller tolerance)
      const maxTolerance = Math.max(100, 500 - level * 20);
      
      let roundScore = 0;
      if (error < maxTolerance) {
        roundScore = 1 - (error / maxTolerance); // 0 to 1
        btn.style.background = 'var(--ok, #4caf50)';
      } else {
        btn.style.background = 'var(--danger, #f44336)';
      }
      
      correct += roundScore;
      rts.push(elapsed);

      // Reveal ball position
      const finalX = (elapsed / durationMs) * 256;
      ball.style.transform = `translateX(${Math.min(280, finalX)}px)`;
      ball.style.zIndex = '3'; // Bring above wall temporarily

      setTimeout(() => {
        ball.style.zIndex = '1';
        startRound();
      }, 1000);
    };

    btn.onclick = () => handleAns(false);

    // Initial delay before first round
    setTimeout(startRound, 500);

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(animFrame);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      cancelAnimationFrame(animFrame);
    };
  }
};

export default timeEstimationModule;
