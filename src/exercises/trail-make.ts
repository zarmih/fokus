import { ExerciseModule, BlockResult } from './contract';

const trailMakeModule: ExerciseModule = {
  manifest: {
    id: 'trail-make',
    name: 'Связь точек',
    domain: 'attention',
    skills: ['visual_scanning', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Соединяйте точки в правильном порядке. На более высоких уровнях чередуйте цифры и буквы (1-А-2-Б-3-В).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .tm-arena {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
          background: var(--surface);
          overflow: hidden;
          border-radius: 12px;
        }
        .tm-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }
        .tm-line {
          stroke: var(--line);
          stroke-width: 4;
          stroke-linecap: round;
          transition: stroke 0.3s;
        }
        .tm-nodes-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
        }
        .tm-node {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid var(--line);
          background: var(--surface);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s, background-color 0.2s, border-color 0.2s;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tm-node:active {
          transform: translate(-50%, -50%) scale(0.95);
        }
        .tm-node.active {
          background: var(--accent);
          color: var(--surface);
          border-color: var(--accent);
        }
        .tm-node.error {
          animation: tm-shake 0.3s;
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }
        @keyframes tm-shake {
          0%, 100% { transform: translate(-50%, -50%); }
          25% { transform: translate(-60%, -50%); }
          75% { transform: translate(-40%, -50%); }
        }
      </style>
      <div class="tm-arena" id="tm-arena">
        <svg class="tm-svg" id="tm-svg"></svg>
        <div class="tm-nodes-container" id="tm-nodes"></div>
      </div>
    `;

    const svgEl = el.querySelector('#tm-svg') as SVGSVGElement;
    const nodesEl = el.querySelector('#tm-nodes') as HTMLElement;
    
    let t0 = performance.now();
    let currentIdx = 0;
    let sequence: {label: string, x: number, y: number}[] = [];
    
    const isAlphanumeric = level >= 3;
    const nodeCount = Math.min(5 + level * 2, 20);
    
    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      svgEl.innerHTML = '';
      nodesEl.innerHTML = '';
      currentIdx = 0;
      sequence = [];
      
      const letters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';
      
      for (let i = 0; i < nodeCount; i++) {
        let label = '';
        if (isAlphanumeric) {
          if (i % 2 === 0) {
            label = (Math.floor(i / 2) + 1).toString();
          } else {
            label = letters[Math.floor(i / 2) % letters.length];
          }
        } else {
          label = (i + 1).toString();
        }
        
        let x = 0, y = 0;
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 200) {
          x = 10 + Math.random() * 80;
          y = 10 + Math.random() * 80;
          valid = true;
          for (let j = 0; j < sequence.length; j++) {
            const dx = sequence[j].x - x;
            const dy = sequence[j].y - y;
            // minimum distance
            if (dx * dx + dy * dy < 225) { 
              valid = false;
              break;
            }
          }
          attempts++;
        }
        sequence.push({label, x, y});
      }
      
      sequence.forEach((node, idx) => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'tm-node';
        nodeEl.style.left = node.x + '%';
        nodeEl.style.top = node.y + '%';
        nodeEl.textContent = node.label;
        
        nodeEl.onpointerdown = (e) => {
          e.preventDefault();
          handleTap(idx, nodeEl);
        };
        
        nodesEl.appendChild(nodeEl);
      });

      t0 = performance.now();
    };

    const handleTap = (idx: number, nodeEl: HTMLElement) => {
      if (isGameOver) return;
      
      if (idx === currentIdx) {
        nodeEl.classList.add('active');
        
        if (currentIdx > 0) {
          const prev = sequence[currentIdx - 1];
          const curr = sequence[currentIdx];
          
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', prev.x + '%');
          line.setAttribute('y1', prev.y + '%');
          line.setAttribute('x2', curr.x + '%');
          line.setAttribute('y2', curr.y + '%');
          line.setAttribute('class', 'tm-line');
          svgEl.appendChild(line);
        }
        
        currentIdx++;
        correct++;
        rounds++;
        rts.push(performance.now() - t0);
        t0 = performance.now();
        
        if (currentIdx >= sequence.length) {
          setTimeout(startRound, 400);
        }
      } else if (idx > currentIdx) {
        nodeEl.classList.remove('error');
        // trigger reflow
        void nodeEl.offsetWidth;
        nodeEl.classList.add('error');
        
        rounds++;
        rts.push(performance.now() - t0);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default trailMakeModule;
