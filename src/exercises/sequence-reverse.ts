import { ExerciseModule, BlockResult } from './contract';

const sequenceReverseModule: ExerciseModule = {
  manifest: {
    id: 'sequence-reverse',
    name: 'Реверс',
    domain: 'memory',
    skills: ['working_memory', 'spatial_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните последовательность и повторите её В ОБРАТНОМ ПОРЯДКЕ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let sequence: number[] = [];
    let userStep = 0;
    let span = Math.max(3, Math.floor(level / 2) + 2);
    let rts: number[] = [];

    el.innerHTML = `
      <style>
        .sr-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .sr-grid {
          display: grid;
          grid-template-columns: repeat(3, 80px);
          gap: 16px;
        }
        .sr-pad {
          width: 80px;
          height: 80px;
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--line);
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.1s, transform 0.1s;
        }
        .sr-pad.active {
          background: var(--accent);
          transform: scale(1.05);
          border-color: var(--accent);
        }
        .sr-pad.correct { background: var(--ok); border-color: var(--ok); }
        .sr-pad.wrong { background: var(--danger); border-color: var(--danger); }
        .sr-pad:active { transform: scale(0.95); }
        .sr-task { font-size: 24px; font-weight: bold; height: 32px; }
      </style>
      <div class="sr-arena">
        <div class="sr-task" id="sr-task"></div>
        <div class="sr-grid" id="sr-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#sr-grid') as HTMLElement;
    const taskEl = el.querySelector('#sr-task') as HTMLElement;
    const pads: HTMLElement[] = [];
    
    for (let i = 0; i < 9; i++) {
      const pad = document.createElement('div');
      pad.className = 'sr-pad';
      pad.onclick = () => onPadClick(i);
      pads.push(pad);
      grid.appendChild(pad);
    }

    let isPlaying = false;
    let t0 = performance.now();

    const playSequence = async () => {
      isPlaying = true;
      userStep = 0;
      sequence = [];
      taskEl.textContent = 'Запоминайте...';
      
      let last = -1;
      for (let i = 0; i < span; i++) {
        let n;
        do { n = Math.floor(Math.random() * 9); } while(n === last);
        last = n;
        sequence.push(n);
      }

      await new Promise(r => setTimeout(r, 800));
      if (isGameOver) return;

      for (let i = 0; i < sequence.length; i++) {
        if (isGameOver) return;
        const p = pads[sequence[i]];
        p.classList.add('active');
        await new Promise(r => setTimeout(r, 400));
        p.classList.remove('active');
        await new Promise(r => setTimeout(r, 200));
      }
      
      if (isGameOver) return;
      taskEl.textContent = 'ОБРАТНЫЙ ПОРЯДОК!';
      taskEl.style.color = 'var(--accent)';
      isPlaying = false;
      t0 = performance.now();
    };

    const onPadClick = (idx: number) => {
      if (isPlaying || isGameOver) return;
      
      const expectedIdx = sequence[sequence.length - 1 - userStep];
      
      const p = pads[idx];
      
      if (idx === expectedIdx) {
        p.classList.add('correct');
        setTimeout(() => p.classList.remove('correct'), 200);
        userStep++;
        
        if (userStep === sequence.length) {
          totalRounds++;
          correctRounds++;
          span++;
          rts.push(performance.now() - t0);
          taskEl.textContent = 'Отлично!';
          taskEl.style.color = 'var(--ok)';
          checkEnd();
        }
      } else {
        totalRounds++;
        span = Math.max(3, span - 1);
        rts.push(performance.now() - t0);
        
        p.classList.add('wrong');
        setTimeout(() => p.classList.remove('wrong'), 400);
        
        taskEl.textContent = 'Ошибка';
        taskEl.style.color = 'var(--danger)';
        checkEnd();
      }
    };

    const checkEnd = () => {
      isPlaying = true; // block input
      if (isTimeUp()) {
        setTimeout(endBlock, 1000);
      } else {
        setTimeout(() => {
          taskEl.style.color = 'var(--text)';
          playSequence();
        }, 1000);
      }
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    playSequence();

    return () => { isGameOver = true; };
  }
};

export default sequenceReverseModule;
