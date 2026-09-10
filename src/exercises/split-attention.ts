import { ExerciseModule, BlockResult } from './contract';

const splitAttentionModule: ExerciseModule = {
  manifest: {
    id: 'split-attention',
    name: 'Двойной Контроль',
    domain: 'attention',
    skills: ['divided_attention', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за обеими половинами экрана. Нажимайте на объекты заданного цвета, как только они появляются.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let falseAlarms = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308'];
    const targetColor = colors[Math.floor(Math.random() * colors.length)];

    el.innerHTML = `
      <style>
        .sa-arena {
          display: flex;
          width: 100%;
          height: 100%;
          gap: 16px;
          position: relative;
        }
        .sa-half {
          flex: 1;
          background: rgba(0,0,0,0.1);
          border-radius: 16px;
          position: relative;
          overflow: hidden;
        }
        .sa-divider {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          background: var(--line);
          transform: translateX(-50%);
        }
        .sa-header {
          position: absolute;
          top: 16px;
          left: 0;
          width: 100%;
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          z-index: 10;
        }
        .sa-obj {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          cursor: pointer;
          transform: translate(-50%, -50%);
          transition: transform 0.1s;
        }
        .sa-obj:active { transform: translate(-50%, -50%) scale(0.9); }
      </style>
      <div class="sa-header">Ищите: <span style="color:${targetColor}">⬤</span></div>
      <div class="sa-arena" id="sa-arena">
        <div class="sa-half" id="sa-left"></div>
        <div class="sa-half" id="sa-right"></div>
      </div>
    `;

    const leftHalf = el.querySelector('#sa-left') as HTMLElement;
    const rightHalf = el.querySelector('#sa-right') as HTMLElement;

    let timeoutId: any;
    let activeObjects: { el: HTMLElement, isTarget: boolean, t0: number }[] = [];

    const spawnObj = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      const isLeft = Math.random() > 0.5;
      const container = isLeft ? leftHalf : rightHalf;
      
      const isTarget = Math.random() < 0.4; // 40% chance of target
      const color = isTarget ? targetColor : colors.filter(c => c !== targetColor)[Math.floor(Math.random()*(colors.length-1))];

      const obj = document.createElement('div');
      obj.className = 'sa-obj';
      obj.style.background = color;
      
      // Random position inside the half
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 80;
      obj.style.left = `${x}%`;
      obj.style.top = `${y}%`;

      const t0 = performance.now();
      let clicked = false;

      obj.onclick = () => {
        if (isGameOver || clicked) return;
        clicked = true;
        rounds++;
        
        if (isTarget) {
          correct++;
          rts.push(performance.now() - t0);
          obj.style.background = 'var(--ok)';
        } else {
          falseAlarms++;
          obj.style.background = 'var(--danger)';
        }
        
        obj.style.pointerEvents = 'none';
        setTimeout(() => obj.remove(), 200);
      };

      container.appendChild(obj);

      // Remove after lifetime
      const lifetime = Math.max(800, 2000 - level * 200);
      setTimeout(() => {
        if (isGameOver) return;
        if (!clicked) {
          if (isTarget) {
            rounds++;
            // Missed target
          }
          obj.remove();
        }
      }, lifetime);

      const nextDelay = Math.max(400, 1500 - level * 150) + Math.random() * 500;
      timeoutId = setTimeout(spawnObj, nextDelay);
    };

    timeoutId = setTimeout(spawnObj, 1000);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const totalEvents = rounds + falseAlarms;
      const accuracy = totalEvents > 0 ? Math.max(0, correct - falseAlarms) / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds: correct });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default splitAttentionModule;
