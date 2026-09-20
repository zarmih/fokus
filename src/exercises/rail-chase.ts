import { ExerciseModule, BlockResult } from './contract';

const railChaseModule: ExerciseModule = {
  manifest: {
    id: 'rail-chase',
    name: 'Гонка по рельсам',
    domain: 'attention',
    skills: ['sustained_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за целевым объектом. Нажмите кнопку, когда цель окажется в подсвеченной зоне. Не реагируйте на дистракторы.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // Track state
    const railCount = Math.min(5, 2 + Math.floor(level / 3));
    const speed = 100 + level * 10; // pixels per second
    
    el.innerHTML = `
      <style>
        .rc-arena {
          position: relative;
          width: 100%;
          height: 300px;
          background: var(--surface);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
        }
        .rc-rail {
          width: 100%;
          height: 40px;
          border-bottom: 2px dashed var(--line);
          position: relative;
        }
        .rc-zone {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 100%;
          background: rgba(0, 150, 255, 0.2);
          border-left: 2px solid var(--accent);
          border-right: 2px solid var(--accent);
        }
        .rc-obj {
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          top: 5px;
        }
        .rc-target {
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
        }
        .rc-distractor {
          background: var(--text);
          opacity: 0.5;
        }
        .rc-controls {
          margin-top: 30px;
          display: flex;
          justify-content: center;
        }
        .rc-btn {
          padding: 20px 60px;
          font-size: 24px;
          border-radius: 12px;
          background: var(--accent);
          color: #fff;
          border: none;
          cursor: pointer;
        }
        .rc-btn:active { transform: scale(0.95); }
      </style>
      <div class="rc-arena" id="rc-arena">
        ${Array.from({length: railCount}).map((_, i) => `
          <div class="rc-rail" id="rc-rail-${i}">
            <div class="rc-zone"></div>
          </div>
        `).join('')}
      </div>
      <div class="rc-controls">
        <button class="rc-btn" id="rc-tap">ТАП!</button>
      </div>
    `;

    const arena = el.querySelector('#rc-arena') as HTMLElement;
    const tapBtn = el.querySelector('#rc-tap') as HTMLButtonElement;

    let targetRail = 0;
    let targetX = 0;
    let inZone = false;
    let hasTappedInRound = false;
    let lastRenderTime = performance.now();
    let animationFrameId: number;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      targetRail = Math.floor(Math.random() * railCount);
      targetX = -50;
      inZone = false;
      hasTappedInRound = false;
      
      // Clear rails
      for (let i = 0; i < railCount; i++) {
        const rail = el.querySelector('#rc-rail-' + i) as HTMLElement;
        const existingObjs = rail.querySelectorAll('.rc-obj');
        existingObjs.forEach(o => o.remove());
        
        const obj = document.createElement('div');
        obj.className = 'rc-obj ' + (i === targetRail ? 'rc-target' : 'rc-distractor');
        obj.style.left = targetX + 'px';
        rail.appendChild(obj);
      }

      lastRenderTime = performance.now();
      requestAnimationFrame(update);
    };

    const update = (time: number) => {
      if (isGameOver) return;
      
      const dt = (time - lastRenderTime) / 1000;
      lastRenderTime = time;
      
      targetX += speed * dt;
      
      const arenaWidth = arena.clientWidth;
      const zoneLeft = arenaWidth / 2 - 40;
      const zoneRight = arenaWidth / 2 + 40;
      
      const wasInZone = inZone;
      inZone = (targetX + 15 > zoneLeft && targetX + 15 < zoneRight);
      
      if (wasInZone && !inZone && !hasTappedInRound) {
        // Missed it
        rounds++;
        // false negative
        handleFeedback(false);
        setTimeout(startRound, 500);
        return;
      }
      
      if (targetX > arenaWidth + 50) {
        // End of screen
        setTimeout(startRound, 200);
        return;
      }

      for (let i = 0; i < railCount; i++) {
        const rail = el.querySelector('#rc-rail-' + i) as HTMLElement;
        const obj = rail.querySelector('.rc-obj') as HTMLElement;
        if (obj) {
          // Distractors move at slightly different speeds or same speed
          const dx = i === targetRail ? targetX : targetX + (Math.sin(time/500 + i) * 20);
          obj.style.left = dx + 'px';
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    const handleFeedback = (isCorrect: boolean) => {
      arena.style.boxShadow = isCorrect ? 'inset 0 0 20px var(--ok)' : 'inset 0 0 20px var(--danger)';
      setTimeout(() => {
        if (!isGameOver) arena.style.boxShadow = 'none';
      }, 300);
    };

    const onTap = () => {
      if (isGameOver || hasTappedInRound) return;
      hasTappedInRound = true;
      rounds++;
      
      cancelAnimationFrame(animationFrameId);
      
      if (inZone) {
        correct++;
        rts.push(500); // simplify RT for this mini-game
        handleFeedback(true);
      } else {
        handleFeedback(false);
      }
      
      setTimeout(startRound, 500);
    };

    tapBtn.onclick = onTap;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onTap();
      }
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default railChaseModule;
