import { ExerciseModule, BlockResult } from './contract';

const gateTapModule: ExerciseModule = {
  manifest: {
    id: 'gate-tap',
    name: 'Тап у ворот',
    domain: 'attention',
    skills: ['sustained_attention', 'response_inhibition' as any],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте на цель только тогда, когда ворота ОТКРЫТЫ. Штраф за пропуск или нажатие в закрытые ворота.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // Level settings
    let openWindowMs = Math.max(400, 1000 - level * 100);
    let cycleMs = Math.max(800, 2000 - level * 150);
    let falseOpenProb = Math.min(0.5, 0.1 + level * 0.05);

    el.innerHTML = `
      <style>
        .gt-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .gt-gate-container {
          position: relative;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          border: 4px solid var(--line, #444);
        }
        .gt-target {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--accent, #3b82f6);
          cursor: pointer;
          transition: transform 0.1s, opacity 0.2s;
          opacity: 0;
          pointer-events: none;
        }
        .gt-target.active {
          opacity: 1;
          pointer-events: auto;
        }
        .gt-target:active {
          transform: scale(0.9);
        }
        .gt-gate {
          position: absolute;
          top: 0;
          width: 50%;
          height: 100%;
          background: #334155;
          transition: transform 0.15s ease-out;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gt-gate.left {
          left: 0;
          border-right: 2px solid #1e293b;
        }
        .gt-gate.right {
          right: 0;
          border-left: 2px solid #1e293b;
        }
        .gt-gate-container.open .gt-gate.left {
          transform: translateX(-100%);
        }
        .gt-gate-container.open .gt-gate.right {
          transform: translateX(100%);
        }
        .gt-status {
          font-size: 24px;
          font-weight: bold;
          height: 32px;
        }
        .gt-btn-tap {
           padding: 16px 32px;
           font-size: 24px;
           background: var(--accent, #3b82f6);
           color: white;
           border: none;
           border-radius: 12px;
           cursor: pointer;
           transition: transform 0.1s, filter 0.1s;
        }
        .gt-btn-tap:active {
           transform: scale(0.95);
        }
      </style>
      <div class="gt-arena">
        <div class="gt-status" id="gt-status">Ожидайте...</div>
        <div class="gt-gate-container" id="gt-container">
          <div class="gt-gate left"></div>
          <div class="gt-gate right"></div>
          <div class="gt-target" id="gt-target"></div>
        </div>
        <button class="gt-btn-tap" id="gt-btn">ТАП</button>
      </div>
    `;

    const container = el.querySelector('#gt-container') as HTMLElement;
    const target = el.querySelector('#gt-target') as HTMLElement;
    const status = el.querySelector('#gt-status') as HTMLElement;
    const btn = el.querySelector('#gt-btn') as HTMLElement;

    let isOpen = false;
    let hasTappedThisCycle = false;
    let tOpen = 0;
    let cycleTimeout: any = null;
    let closeTimeout: any = null;
    let validTarget = false;

    const showStatus = (text: string, color: string) => {
      status.textContent = text;
      status.style.color = color;
      setTimeout(() => {
        if (status.textContent === text) status.textContent = '';
      }, 1000);
    };

    const onTap = () => {
      if (isGameOver) return;
      if (hasTappedThisCycle) return; // Prevent multiple taps
      hasTappedThisCycle = true;
      
      rounds++;

      if (isOpen && validTarget) {
        correct++;
        rts.push(performance.now() - tOpen);
        showStatus('Отлично!', 'var(--ok, #10b981)');
      } else {
        rts.push(performance.now() - tOpen);
        showStatus('Ошибка!', 'var(--danger, #ef4444)');
      }
    };

    target.onclick = onTap;
    btn.onclick = onTap;

    const startCycle = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      // Check if missed previous valid target
      if (!hasTappedThisCycle && validTarget && isOpen) {
        rounds++;
        showStatus('Пропуск!', 'var(--danger, #ef4444)');
      }

      isOpen = false;
      validTarget = false;
      hasTappedThisCycle = false;
      container.classList.remove('open');
      target.classList.remove('active');

      const nextDelay = 500 + Math.random() * (cycleMs - 500);
      
      cycleTimeout = setTimeout(() => {
        if (isGameOver) return;
        
        isOpen = true;
        container.classList.add('open');
        tOpen = performance.now();
        
        validTarget = Math.random() > falseOpenProb;
        if (validTarget) {
          target.classList.add('active');
        }

        closeTimeout = setTimeout(() => {
          if (!isGameOver) {
             isOpen = false;
             container.classList.remove('open');
             target.classList.remove('active');
             setTimeout(startCycle, 300);
          }
        }, openWindowMs);
        
      }, nextDelay);
    };

    startCycle();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(cycleTimeout);
      clearTimeout(closeTimeout);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : cycleMs;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(cycleTimeout);
      clearTimeout(closeTimeout);
    };
  }
};

export default gateTapModule;
