import { ExerciseModule, BlockResult } from './contract';

const meteoritesModule: ExerciseModule = {
  manifest: {
    id: 'meteorites',
    name: 'Метеориты',
    domain: 'speed',
    skills: ['processing_speed', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Уничтожайте ТОЛЬКО объекты нужной формы, пока они не упали.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .met-arena {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: rgba(0,0,0,0.1);
          border-radius: 16px;
        }
        .met-task {
          position: absolute;
          top: 16px;
          left: 0;
          width: 100%;
          text-align: center;
          font-size: 20px;
          font-weight: 600;
          z-index: 10;
        }
        .met-obj {
          position: absolute;
          font-size: 40px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
        }
        .met-obj:active { transform: scale(0.8); }
        .met-floor {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 8px;
          background: var(--line);
        }
      </style>
      <div class="met-task" id="met-task"></div>
      <div class="met-arena" id="met-arena">
        <div class="met-floor"></div>
      </div>
    `;

    const arena = el.querySelector('#met-arena') as HTMLElement;
    const taskEl = el.querySelector('#met-task') as HTMLElement;

    const shapes = ['⭐', '🔺', '🟦', '🔴', '🟩', '♦️'];
    let targetShape = shapes[0];
    let objects: { el: HTMLElement, y: number, vy: number, isTarget: boolean, clicked: boolean }[] = [];
    let raf: number;
    let timeoutId: any;

    const changeTarget = () => {
      targetShape = shapes[Math.floor(Math.random() * shapes.length)];
      taskEl.innerHTML = `Ловите: <b>${targetShape}</b>`;
    };

    const spawnObj = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      if (Math.random() < 0.1) changeTarget();

      const isTarget = Math.random() > 0.5;
      const shape = isTarget ? targetShape : shapes.filter(s => s !== targetShape)[Math.floor(Math.random()*(shapes.length-1))];
      
      const obj = document.createElement('div');
      obj.className = 'met-obj';
      obj.textContent = shape;
      
      const x = 10 + Math.random() * 80;
      obj.style.left = `${x}%`;
      obj.style.top = `-50px`;

      const vy = 1 + level * 0.3 + Math.random() * 1.5;
      const t0 = performance.now();

      const item = { el: obj, y: -50, vy, isTarget, clicked: false };

      obj.onmousedown = () => {
        if (isGameOver || item.clicked) return;
        item.clicked = true;
        rounds++;
        
        if (isTarget) {
          correct++;
          rts.push(performance.now() - t0);
          obj.style.opacity = '0';
          obj.style.transform = 'scale(2)';
        } else {
          errors++;
          rts.push(performance.now() - t0);
          obj.style.filter = 'grayscale(1) brightness(0.5)';
        }
        
        setTimeout(() => obj.remove(), 200);
      };

      arena.appendChild(obj);
      objects.push(item);

      const nextDelay = Math.max(300, 1200 - level * 100) + Math.random() * 500;
      timeoutId = setTimeout(spawnObj, nextDelay);
    };

    const tick = () => {
      if (isGameOver) return;
      const h = arena.clientHeight;

      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        if (o.clicked) continue;

        o.y += o.vy;
        o.el.style.top = `${o.y}px`;

        if (o.y > h - 48) {
          // hit floor
          if (o.isTarget) {
            rounds++; // missed target
          }
          o.el.remove();
          objects.splice(i, 1);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    changeTarget();
    timeoutId = setTimeout(spawnObj, 1000);
    raf = requestAnimationFrame(tick);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
      const totalEvents = rounds + errors;
      const accuracy = rounds > 0 ? Math.max(0, correct - errors) / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds: correct });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
    };
  }
};

export default meteoritesModule;
