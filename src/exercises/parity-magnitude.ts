import { ExerciseModule, BlockResult } from './contract';

const parityMagnitudeModule: ExerciseModule = {
  manifest: {
    id: 'parity-magnitude',
    name: 'Магнитуда',
    domain: 'flexibility',
    skills: ['rule_switching', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Если число СИНЕЕ, выберите: Чётное или Нечётное. Если число ОРАНЖЕВОЕ, выберите: Больше 50 или Меньше 50.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .pm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .pm-card {
          font-size: 100px;
          font-weight: 800;
          transition: color 0.2s, transform 0.1s;
        }
        .pm-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .pm-btn {
          width: 140px;
          height: 80px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .pm-btn:active { transform: scale(0.95); }
      </style>
      <div class="pm-arena">
        <div class="pm-card" id="pm-card"></div>
        <div class="pm-controls">
          <button class="pm-btn" id="pm-left"></button>
          <button class="pm-btn" id="pm-right"></button>
        </div>
      </div>
    `;

    const card = el.querySelector('#pm-card') as HTMLElement;
    const btnLeft = el.querySelector('#pm-left') as HTMLElement;
    const btnRight = el.querySelector('#pm-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetLeft = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const isParityRule = Math.random() > 0.5;
      card.style.color = isParityRule ? '#3b82f6' : '#f97316'; // blue or orange
      
      let num;
      do { num = Math.floor(Math.random() * 99) + 1; } while (num === 50);

      card.textContent = num.toString();

      if (isParityRule) {
        btnLeft.textContent = 'Чётное';
        btnRight.textContent = 'Нечётное';
        targetLeft = (num % 2 === 0);
      } else {
        btnLeft.textContent = '> 50';
        btnRight.textContent = '< 50';
        targetLeft = (num > 50);
      }

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      if (choseLeft === targetLeft) {
        correct++;
        if (choseLeft) btnLeft.style.borderColor = 'var(--ok)';
        else btnRight.style.borderColor = 'var(--ok)';
      } else {
        if (choseLeft) btnLeft.style.borderColor = 'var(--danger)';
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
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default parityMagnitudeModule;
