import { ExerciseModule, BlockResult } from '../contract';
import { TwinSearchEngine, TwinSearchState } from './engine';

const twinSearchModule: ExerciseModule = {
  manifest: {
    id: 'twin-search',
    name: 'Поиск Близнецов',
    domain: 'attention',
    skills: ['selective_attention', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Среди всех фигур найдите две абсолютно одинаковые.'
  },
  
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let timeoutId: any;
    
    const engine = new TwinSearchEngine();
    
    el.innerHTML = `
      <style>
        .ts-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .ts-grid {
          display: grid;
          gap: 12px;
          padding: 16px;
        }
        .ts-cell {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          background: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.1s;
        }
        .ts-cell.selected {
          outline: 3px solid #38bdf8;
          outline-offset: -2px;
        }
      </style>
      <div class="ts-arena">
        <div class="ts-grid" id="ts-grid"></div>
      </div>
    `;
    
    const grid = el.querySelector('#ts-grid') as HTMLElement;
    let t0 = performance.now();
    let currentState: TwinSearchState | null = null;
    let selectedIds: number[] = [];
    
    const getSvg = (shape: string, color: string, pattern: string) => {
      const isOutline = pattern === 'outline';
      const fill = isOutline ? 'none' : color;
      const stroke = color;
      const strokeW = isOutline ? '4' : '0';
      let inner = '';
      if (shape === 'circle') inner = `<circle cx="28" cy="28" r="16" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`;
      if (shape === 'square') inner = `<rect x="12" y="12" width="32" height="32" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" rx="4"/>`;
      if (shape === 'triangle') inner = `<polygon points="28,10 46,40 10,40" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>`;
      if (shape === 'diamond') inner = `<polygon points="28,10 46,28 28,46 10,28" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>`;
      return `<svg width="56" height="56">${inner}</svg>`;
    };
    
    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      currentState = engine.start(level);
      selectedIds = [];
      const cols = Math.ceil(Math.sqrt(currentState.items.length));
      grid.style.gridTemplateColumns = `repeat(${cols}, 56px)`;
      
      grid.innerHTML = currentState.items.map(item => `
        <div class="ts-cell" data-id="${item.id}">
          ${getSvg(item.shape, item.color, item.pattern)}
        </div>
      `).join('');
      
      t0 = performance.now();
      
      const cells = grid.querySelectorAll('.ts-cell');
      cells.forEach(cell => {
        (cell as HTMLElement).onclick = () => {
          if (!currentState || selectedIds.length >= 2) return;
          const id = parseInt((cell as HTMLElement).dataset.id!);
          
          if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter(x => x !== id);
            cell.classList.remove('selected');
            return;
          }
          
          selectedIds.push(id);
          cell.classList.add('selected');
          
          if (selectedIds.length === 2) {
            const res = engine.submit(currentState, selectedIds);
            rounds++;
            rts.push(performance.now() - t0);
            if (res.accuracy === 1) correct++;
            
            cells.forEach(c => {
              const cid = parseInt((c as HTMLElement).dataset.id!);
              if (selectedIds.includes(cid)) {
                (c as HTMLElement).style.background = res.accuracy === 1 ? '#10b981' : '#ef4444';
              }
              if (currentState!.twinIds.includes(cid) && res.accuracy === 0) {
                (c as HTMLElement).style.outline = '3px solid #10b981';
                (c as HTMLElement).style.outlineOffset = '-2px';
              }
            });
            
            currentState = null;
            timeoutId = setTimeout(startRound, 600);
          }
        };
      });
    };
    
    startRound();
    
    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };
    
    return () => { 
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default twinSearchModule;
