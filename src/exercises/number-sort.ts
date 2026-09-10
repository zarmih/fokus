import { ExerciseModule, BlockResult } from './contract';

const numberSortModule: ExerciseModule = {
  manifest: {
    id: 'number-sort',
    name: 'Быстрая Сортировка',
    domain: 'speed',
    skills: ['processing_speed', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Кликайте по числам в порядке возрастания (от меньшего к большему).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correctHits = 0;
    let totalClicks = 0;
    let isGameOver = false;
    let currentNumbers: number[] = [];
    let expectedIdx = 0;
    let rts: number[] = [];

    const baseCount = 4 + Math.floor(level);
    
    el.innerHTML = `
      <style>
        .ns-arena {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .ns-bubble {
          position: absolute;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 2px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.1s, opacity 0.2s, background 0.2s;
          user-select: none;
        }
        .ns-bubble:active {
          transform: scale(0.9);
        }
      </style>
      <div class="ns-arena" id="ns-arena"></div>
    `;

    const arena = el.querySelector('#ns-arena') as HTMLElement;
    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      arena.innerHTML = '';
      const count = Math.min(12, baseCount + rounds);
      currentNumbers = [];
      while(currentNumbers.length < count) {
        let n = Math.floor(Math.random() * 99) + 1;
        if (!currentNumbers.includes(n)) currentNumbers.push(n);
      }
      
      const sorted = [...currentNumbers].sort((a,b) => a-b);
      expectedIdx = 0;

      currentNumbers.forEach(n => {
        const bubble = document.createElement('div');
        bubble.className = 'ns-bubble';
        bubble.textContent = n.toString();
        
        // Random position avoiding edges
        const left = 10 + Math.random() * 80;
        const top = 10 + Math.random() * 80;
        bubble.style.left = `${left}%`;
        bubble.style.top = `${top}%`;
        
        bubble.onclick = () => {
          if (isGameOver) return;
          totalClicks++;
          if (n === sorted[expectedIdx]) {
            correctHits++;
            expectedIdx++;
            bubble.style.background = 'var(--ok)';
            bubble.style.opacity = '0';
            bubble.style.pointerEvents = 'none';
            rts.push(performance.now() - t0);
            t0 = performance.now();
            
            if (expectedIdx === sorted.length) {
              rounds++;
              setTimeout(startRound, 300);
            }
          } else {
            bubble.style.background = 'var(--danger)';
            setTimeout(() => {
              if (bubble.style.opacity !== '0') bubble.style.background = 'rgba(255,255,255,0.08)';
            }, 200);
            // Time penalty or just accuracy drop
          }
        };
        arena.appendChild(bubble);
      });
      
      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalClicks > 0 ? correctHits / totalClicks : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default numberSortModule;
