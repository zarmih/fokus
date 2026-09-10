import { ExerciseModule, BlockResult } from './contract';

const flankerModule: ExerciseModule = {
  manifest: {
    id: 'flanker',
    name: 'Клин',
    domain: 'attention',
    skills: ['inhibition', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Укажите направление ЦЕНТРАЛЬНОЙ стрелки, игнорируя остальные.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .fl-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .fl-stimulus {
          font-size: 80px;
          font-weight: 800;
          letter-spacing: 12px;
          color: var(--text);
          display: flex;
        }
        .fl-target {
          color: var(--accent);
        }
        .fl-controls {
          display: flex;
          gap: 40px;
        }
        .fl-btn {
          width: 120px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .fl-btn:active { transform: scale(0.95); }
      </style>
      <div class="fl-arena">
        <div class="fl-stimulus" id="fl-stimulus"></div>
        <div class="fl-controls">
          <button class="fl-btn" id="fl-left">⬅️</button>
          <button class="fl-btn" id="fl-right">➡️</button>
        </div>
      </div>
    `;

    const stimEl = el.querySelector('#fl-stimulus') as HTMLElement;
    const btnLeft = el.querySelector('#fl-left') as HTMLElement;
    const btnRight = el.querySelector('#fl-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsLeft = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      targetIsLeft = Math.random() > 0.5;
      const isCongruent = Math.random() > 0.4; // 40% incongruent, 60% congruent

      const flankerIsLeft = isCongruent ? targetIsLeft : !targetIsLeft;

      const tChar = targetIsLeft ? '◀' : '▶';
      const fChar = flankerIsLeft ? '◀' : '▶';

      stimEl.innerHTML = `
        <span>${fChar}${fChar}</span>
        <span class="fl-target">${tChar}</span>
        <span>${fChar}${fChar}</span>
      `;

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (ansIsLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ansIsLeft === targetIsLeft;

      if (isCorrect) {
        correct++;
        if (ansIsLeft) btnLeft.style.borderColor = 'var(--ok)';
        else btnRight.style.borderColor = 'var(--ok)';
      } else {
        if (ansIsLeft) btnLeft.style.borderColor = 'var(--danger)';
        else btnRight.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnLeft.onclick = () => handleAns(true);
    btnRight.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 800;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default flankerModule;
