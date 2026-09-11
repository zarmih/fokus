import { ExerciseModule, BlockResult } from '../contract';
import { RuleSliderEngine, RuleSliderState } from './engine';

const ruleSliderModule: ExerciseModule = {
  manifest: {
    id: 'rule-slider',
    name: 'Скользящее Правило',
    domain: 'flexibility',
    skills: ['rule_switching', 'task_switching'],
    metricModel: 'speed-accuracy',
    instruction: 'Подберите подходящую карту к центральной. Правило (По Форме / По Количеству) меняется каждый раунд.'
  },
  
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let timeoutId: any;
    
    const engine = new RuleSliderEngine();
    
    el.innerHTML = `
      <style>
        .rs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .rs-rule {
          font-size: 32px;
          font-weight: bold;
          padding: 12px 24px;
          border-radius: 12px;
          background: #475569;
          color: white;
          text-transform: uppercase;
        }
        .rs-rule.shape { background: #3b82f6; }
        .rs-rule.count { background: #f59e0b; }
        
        .rs-card {
          width: 120px;
          height: 160px;
          background: white;
          border-radius: 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          box-sizing: border-box;
          color: #334155;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          transition: 0.2s;
        }
        
        .rs-options {
          display: flex;
          gap: 16px;
        }
        .rs-option-btn { cursor: pointer; }
        .rs-option-btn:active { transform: scale(0.95); }
        
        .rs-shape-icon { width: 32px; height: 32px; }
      </style>
      <div class="rs-arena" id="rs-arena"></div>
    `;
    
    const arena = el.querySelector('#rs-arena') as HTMLElement;
    let t0 = performance.now();
    let currentState: RuleSliderState | null = null;
    
    const getSvg = (shape: string) => {
      if (shape === 'circle') return '<svg class="rs-shape-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>';
      if (shape === 'square') return '<svg class="rs-shape-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" fill="currentColor" rx="2"/></svg>';
      if (shape === 'triangle') return '<svg class="rs-shape-icon" viewBox="0 0 24 24"><polygon points="12,2 22,20 2,20" fill="currentColor"/></svg>';
      if (shape === 'diamond') return '<svg class="rs-shape-icon" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="currentColor"/></svg>';
      return '';
    };
    
    const renderCard = (card: any, isBtn = false, index = -1) => {
      let items = '';
      for (let i = 0; i < card.count; i++) {
        items += getSvg(card.shape);
      }
      return `<div class="rs-card ${isBtn ? 'rs-option-btn' : ''}" ${isBtn ? `data-idx="${index}"` : ''}>${items}</div>`;
    };
    
    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      currentState = engine.start(level);
      
      const ruleText = currentState.rule === 'SHAPE' ? 'ПО ФОРМЕ' : 'ПО КОЛИЧЕСТВУ';
      const ruleClass = currentState.rule === 'SHAPE' ? 'shape' : 'count';
      
      arena.innerHTML = `
        <div class="rs-rule ${ruleClass}">${ruleText}</div>
        <div style="transform: scale(1.2);">${renderCard(currentState.center)}</div>
        <div class="rs-options">
          ${currentState.options.map((opt, i) => renderCard(opt, true, i)).join('')}
        </div>
      `;
      
      t0 = performance.now();
      
      const btns = arena.querySelectorAll('.rs-option-btn');
      btns.forEach(btn => {
        (btn as HTMLElement).onclick = () => {
          if (!currentState) return;
          const idx = parseInt((btn as HTMLElement).dataset.idx!);
          const res = engine.submit(currentState, idx);
          
          rounds++;
          rts.push(performance.now() - t0);
          if (res.accuracy === 1) correct++;
          
          if (res.accuracy === 1) {
            (btn as HTMLElement).style.background = '#10b981';
            (btn as HTMLElement).style.color = 'white';
          } else {
            (btn as HTMLElement).style.background = '#ef4444';
            (btn as HTMLElement).style.color = 'white';
            const correctBtn = btns[currentState.correctIndex] as HTMLElement;
            correctBtn.style.background = '#10b981';
            correctBtn.style.color = 'white';
          }
          
          currentState = null;
          timeoutId = setTimeout(startRound, 600);
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

export default ruleSliderModule;
