import { ExerciseModule, BlockResult } from './contract';

const dotSpanModule: ExerciseModule = {
  manifest: {
    id: 'dot-span',
    name: 'Путь Следопыта',
    domain: 'memory',
    skills: ['spatial_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните последовательность появления точек и повторите её.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let sequence: number[] = [];
    let userStep = 0;
    let span = Math.max(3, Math.floor(level) + 2);
    
    el.innerHTML = `
      <style>
        .ds-grid {
          display: grid;
          grid-template-columns: repeat(4, 60px);
          gap: 16px;
          justify-content: center;
          align-content: center;
          height: 100%;
        }
        .ds-dot {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .ds-dot.active {
          background: var(--accent);
          transform: scale(1.1);
          box-shadow: 0 0 20px var(--accent-glow);
        }
        .ds-dot.correct {
          background: var(--ok);
        }
        .ds-dot.wrong {
          background: var(--danger);
        }
      </style>
      <div class="ds-grid" id="ds-grid"></div>
    `;

    const grid = el.querySelector('#ds-grid') as HTMLElement;
    const dots: HTMLElement[] = [];
    for (let i = 0; i < 16; i++) {
      const dot = document.createElement('div');
      dot.className = 'ds-dot';
      dot.onclick = () => onDotClick(i);
      dots.push(dot);
      grid.appendChild(dot);
    }

    let isPlaying = false;
    let t0 = performance.now();
    let rts: number[] = [];

    const playSequence = async () => {
      isPlaying = true;
      userStep = 0;
      sequence = [];
      const used = new Set<number>();
      
      for (let i = 0; i < span; i++) {
        let n;
        do { n = Math.floor(Math.random() * 16); } while(used.has(n));
        used.add(n);
        sequence.push(n);
      }

      await new Promise(r => setTimeout(r, 500));
      if (isGameOver) return;

      for (let i = 0; i < sequence.length; i++) {
        if (isGameOver) return;
        const d = dots[sequence[i]];
        d.classList.add('active');
        await new Promise(r => setTimeout(r, 600));
        d.classList.remove('active');
        await new Promise(r => setTimeout(r, 200));
      }
      
      isPlaying = false;
      t0 = performance.now();
    };

    const onDotClick = (idx: number) => {
      if (isPlaying || isGameOver) return;
      const d = dots[idx];
      
      if (sequence[userStep] === idx) {
        d.classList.add('correct');
        setTimeout(() => d.classList.remove('correct'), 300);
        userStep++;
        if (userStep === sequence.length) {
          totalRounds++;
          correctRounds++;
          span++;
          rts.push(performance.now() - t0);
          checkEnd();
        }
      } else {
        d.classList.add('wrong');
        setTimeout(() => d.classList.remove('wrong'), 300);
        totalRounds++;
        span = Math.max(3, span - 1);
        rts.push(performance.now() - t0);
        checkEnd();
      }
    };

    const checkEnd = () => {
      if (isTimeUp()) {
        endBlock();
      } else {
        setTimeout(playSequence, 500);
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

export default dotSpanModule;
