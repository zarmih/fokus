import { ExerciseModule, BlockResult } from './contract';

const neonSparkModule: ExerciseModule = {
  manifest: {
    id: 'neon-spark',
    name: 'Неоновая искра',
    domain: 'attention',
    skills: ['sustained_attention', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Внимательно следите за сеткой. Нажмите на точку, которая на мгновение изменила яркость.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ns-arena {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          padding: 20px;
          max-width: 400px;
          margin: 0 auto;
          place-items: center;
          height: 100%;
          align-content: center;
        }
        .ns-dot {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: var(--surface-3, #333);
          cursor: pointer;
          transition: background 0.1s, transform 0.1s;
        }
        .ns-dot.flash {
          background: var(--accent, #00ffcc);
          transform: scale(1.1);
        }
      </style>
      <div class="ns-arena" id="ns-arena">
        ${Array.from({ length: 16 }).map((_, i) => `<div class="ns-dot" data-idx="${i}"></div>`).join('')}
      </div>
    `;

    const dots = Array.from(el.querySelectorAll('.ns-dot')) as HTMLElement[];
    let targetIdx = -1;
    let flashTimeout: any;
    let waitTimeout: any;
    let t0 = 0;
    let acceptingInput = false;

    const scheduleNext = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      acceptingInput = false;
      targetIdx = -1;
      
      const delay = Math.random() * 1500 + 1000;
      waitTimeout = setTimeout(() => {
        if (isGameOver) return;
        targetIdx = Math.floor(Math.random() * dots.length);
        const targetDot = dots[targetIdx];
        targetDot.classList.add('flash');
        
        flashTimeout = setTimeout(() => {
          targetDot.classList.remove('flash');
          acceptingInput = true;
          t0 = performance.now();
          
          waitTimeout = setTimeout(() => {
            if (isGameOver) return;
            // Missed
            rounds++;
            rts.push(2000);
            scheduleNext();
          }, 2000);
          
        }, 300);
      }, delay);
    };

    dots.forEach(dot => {
      dot.onclick = (e) => {
        e.stopPropagation();
        if (isGameOver || !acceptingInput) return;
        
        const idx = parseInt(dot.getAttribute('data-idx') || '-1', 10);
        clearTimeout(waitTimeout);
        
        rounds++;
        rts.push(performance.now() - t0);
        
        if (idx === targetIdx) {
          correct++;
          dot.style.background = 'var(--success, #00cc66)';
        } else {
          dot.style.background = 'var(--danger, #ff4444)';
          if (targetIdx !== -1) {
            dots[targetIdx].style.background = 'var(--success, #00cc66)';
          }
        }
        
        acceptingInput = false;
        
        setTimeout(() => {
          if (isGameOver) return;
          dots.forEach(d => d.style.background = '');
          scheduleNext();
        }, 500);
      };
    });

    scheduleNext();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      clearTimeout(waitTimeout);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      clearTimeout(waitTimeout);
    };
  }
};

export default neonSparkModule;
