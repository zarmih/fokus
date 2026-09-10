import { ExerciseModule, BlockResult } from './contract';

const movingTargetsModule: ExerciseModule = {
  manifest: {
    id: 'moving-targets',
    name: 'Слежение',
    domain: 'attention',
    skills: ['sustained_attention', 'divided_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните подсвеченные объекты. Когда они остановятся — укажите их.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correctRounds = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let t0 = performance.now();

    const targetCount = Math.max(1, Math.min(5, Math.floor(level / 2) + 1));
    const distractorCount = Math.max(3, Math.min(10, Math.floor(level) + 2));
    const totalCount = targetCount + distractorCount;

    el.innerHTML = `
      <style>
        .mt-arena {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: rgba(0,0,0,0.1);
          border-radius: 16px;
        }
        .mt-obj {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--surface);
          border: 2px solid var(--line);
          transition: transform 0.1s;
          cursor: pointer;
        }
        .mt-obj.highlight {
          background: var(--accent);
          border-color: var(--accent);
          box-shadow: 0 0 16px var(--accent-glow);
        }
        .mt-obj.selected-correct {
          background: var(--ok);
        }
        .mt-obj.selected-wrong {
          background: var(--danger);
        }
      </style>
      <div class="mt-arena" id="mt-arena"></div>
    `;

    const arena = el.querySelector('#mt-arena') as HTMLElement;
    let objects: { el: HTMLElement, isTarget: boolean, x: number, y: number, vx: number, vy: number }[] = [];
    let raf: number;
    let phase: 'show' | 'move' | 'input' = 'show';
    let clickedCount = 0;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      arena.innerHTML = '';
      objects = [];
      clickedCount = 0;
      phase = 'show';

      for (let i = 0; i < totalCount; i++) {
        const obj = document.createElement('div');
        obj.className = 'mt-obj';
        const isTarget = i < targetCount;
        if (isTarget) obj.classList.add('highlight');
        
        const r = 16;
        let x = r + Math.random() * (arena.clientWidth - r * 2);
        let y = r + Math.random() * (arena.clientHeight - r * 2);
        
        const speed = 1.5 + level * 0.2;
        const angle = Math.random() * Math.PI * 2;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;

        obj.style.left = `${x - r}px`;
        obj.style.top = `${y - r}px`;

        obj.onclick = () => {
          if (phase !== 'input' || isGameOver) return;
          if (obj.classList.contains('selected-correct') || obj.classList.contains('selected-wrong')) return;
          
          clickedCount++;
          if (isTarget) {
            obj.classList.add('selected-correct');
          } else {
            obj.classList.add('selected-wrong');
          }

          if (clickedCount === targetCount) {
            rts.push(performance.now() - t0);
            rounds++;
            const wrongClicks = arena.querySelectorAll('.selected-wrong').length;
            if (wrongClicks === 0) correctRounds++;
            
            setTimeout(startRound, 600);
          }
        };

        arena.appendChild(obj);
        objects.push({ el: obj, isTarget, x, y, vx, vy });
      }

      setTimeout(() => {
        if (isGameOver) return;
        objects.forEach(o => o.el.classList.remove('highlight'));
        phase = 'move';
        let moveTime = 3000 + Math.random() * 2000;
        let startMove = performance.now();
        
        const tick = (now: number) => {
          if (isGameOver) return;
          if (now - startMove > moveTime) {
            phase = 'input';
            t0 = performance.now();
            return;
          }
          
          const w = arena.clientWidth;
          const h = arena.clientHeight;
          const r = 16;

          objects.forEach(o => {
            o.x += o.vx;
            o.y += o.vy;
            if (o.x < r) { o.x = r; o.vx *= -1; }
            if (o.x > w - r) { o.x = w - r; o.vx *= -1; }
            if (o.y < r) { o.y = r; o.vy *= -1; }
            if (o.y > h - r) { o.y = h - r; o.vy *= -1; }
            
            o.el.style.left = `${o.x - r}px`;
            o.el.style.top = `${o.y - r}px`;
          });
          
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, 1500);
    };

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
      const accuracy = rounds > 0 ? correctRounds / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    // Need to wait for container to have dimensions
    setTimeout(startRound, 100);

    return () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
    };
  }
};

export default movingTargetsModule;
