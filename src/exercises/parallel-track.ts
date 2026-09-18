import { ExerciseModule, BlockResult } from './contract';

const parallelTrackModule: ExerciseModule = {
  manifest: {
    id: 'parallel-track',
    name: 'Параллельные пути',
    domain: 'attention',
    skills: ['divided_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за левым и правым столбцами. Нажимайте соответствующую кнопку, когда падающий круг касается зеленой зоны внизу.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .pt-arena {
          display: flex;
          width: 100%;
          height: 100%;
          gap: 20px;
          padding: 20px;
          box-sizing: border-box;
        }
        .pt-track {
          flex: 1;
          background: var(--surface-2, #222);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pt-zone {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: rgba(0, 255, 100, 0.2);
          border-top: 2px dashed rgba(0, 255, 100, 0.5);
        }
        .pt-item {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent, #00d0ff);
          left: 50%;
          transform: translateX(-50%);
          top: -50px;
        }
        .pt-controls {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }
        .pt-btn {
          pointer-events: auto;
          padding: 15px 30px;
          font-size: 1.2rem;
          background: var(--surface-3, #444);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .pt-btn:active {
          background: var(--surface-4, #555);
        }
      </style>
      <div class="pt-arena" id="pt-arena">
        <div class="pt-track" id="pt-track-left">
          <div class="pt-zone"></div>
        </div>
        <div class="pt-track" id="pt-track-right">
          <div class="pt-zone"></div>
        </div>
      </div>
      <div class="pt-controls">
        <button class="pt-btn" id="pt-btn-left">ЛЕВЫЙ</button>
        <button class="pt-btn" id="pt-btn-right">ПРАВЫЙ</button>
      </div>
    `;

    const trackLeft = el.querySelector('#pt-track-left') as HTMLElement;
    const trackRight = el.querySelector('#pt-track-right') as HTMLElement;
    const btnLeft = el.querySelector('#pt-btn-left') as HTMLElement;
    const btnRight = el.querySelector('#pt-btn-right') as HTMLElement;

    let items: { el: HTMLElement, track: 'left' | 'right', y: number, speed: number, id: number, active: boolean, t0: number }[] = [];
    let itemId = 0;
    let spawnTimeout: any;
    let rafId: number;

    const spawnItem = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      const isLeft = Math.random() > 0.5;
      const trackEl = isLeft ? trackLeft : trackRight;
      
      const itemEl = document.createElement('div');
      itemEl.className = 'pt-item';
      trackEl.appendChild(itemEl);
      
      const speed = 2 + Math.random() * (1 + level * 0.5); // speed increases with level
      
      items.push({
        el: itemEl,
        track: isLeft ? 'left' : 'right',
        y: -50,
        speed,
        id: ++itemId,
        active: true,
        t0: performance.now() // time of spawn
      });
      
      spawnTimeout = setTimeout(spawnItem, 1500 + Math.random() * 2000);
    };

    const loop = () => {
      if (isGameOver) return;
      const trackHeight = trackLeft.clientHeight;
      const zoneTop = trackHeight - 80;
      
      items.forEach(item => {
        if (!item.active) return;
        
        item.y += item.speed;
        item.el.style.top = `${item.y}px`;
        
        if (item.y > trackHeight) {
          // Missed
          item.active = false;
          item.el.remove();
          rounds++;
          rts.push(3000);
        }
      });
      
      // cleanup inactive items
      items = items.filter(item => item.active);
      
      rafId = requestAnimationFrame(loop);
    };

    const handleTap = (side: 'left' | 'right') => {
      if (isGameOver) return;
      
      const trackHeight = trackLeft.clientHeight;
      const zoneTop = trackHeight - 80;
      const zoneBottom = trackHeight;
      
      // Find the lowest active item on the correct track
      const targetItem = items.filter(i => i.active && i.track === side).sort((a, b) => b.y - a.y)[0];
      
      if (targetItem) {
        // Item is in the target zone (center of item is at y + 20)
        const itemCenter = targetItem.y + 20;
        
        if (itemCenter >= zoneTop && itemCenter <= zoneBottom) {
          // Correct
          correct++;
          rts.push(performance.now() - targetItem.t0);
          targetItem.el.style.background = 'var(--success, #00ff00)';
        } else {
          // Early / late tap
          rts.push(3000);
          targetItem.el.style.background = 'var(--danger, #ff0000)';
        }
        
        rounds++;
        targetItem.active = false;
        setTimeout(() => { if (targetItem.el.parentNode) targetItem.el.remove(); }, 200);
      } else {
        // Tap without item - penalty
        rounds++;
        rts.push(3000);
      }
    };

    btnLeft.onpointerdown = (e) => { e.preventDefault(); handleTap('left'); };
    btnRight.onpointerdown = (e) => { e.preventDefault(); handleTap('right'); };

    // Keyboard support
    const onKey = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.key === 'ArrowLeft') handleTap('left');
      if (e.key === 'ArrowRight') handleTap('right');
    };
    window.addEventListener('keydown', onKey);

    spawnItem();
    rafId = requestAnimationFrame(loop);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(spawnTimeout);
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.filter(r => r < 3000).length > 0 ? rts.filter(r => r < 3000).reduce((a,b)=>a+b,0)/rts.filter(r => r < 3000).length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(spawnTimeout);
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default parallelTrackModule;
