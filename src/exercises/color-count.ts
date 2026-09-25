import { ExerciseModule, BlockResult } from './contract';

const colorCountModule: ExerciseModule = {
  manifest: {
    id: 'color-count',
    name: 'Перепись цветов',
    domain: 'attention',
    skills: ['selective_attention', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Сосчитайте, сколько фигур заданного ЦВЕТА находится на экране, и выберите правильное число.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cc-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .cc-header {
          font-size: 20px;
          font-weight: 600;
          text-align: center;
          margin-bottom: 24px;
        }
        .cc-target {
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
        }
        .cc-grid {
          display: grid;
          gap: 12px;
          width: 100%;
          max-width: 400px;
          margin: auto;
          justify-content: center;
          align-items: center;
        }
        .cc-shape {
          font-size: 32px;
          text-align: center;
        }
        .cc-answers {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }
        .cc-btn {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          border: 2px solid var(--line);
          background: var(--surface);
          color: var(--text);
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s;
        }
        .cc-btn:active {
          transform: scale(0.9);
        }
      </style>
      <div class="cc-container">
        <div class="cc-header">Сколько <span class="cc-target" id="cc-target-name"></span> фигур?</div>
        <div class="cc-grid" id="cc-grid"></div>
        <div class="cc-answers" id="cc-answers"></div>
      </div>
    `;

    const grid = el.querySelector('#cc-grid') as HTMLElement;
    const targetName = el.querySelector('#cc-target-name') as HTMLElement;
    const answersContainer = el.querySelector('#cc-answers') as HTMLElement;

    const colors = [
      { hex: '#ef4444', name: 'КРАСНЫХ' },
      { hex: '#3b82f6', name: 'СИНИХ' },
      { hex: '#10b981', name: 'ЗЕЛЁНЫХ' },
      { hex: '#eab308', name: 'ЖЁЛТЫХ' },
      { hex: '#a855f7', name: 'ФИОЛЕТОВЫХ' }
    ];
    const shapes = ['⬤', '■', '▲', '✦'];

    let t0 = performance.now();

    const getTotalCount = () => {
      if (level < 3) return 10 + Math.floor(level) * 3;
      if (level < 6) return 15 + Math.floor(level) * 4;
      return 25 + Math.floor(level) * 2;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      grid.innerHTML = '';
      answersContainer.innerHTML = '';
      
      const totalShapes = Math.min(50, getTotalCount());
      const availableColors = colors.slice(0, Math.min(colors.length, 2 + Math.floor(level / 3)));
      
      const targetColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      targetName.textContent = targetColor.name;
      targetName.style.color = targetColor.hex;

      let targetCount = 0;
      
      for (let i = 0; i < totalShapes; i++) {
        const item = document.createElement('div');
        item.className = 'cc-shape';
        
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const color = availableColors[Math.floor(Math.random() * availableColors.length)];
        
        if (color.hex === targetColor.hex) targetCount++;
        
        item.textContent = shape;
        item.style.color = color.hex;
        
        const rot = Math.random() * 60 - 30;
        const scale = 0.8 + Math.random() * 0.4;
        item.style.transform = `rotate(${rot}deg) scale(${scale})`;
        
        grid.appendChild(item);
      }

      if (targetCount === 0) {
        startRound();
        return;
      }

      let answerOpts = new Set<number>();
      answerOpts.add(targetCount);
      while (answerOpts.size < 4) {
        let delta = Math.floor(Math.random() * 5) + 1;
        if (Math.random() > 0.5) delta = -delta;
        let opt = targetCount + delta;
        if (opt >= 0) answerOpts.add(opt);
      }
      
      const optsArray = Array.from(answerOpts).sort((a, b) => a - b);
      
      optsArray.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'cc-btn';
        btn.textContent = opt.toString();
        
        btn.onclick = () => {
          if (isGameOver) return;
          rounds++;
          rts.push(performance.now() - t0);
          
          if (opt === targetCount) {
            correct++;
            btn.style.background = 'var(--ok)';
            btn.style.borderColor = 'var(--ok)';
            btn.style.color = '#000';
          } else {
            btn.style.background = 'var(--danger)';
            btn.style.borderColor = 'var(--danger)';
            
            Array.from(answersContainer.children).forEach((b: any) => {
              if (b.textContent === targetCount.toString()) {
                b.style.borderColor = 'var(--ok)';
              }
            });
          }
          
          Array.from(answersContainer.children).forEach((b: any) => b.disabled = true);
          setTimeout(startRound, 400);
        };
        
        answersContainer.appendChild(btn);
      });
      
      grid.style.gridTemplateColumns = `repeat(auto-fit, minmax(${totalShapes > 30 ? 30 : 40}px, 1fr))`;

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default colorCountModule;
