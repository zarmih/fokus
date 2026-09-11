import { ExerciseModule, BlockResult } from '../contract';
import { SymbolBindEngine, SymbolBindState } from './engine';

const symbolBindModule: ExerciseModule = {
  manifest: {
    id: 'symbol-bind',
    name: 'Связка Символов',
    domain: 'memory',
    skills: ['visual_memory', 'recall'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните пары "символ-число". Затем выберите правильное число для указанного символа.'
  },
  
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let timeoutId: any;
    
    const engine = new SymbolBindEngine();
    
    el.innerHTML = `
      <style>
        .sb-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .sb-pairs {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
        }
        .sb-pair {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #334155;
          padding: 12px 24px;
          border-radius: 12px;
        }
        .sb-symbol { font-size: 32px; color: #38bdf8; }
        .sb-number { font-size: 24px; font-weight: bold; color: #f8fafc; }
        .sb-target { font-size: 64px; color: #38bdf8; margin: 32px 0; }
        .sb-options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .sb-btn {
          padding: 16px 32px;
          font-size: 24px;
          background: #475569;
          color: white;
          border-radius: 12px;
          cursor: pointer;
          text-align: center;
          transition: 0.2s;
        }
        .sb-btn:active { transform: scale(0.95); }
      </style>
      <div class="sb-arena" id="sb-arena"></div>
    `;
    
    const arena = el.querySelector('#sb-arena') as HTMLElement;
    let t0 = performance.now();
    let currentState: SymbolBindState | null = null;
    
    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      currentState = engine.start(level);
      
      arena.innerHTML = `
        <div class="sb-pairs">
          ${currentState.pairs.map(p => `
            <div class="sb-pair">
              <div class="sb-symbol">${p.symbol}</div>
              <div class="sb-number">${p.number}</div>
            </div>
          `).join('')}
        </div>
      `;
      
      const memorizeTime = Math.max(1500, 4000 - level * 200);
      
      timeoutId = setTimeout(() => {
        if (isGameOver) return;
        arena.innerHTML = `
          <div class="sb-target">${currentState!.targetSymbol}</div>
          <div class="sb-options">
            ${currentState!.options.map(opt => `
              <div class="sb-btn" data-val="${opt}">${opt}</div>
            `).join('')}
          </div>
        `;
        
        t0 = performance.now();
        
        const btns = arena.querySelectorAll('.sb-btn');
        btns.forEach(btn => {
          (btn as HTMLElement).onclick = () => {
            if (!currentState) return;
            const ans = parseInt((btn as HTMLElement).dataset.val!);
            const res = engine.submit(currentState, ans);
            
            rounds++;
            rts.push(performance.now() - t0);
            if (res.accuracy === 1) correct++;
            
            if (res.accuracy === 1) {
              (btn as HTMLElement).style.background = '#10b981';
            } else {
              (btn as HTMLElement).style.background = '#ef4444';
              // highlight correct
              btns.forEach(b => {
                if (parseInt((b as HTMLElement).dataset.val!) === currentState!.correctAnswer) {
                  (b as HTMLElement).style.background = '#10b981';
                }
              });
            }
            
            currentState = null;
            timeoutId = setTimeout(startRound, 600);
          };
        });
      }, memorizeTime);
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

export default symbolBindModule;
