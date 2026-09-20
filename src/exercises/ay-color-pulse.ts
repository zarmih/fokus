import { ExerciseModule, BlockResult } from './contract';

const ayColorPulseModule: ExerciseModule = {
  manifest: {
    id: 'ay-color-pulse',
    name: 'Цветовой пульс',
    domain: 'speed',
    skills: ['reaction_speed', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте на фигуру ТОЛЬКО когда появляется КРАСНЫЙ цвет.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cp-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: transparent;
        }
        .cp-box {
          width: 150px;
          height: 150px;
          border-radius: 20px;
          background: #ccc;
          transition: background 0.1s;
          cursor: pointer;
        }
      </style>
      <div class="cp-arena" id="cp-arena">
        <div class="cp-box" id="cp-box"></div>
      </div>
    `;

    const box = el.querySelector('#cp-box') as HTMLElement;

    let t0 = 0;
    let timeoutId: any;
    let isTarget = false;
    let phase = 'wait';

    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];

    const nextPulse = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      box.style.background = '#475569';
      phase = 'wait';
      
      const delay = Math.random() * 1000 + 500;
      
      timeoutId = setTimeout(() => {
        if (isGameOver) return;
        
        isTarget = Math.random() > 0.5;
        const color = isTarget ? colors[0] : colors[Math.floor(Math.random() * (colors.length - 1)) + 1];
        
        box.style.background = color;
        phase = 'input';
        t0 = performance.now();
        
        timeoutId = setTimeout(() => {
          if (phase === 'input') {
            if (!isTarget) {
              correct++;
            } else {
              rts.push(2000);
            }
            rounds++;
            nextPulse();
          }
        }, 1000);
      }, delay);
    };

    box.onclick = (e) => {
      e.stopPropagation();
      if (phase !== 'input' || isGameOver) return;
      
      clearTimeout(timeoutId);
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;
      
      if (isTarget) {
        correct++;
      } else {
        rts.push(rt + 1000);
      }
      
      nextPulse();
    };

    nextPulse();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default ayColorPulseModule;
