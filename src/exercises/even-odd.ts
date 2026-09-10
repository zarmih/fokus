import { ExerciseModule, BlockResult } from './contract';

const evenOddModule: ExerciseModule = {
  manifest: {
    id: 'even-odd',
    name: 'Двойное Дно',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Если рамка СИНЯЯ — укажите чётное или нечётное. Если ЖЁЛТАЯ — больше или меньше 5.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .eo-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
        }
        .eo-frame {
          width: 140px;
          height: 140px;
          border: 8px solid;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 64px;
          font-weight: 800;
          transition: border-color 0.2s;
        }
        .eo-frame.rule-even { border-color: #3b82f6; }
        .eo-frame.rule-mag { border-color: #eab308; }
        .eo-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .eo-btn {
          padding: 16px 24px;
          font-size: 18px;
          font-weight: 600;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
        }
        .eo-btn:active { transform: scale(0.95); }
      </style>
      <div class="eo-arena">
        <div class="eo-frame" id="eo-frame"></div>
        <div class="eo-controls" id="eo-controls"></div>
      </div>
    `;

    const frame = el.querySelector('#eo-frame') as HTMLElement;
    const controls = el.querySelector('#eo-controls') as HTMLElement;
    
    let currentAns = '';
    let t0 = performance.now();
    let rule = 'even';
    const switchProb = 0.2 + level * 0.05;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      if (Math.random() < switchProb) {
        rule = rule === 'even' ? 'mag' : 'even';
      }

      frame.className = `eo-frame rule-${rule}`;
      
      let n;
      do { n = Math.floor(Math.random() * 9) + 1; } while(n === 5); // 1-9, excluding 5
      
      frame.textContent = n.toString();

      controls.innerHTML = '';
      
      if (rule === 'even') {
        currentAns = n % 2 === 0 ? 'even' : 'odd';
        const b1 = document.createElement('button'); b1.className='eo-btn'; b1.textContent='Чётное'; b1.onclick = () => handleAns('even');
        const b2 = document.createElement('button'); b2.className='eo-btn'; b2.textContent='Нечётное'; b2.onclick = () => handleAns('odd');
        controls.appendChild(b1); controls.appendChild(b2);
      } else {
        currentAns = n > 5 ? 'greater' : 'less';
        const b1 = document.createElement('button'); b1.className='eo-btn'; b1.textContent='< 5'; b1.onclick = () => handleAns('less');
        const b2 = document.createElement('button'); b2.className='eo-btn'; b2.textContent='> 5'; b2.onclick = () => handleAns('greater');
        controls.appendChild(b1); controls.appendChild(b2);
      }

      t0 = performance.now();
    };

    const handleAns = (ans: string) => {
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

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default evenOddModule;
