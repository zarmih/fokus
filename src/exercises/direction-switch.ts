import { ExerciseModule, BlockResult } from './contract';

const directionSwitchModule: ExerciseModule = {
  manifest: {
    id: 'direction-switch',
    name: 'Стрелочник',
    domain: 'flexibility',
    skills: ['task_switching', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Если рамка синяя — укажите, КУДА указывает стрелка. Если оранжевая — ГДЕ она находится (слева/справа).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ds-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .ds-frame {
          width: 240px;
          height: 120px;
          border: 6px solid var(--line);
          border-radius: 16px;
          display: flex;
          align-items: center;
          position: relative;
          transition: border-color 0.1s;
        }
        .ds-frame.rule-dir { border-color: #3b82f6; } /* Blue */
        .ds-frame.rule-loc { border-color: #f97316; } /* Orange */
        .ds-arrow {
          font-size: 48px;
          position: absolute;
          transition: none;
        }
        .ds-controls {
          display: flex;
          gap: 20px;
        }
        .ds-btn {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          font-size: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ds-btn:active { transform: scale(0.9); }
      </style>
      <div class="ds-arena">
        <div class="ds-frame" id="ds-frame">
          <div class="ds-arrow" id="ds-arrow"></div>
        </div>
        <div class="ds-controls">
          <button class="ds-btn" id="ds-left">←</button>
          <button class="ds-btn" id="ds-right">→</button>
        </div>
      </div>
    `;

    const frame = el.querySelector('#ds-frame') as HTMLElement;
    const arrow = el.querySelector('#ds-arrow') as HTMLElement;
    let currentAns = '';
    let t0 = performance.now();

    const switchProb = 0.2 + (level * 0.05); // More switching at higher levels

    let rule = Math.random() > 0.5 ? 'dir' : 'loc';

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      if (Math.random() < switchProb) {
        rule = rule === 'dir' ? 'loc' : 'dir';
      }

      frame.className = `ds-frame rule-${rule}`;
      
      const isLeftLoc = Math.random() > 0.5;
      const isLeftDir = Math.random() > 0.5;

      arrow.textContent = isLeftDir ? '←' : '→';
      arrow.style.left = isLeftLoc ? '20px' : 'auto';
      arrow.style.right = !isLeftLoc ? '20px' : 'auto';

      currentAns = rule === 'dir' ? (isLeftDir ? 'left' : 'right') : (isLeftLoc ? 'left' : 'right');

      t0 = performance.now();
    };

    const handleAnswer = (ans: string) => {
      if (isGameOver) return;
      rounds++;
      if (ans === currentAns) {
        correct++;
        frame.style.background = 'rgba(16, 185, 129, 0.1)';
      } else {
        errors++;
        frame.style.background = 'rgba(239, 68, 68, 0.1)';
      }
      setTimeout(() => frame.style.background = 'transparent', 150);
      rts.push(performance.now() - t0);
      startRound();
    };

    el.querySelector('#ds-left')?.addEventListener('click', () => handleAnswer('left'));
    el.querySelector('#ds-right')?.addEventListener('click', () => handleAnswer('right'));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAnswer('left');
      if (e.key === 'ArrowRight') handleAnswer('right');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default directionSwitchModule;
