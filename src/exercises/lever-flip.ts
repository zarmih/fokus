import { ExerciseModule, BlockResult } from './contract';

const leverFlipModule: ExerciseModule = {
  manifest: {
    id: 'lever-flip',
    name: 'Рычаг',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Если индикатор СИНИЙ - жмите стрелку В СТОРОНУ наклона рычага. Если ОРАНЖЕВЫЙ - ПРОТИВОПОЛОЖНУЮ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .lf-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .lf-indicator {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: gray;
        }
        .lf-lever {
          width: 20px;
          height: 120px;
          background: var(--text);
          border-radius: 10px;
          transition: transform 0.2s;
          transform-origin: bottom center;
        }
        .lf-controls {
          display: flex;
          gap: 40px;
        }
        .lf-btn {
          padding: 20px 40px;
          font-size: 24px;
          border-radius: 12px;
          border: 2px solid var(--line);
          background: var(--surface);
          cursor: pointer;
        }
      </style>
      <div class="lf-arena">
        <div class="lf-indicator" id="lf-indicator"></div>
        <div class="lf-lever" id="lf-lever"></div>
        <div class="lf-controls">
          <button class="lf-btn" id="lf-left">◀</button>
          <button class="lf-btn" id="lf-right">▶</button>
        </div>
      </div>
    `;

    const indicator = el.querySelector('#lf-indicator') as HTMLElement;
    const lever = el.querySelector('#lf-lever') as HTMLElement;
    const btnLeft = el.querySelector('#lf-left') as HTMLElement;
    const btnRight = el.querySelector('#lf-right') as HTMLElement;
    
    let isBlue = true;
    let isTiltedLeft = true;
    let t0 = 0;
    let phase = 'wait';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'wait';
      indicator.style.background = 'gray';
      lever.style.transform = 'rotate(0deg)';

      setTimeout(() => {
        if (isGameOver) return;
        isBlue = Math.random() > 0.5;
        isTiltedLeft = Math.random() > 0.5;
        
        indicator.style.background = isBlue ? '#3388ff' : '#ff8833';
        lever.style.transform = isTiltedLeft ? 'rotate(-30deg)' : 'rotate(30deg)';
        
        t0 = performance.now();
        phase = 'play';
      }, 500);
    };

    const handleAnswer = (choseLeft: boolean) => {
      if (phase !== 'play') return;
      phase = 'result';
      
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;

      let correctChoice = isBlue ? isTiltedLeft : !isTiltedLeft;
      
      if (choseLeft === correctChoice) {
        correct++;
        indicator.style.background = 'var(--ok)';
      } else {
        indicator.style.background = 'var(--danger)';
      }
      
      setTimeout(startRound, 500);
    };

    btnLeft.onpointerdown = () => handleAnswer(true);
    btnRight.onpointerdown = () => handleAnswer(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAnswer(true);
      if (e.code === 'ArrowRight') handleAnswer(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default leverFlipModule;
