import { ExerciseModule, BlockResult } from './contract';

const evenOddModule: ExerciseModule = {
  manifest: {
    id: 'even-odd',
    name: 'Двойное Дно',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Если рамка СИНЯЯ — укажите чётное или нечётное. Если ЖЁЛТАЯ — больше или меньше 5. Используйте кнопки или стрелки (← / →).'
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
          transition: border-color 0.2s, background-color 0.2s;
        }
        .eo-frame.rule-even { border-color: #3b82f6; }
        .eo-frame.rule-mag { border-color: #eab308; }
        .eo-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .eo-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 24px;
          font-size: 18px;
          font-weight: 600;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.1s, background-color 0.2s;
        }
        .eo-btn:active { transform: scale(0.95); }
        .eo-hint {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 4px;
          font-weight: normal;
        }
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
      
      const createBtn = (label: string, hint: string, onClick: () => void) => {
        const btn = document.createElement('button'); 
        btn.className = 'eo-btn'; 
        btn.innerHTML = `<span>${label}</span><span class="eo-hint">${hint}</span>`;
        btn.onclick = onClick;
        return btn;
      };

      if (rule === 'even') {
        currentAns = n % 2 === 0 ? 'even' : 'odd';
        controls.appendChild(createBtn('Чётное', '[←]', () => handleAns('even')));
        controls.appendChild(createBtn('Нечётное', '[→]', () => handleAns('odd')));
      } else {
        currentAns = n > 5 ? 'greater' : 'less';
        controls.appendChild(createBtn('< 5', '[←]', () => handleAns('less')));
        controls.appendChild(createBtn('> 5', '[→]', () => handleAns('greater')));
      }

      t0 = performance.now();
    };

    const handleAns = (ans: string) => {
      if (isGameOver) return;
      rounds++;
      if (ans === currentAns) {
        correct++;
        frame.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      } else {
        errors++;
        frame.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
      }
      setTimeout(() => frame.style.backgroundColor = 'transparent', 150);
      rts.push(performance.now() - t0);
      startRound();
    };

    const onKey = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.key === 'ArrowLeft') {
        handleAns(rule === 'even' ? 'even' : 'less');
      } else if (e.key === 'ArrowRight') {
        handleAns(rule === 'even' ? 'odd' : 'greater');
      }
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { 
      isGameOver = true; 
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default evenOddModule;
