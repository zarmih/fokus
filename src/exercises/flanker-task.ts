import { ExerciseModule, BlockResult } from './contract';

const flankerTaskModule: ExerciseModule = {
  manifest: {
    id: 'flanker-task',
    name: 'Стая',
    domain: 'attention',
    skills: ['selective_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Укажите направление ЦЕНТРАЛЬНОЙ птицы (стрелки), игнорируя остальных.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ft-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .ft-flock {
          display: flex;
          gap: 16px;
          font-size: 64px;
          font-weight: bold;
          transition: transform 0.1s;
        }
        .ft-bird {
          color: var(--text);
        }
        .ft-center {
          color: var(--accent); /* slight highlight to help initially, can be removed for harder levels */
        }
        .ft-controls {
          display: flex;
          gap: 24px;
        }
        .ft-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .ft-btn:active { transform: scale(0.9); }
      </style>
      <div class="ft-arena">
        <div class="ft-flock" id="ft-flock"></div>
        <div class="ft-controls">
          <button class="ft-btn" id="ft-left">←</button>
          <button class="ft-btn" id="ft-right">→</button>
        </div>
      </div>
    `;

    const flockEl = el.querySelector('#ft-flock') as HTMLElement;
    const btnLeft = el.querySelector('#ft-left') as HTMLElement;
    const btnRight = el.querySelector('#ft-right') as HTMLElement;

    let targetDir = 'left';
    let t0 = performance.now();
    let phase = 'input';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      const isLeft = Math.random() > 0.5;
      targetDir = isLeft ? 'left' : 'right';
      const targetChar = isLeft ? '←' : '→';

      // congruent (same) or incongruent (opposite)
      const isIncongruent = Math.random() > 0.4 + level * 0.05; // becomes more incongruent at higher levels
      const flankerChar = isIncongruent ? (isLeft ? '→' : '←') : targetChar;

      // number of flankers (2, 4, or 6 total)
      const count = level > 5 ? 3 : (level > 2 ? 2 : 1);
      
      let html = '';
      for (let i = 0; i < count; i++) html += `<span class="ft-bird">${flankerChar}</span>`;
      html += `<span class="ft-bird ft-center">${targetChar}</span>`;
      for (let i = 0; i < count; i++) html += `<span class="ft-bird">${flankerChar}</span>`;

      flockEl.innerHTML = html;
      
      // optionally remove highlight at high levels
      if (level > 4) {
        const center = flockEl.querySelector('.ft-center') as HTMLElement;
        if (center) center.style.color = 'var(--text)';
      }

      t0 = performance.now();
    };

    const handleAns = (dir: string) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      if (dir === targetDir) {
        correct++;
        flockEl.style.transform = 'scale(1.1)';
        flockEl.style.color = 'var(--ok)';
      } else {
        flockEl.style.transform = 'translateX(10px)';
        flockEl.style.color = 'var(--danger)';
      }

      setTimeout(() => {
        flockEl.style.transform = 'none';
        flockEl.style.color = 'var(--text)';
        startRound();
      }, 200);
    };

    btnLeft.onclick = () => handleAns('left');
    btnRight.onclick = () => handleAns('right');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns('left');
      if (e.key === 'ArrowRight') handleAns('right');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default flankerTaskModule;
