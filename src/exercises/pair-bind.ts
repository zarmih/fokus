import { ExerciseModule, BlockResult } from './contract';

const pairBindModule: ExerciseModule = {
  manifest: {
    id: 'pair-bind',
    name: 'Связь пар',
    domain: 'memory',
    skills: ['working_memory', 'recall'],
    metricModel: 'memory-span',
    instruction: 'Запомните, какое слово или число соответствует каждому символу. Затем выберите правильный вариант.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .pb-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          padding: 20px;
        }
        .pb-pairs-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }
        .pb-pair {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          padding: 16px;
          min-width: 100px;
        }
        .pb-symbol {
          font-size: 40px;
          margin-bottom: 8px;
        }
        .pb-label {
          font-size: 20px;
          font-weight: bold;
          color: var(--text);
        }
        .pb-test-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
        }
        .pb-test-symbol {
          font-size: 80px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 20px;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pb-options {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pb-btn {
          padding: 12px 24px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .pb-btn:active {
          transform: scale(0.95);
        }
        .pb-status {
          font-size: 18px;
          color: var(--text);
          opacity: 0.7;
          min-height: 24px;
        }
      </style>
      <div class="pb-arena">
        <div id="pb-status" class="pb-status"></div>
        <div id="pb-content"></div>
      </div>
    `;

    const statusEl = el.querySelector('#pb-status') as HTMLElement;
    const contentEl = el.querySelector('#pb-content') as HTMLElement;

    let t0 = performance.now();
    let phase = 'encode'; // encode -> test
    let currentPairs: {symbol: string, label: string}[] = [];
    
    const SYMBOLS = ['★', '♠', '♣', '♥', '♦', '♫', '☼', '☽', '☁', '⚡', '✈', '❄', '❀', '✿', '❁', '❂'];
    const LABELS = ['ДОМ', 'ЛЕС', 'КОТ', 'СОН', 'МИР', 'ВЕК', 'ШАГ', 'ЛЕД', 'МАК', 'НОЖ', 'ЗУБ', 'МЯЧ', 'ЛУК', 'СЫР', 'СОК'];

    const getPairCount = () => {
      return Math.min(2 + Math.floor(level / 2), 7);
    };

    const startEncode = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'encode';
      statusEl.textContent = 'Запомните пары...';
      
      const count = getPairCount();
      const pSyms = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, count);
      const pLabs = [...LABELS].sort(() => Math.random() - 0.5).slice(0, count);
      
      currentPairs = pSyms.map((s, i) => ({symbol: s, label: pLabs[i]}));
      
      contentEl.innerHTML = `
        <div class="pb-pairs-grid">
          ${currentPairs.map(p => `
            <div class="pb-pair">
              <div class="pb-symbol">${p.symbol}</div>
              <div class="pb-label">${p.label}</div>
            </div>
          `).join('')}
        </div>
      `;
      
      setTimeout(startTest, 2000 + count * 1000);
    };

    const startTest = () => {
      if (isGameOver) return;
      phase = 'test';
      statusEl.textContent = 'Какой текст был у этого символа?';
      
      const targetPair = currentPairs[Math.floor(Math.random() * currentPairs.length)];
      
      let opts = [targetPair.label];
      // Generate options from current pairs, then random labels if needed
      let pool = currentPairs.map(p => p.label).filter(l => l !== targetPair.label);
      pool = pool.concat([...LABELS].filter(l => !opts.includes(l) && !pool.includes(l)));
      
      while(opts.length < Math.min(4, Math.max(2, currentPairs.length))) {
        opts.push(pool.shift()!);
      }
      opts.sort(() => Math.random() - 0.5);
      
      contentEl.innerHTML = `
        <div class="pb-test-area">
          <div class="pb-test-symbol">${targetPair.symbol}</div>
          <div class="pb-options">
            ${opts.map(o => `
              <button class="pb-btn" data-correct="${o === targetPair.label}">
                ${o}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      
      t0 = performance.now();
      
      contentEl.querySelectorAll('.pb-btn').forEach(btn => {
        (btn as HTMLElement).onclick = () => {
          if (phase !== 'test' || isGameOver) return;
          phase = 'feedback';
          const isCorrect = btn.getAttribute('data-correct') === 'true';
          
          rounds++;
          rts.push(performance.now() - t0);
          
          if (isCorrect) {
            correct++;
            (btn as HTMLElement).style.borderColor = 'var(--ok)';
            (btn as HTMLElement).style.background = 'var(--ok)';
            (btn as HTMLElement).style.color = 'var(--surface)';
          } else {
            (btn as HTMLElement).style.borderColor = 'var(--danger)';
            (btn as HTMLElement).style.background = 'var(--danger)';
            (btn as HTMLElement).style.color = 'var(--surface)';
          }
          
          setTimeout(startEncode, 1000);
        };
      });
    };

    startEncode();

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

export default pairBindModule;
