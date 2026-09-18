import { ExerciseModule, BlockResult } from './contract';

const symbolStreamModule: ExerciseModule = {
  manifest: {
    id: 'symbol-stream',
    name: 'Поток символов',
    domain: 'attention',
    skills: ['sustained_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте на экран ТОЛЬКО тогда, когда появляется цифра 7.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ss-arena {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          cursor: pointer;
          user-select: none;
        }
        .ss-symbol {
          font-size: 8rem;
          font-weight: bold;
          color: var(--text-primary, #fff);
          opacity: 0;
          transform: scale(0.5);
          transition: transform 0.1s, opacity 0.1s;
        }
        .ss-symbol.show {
          opacity: 1;
          transform: scale(1);
        }
        .ss-feedback {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ss-feedback.success { background: var(--success, rgba(0,255,0,0.2)); opacity: 1; }
        .ss-feedback.error { background: var(--danger, rgba(255,0,0,0.2)); opacity: 1; }
      </style>
      <div class="ss-arena" id="ss-arena">
        <div class="ss-feedback" id="ss-feedback"></div>
        <div class="ss-symbol" id="ss-symbol"></div>
      </div>
    `;

    const arena = el.querySelector('#ss-arena') as HTMLElement;
    const symbolEl = el.querySelector('#ss-symbol') as HTMLElement;
    const feedbackEl = el.querySelector('#ss-feedback') as HTMLElement;

    let currentSymbol = '';
    let isTarget = false;
    let hasResponded = false;
    let t0 = 0;
    let showTimeout: any;
    let hideTimeout: any;
    let nextTimeout: any;

    const symbols = ['1', '2', '3', '4', '5', '6', '8', '9', 'A', 'B', 'C', 'E', 'X', 'Z'];
    const targetSymbol = '7';

    const showFeedback = (type: 'success' | 'error') => {
      feedbackEl.className = `ss-feedback ${type}`;
      setTimeout(() => {
        if (!isGameOver) feedbackEl.className = 'ss-feedback';
      }, 300);
    };

    const nextRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      hasResponded = false;
      symbolEl.classList.remove('show');
      
      nextTimeout = setTimeout(() => {
        if (isGameOver) return;
        
        // 30% chance for target
        isTarget = Math.random() < 0.3;
        currentSymbol = isTarget ? targetSymbol : symbols[Math.floor(Math.random() * symbols.length)];
        
        symbolEl.textContent = currentSymbol;
        symbolEl.classList.add('show');
        t0 = performance.now();
        
        hideTimeout = setTimeout(() => {
          if (isGameOver) return;
          
          if (!hasResponded) {
            rounds++;
            if (isTarget) {
              // Missed target
              rts.push(1000);
              showFeedback('error');
            } else {
              // Correct rejection
              correct++;
              rts.push(0);
            }
          }
          nextRound();
        }, 1000 - Math.min(level * 20, 400)); // Gets faster with level
      }, 500);
    };

    arena.onpointerdown = (e) => {
      e.preventDefault();
      if (isGameOver || hasResponded || !symbolEl.classList.contains('show')) return;
      
      hasResponded = true;
      rounds++;
      
      if (isTarget) {
        correct++;
        rts.push(performance.now() - t0);
        showFeedback('success');
      } else {
        rts.push(1000);
        showFeedback('error');
      }
      
      symbolEl.classList.remove('show');
      clearTimeout(hideTimeout);
      setTimeout(nextRound, 300);
    };

    nextRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.filter(r => r > 0).length > 0 ? rts.filter(r => r > 0).reduce((a,b)=>a+b,0)/rts.filter(r => r > 0).length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }
};

export default symbolStreamModule;
