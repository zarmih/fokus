import { ExerciseModule, BlockResult } from './contract';

const dotRatioModule: ExerciseModule = {
  manifest: {
    id: 'dot-ratio',
    name: 'Глазомер',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Оцените "на глаз", точек какого цвета БОЛЬШЕ (Синих или Красных).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .dr-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .dr-canvas {
          position: relative;
          width: 280px;
          height: 280px;
          background: rgba(255,255,255,0.02);
          border-radius: 50%;
          border: 2px solid var(--line);
          overflow: hidden;
        }
        .dr-dot {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .dr-controls {
          display: flex;
          gap: 40px;
        }
        .dr-btn {
          width: 120px;
          height: 80px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 4px solid;
          cursor: pointer;
        }
        .dr-btn.blue { border-color: #3b82f6; color: #3b82f6; }
        .dr-btn.red { border-color: #ef4444; color: #ef4444; }
        .dr-btn:active { transform: scale(0.95); }
      </style>
      <div class="dr-arena">
        <div class="dr-canvas" id="dr-canvas"></div>
        <div class="dr-controls">
          <button class="dr-btn blue" id="dr-blue">СИНИЕ</button>
          <button class="dr-btn red" id="dr-red">КРАСНЫЕ</button>
        </div>
      </div>
    `;

    const canvas = el.querySelector('#dr-canvas') as HTMLElement;
    const btnBlue = el.querySelector('#dr-blue') as HTMLElement;
    const btnRed = el.querySelector('#dr-red') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetColor = '';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      canvas.innerHTML = '';
      canvas.style.opacity = '1';

      // The higher the level, the closer the ratio
      const totalDots = 30 + level * 5;
      const difficultyFactor = Math.max(0.05, 0.3 - level * 0.02); // difference percentage
      
      const isBlueMore = Math.random() > 0.5;
      targetColor = isBlueMore ? 'blue' : 'red';

      let blueCount = Math.floor(totalDots / 2);
      let redCount = Math.floor(totalDots / 2);
      
      const diff = Math.max(1, Math.floor(totalDots * difficultyFactor));
      if (isBlueMore) {
        blueCount += diff;
        redCount -= diff;
      } else {
        redCount += diff;
        blueCount -= diff;
      }

      const dots = [];
      for (let i = 0; i < blueCount; i++) dots.push('#3b82f6');
      for (let i = 0; i < redCount; i++) dots.push('#ef4444');
      dots.sort(() => Math.random() - 0.5);

      const radius = 130;
      dots.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'dr-dot';
        dot.style.background = color;
        
        // Random position within circle
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const x = 140 + r * Math.cos(angle) - 6;
        const y = 140 + r * Math.sin(angle) - 6;
        
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        
        canvas.appendChild(dot);
      });

      t0 = performance.now();

      // Optionally hide dots after a short time
      const hideTime = Math.max(500, 2000 - level * 150);
      setTimeout(() => {
        if (phase === 'input') {
          canvas.style.opacity = '0';
          canvas.style.transition = 'opacity 0.2s';
        }
      }, hideTime);
    };

    const handleAns = (ans: string) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      canvas.style.opacity = '1'; // show again

      if (ans === targetColor) {
        correct++;
        canvas.style.borderColor = 'var(--ok)';
      } else {
        canvas.style.borderColor = 'var(--danger)';
      }

      setTimeout(() => {
        canvas.style.borderColor = 'var(--line)';
        startRound();
      }, 800);
    };

    btnBlue.onclick = () => handleAns('blue');
    btnRed.onclick = () => handleAns('red');

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns('blue');
      if (e.code === 'ArrowRight') handleAns('red');
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

export default dotRatioModule;
