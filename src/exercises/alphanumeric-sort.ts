import { ExerciseModule, BlockResult } from './contract';

const alphanumericSortModule: ExerciseModule = {
  manifest: {
    id: 'alphanumeric-sort',
    name: 'Символика',
    domain: 'flexibility',
    skills: ['rule_switching', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте падающие символы. Если это БУКВА — жмите ВЛЕВО. Если ЧИСЛО — ВПРАВО.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .as-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .as-display {
          font-size: 100px;
          font-weight: 800;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border-radius: 32px;
          border: 4px solid var(--line);
          transition: transform 0.1s;
        }
        .as-controls {
          display: flex;
          gap: 60px;
          width: 100%;
          justify-content: center;
        }
        .as-btn {
          width: 140px;
          height: 80px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .as-btn:active { transform: scale(0.95); }
      </style>
      <div class="as-arena">
        <div class="as-display" id="as-display"></div>
        <div class="as-controls">
          <button class="as-btn" id="as-left">БУКВА</button>
          <button class="as-btn" id="as-right">ЧИСЛО</button>
        </div>
      </div>
    `;

    const display = el.querySelector('#as-display') as HTMLElement;
    const btnLeft = el.querySelector('#as-left') as HTMLElement;
    const btnRight = el.querySelector('#as-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsLetter = false;

    const letters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
    const numbers = '0123456789'.split('');

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      targetIsLetter = Math.random() > 0.5;
      const pool = targetIsLetter ? letters : numbers;
      const char = pool[Math.floor(Math.random() * pool.length)];

      display.textContent = char;
      display.style.borderColor = 'var(--line)';

      // Extra distraction at high levels: colors
      if (level > 4) {
        display.style.color = Math.random() > 0.5 ? '#3b82f6' : '#ef4444';
      } else {
        display.style.color = 'var(--text)';
      }

      t0 = performance.now();
    };

    const handleAns = (ansIsLetter: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ansIsLetter === targetIsLetter;

      if (isCorrect) {
        correct++;
        display.style.borderColor = 'var(--ok)';
        display.style.transform = ansIsLetter ? 'translateX(-40px)' : 'translateX(40px)';
      } else {
        display.style.borderColor = 'var(--danger)';
        display.style.transform = 'translateY(20px)';
      }

      setTimeout(() => {
        display.style.transform = 'none';
        startRound();
      }, 150);
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

export default alphanumericSortModule;
