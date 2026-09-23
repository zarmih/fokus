import { ExerciseModule, BlockResult } from './contract';

const letterCaseMatchModule: ExerciseModule = {
  manifest: {
    id: 'letter-case-match',
    name: 'Регистр букв',
    domain: 'speed',
    skills: ['processing_speed', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Это одна и та же буква? Игнорируйте регистр. Да (Влево), Нет (Вправо).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .lcm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .lcm-target {
          display: flex;
          gap: 40px;
          font-size: 100px;
          line-height: 1;
          font-weight: bold;
        }
        .lcm-controls {
          display: flex;
          gap: 20px;
        }
        .lcm-btn {
          padding: 20px 40px;
          font-size: 24px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .lcm-btn:active { transform: scale(0.95); }
      </style>
      <div class="lcm-arena">
        <div class="lcm-target">
          <div id="lcm-left"></div>
          <div id="lcm-right"></div>
        </div>
        <div class="lcm-controls">
          <button class="lcm-btn" id="lcm-btn-yes">Влево (Да)</button>
          <button class="lcm-btn" id="lcm-btn-no">Вправо (Нет)</button>
        </div>
      </div>
    `;

    const leftEl = el.querySelector('#lcm-left') as HTMLElement;
    const rightEl = el.querySelector('#lcm-right') as HTMLElement;
    const btnYes = el.querySelector('#lcm-btn-yes') as HTMLElement;
    const btnNo = el.querySelector('#lcm-btn-no') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetMatch = false;

    const letters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const l1 = letters[Math.floor(Math.random() * letters.length)];
      targetMatch = Math.random() > 0.5;
      
      let l2 = l1;
      if (!targetMatch) {
        let other;
        do {
          other = letters[Math.floor(Math.random() * letters.length)];
        } while (other === l1);
        l2 = other;
      }
      
      const isL1Lower = Math.random() > 0.5;
      const isL2Lower = Math.random() > 0.5;

      leftEl.textContent = isL1Lower ? l1.toLowerCase() : l1;
      rightEl.textContent = isL2Lower ? l2.toLowerCase() : l2;

      btnYes.style.borderColor = 'var(--line)';
      btnNo.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (isYes: boolean, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = isYes === targetMatch;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnYes.onclick = () => handleAns(true, btnYes);
    btnNo.onclick = () => handleAns(false, btnNo);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true, btnYes);
      if (e.code === 'ArrowRight') handleAns(false, btnNo);
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

export default letterCaseMatchModule;
