import { ExerciseModule, BlockResult } from './contract';

const balanceScalesModule: ExerciseModule = {
  manifest: {
    id: 'balance-scales',
    name: 'Равновесие',
    domain: 'logic',
    skills: ['logical_reasoning', 'pattern_recognition'],
    metricModel: 'logic-correctness',
    instruction: 'Изучите весы и определите, какая фигура тяжелее.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .bs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .bs-scales {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .bs-scale {
          display: flex;
          align-items: flex-end;
          gap: 40px;
          padding-bottom: 4px;
          border-bottom: 4px solid var(--line);
          position: relative;
          width: 140px;
          justify-content: center;
          transition: transform 0.3s;
        }
        .bs-scale::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 16px solid var(--line);
        }
        .bs-scale.tilt-left { transform: rotate(-10deg); }
        .bs-scale.tilt-right { transform: rotate(10deg); }
        .bs-scale.tilt-even { transform: rotate(0deg); }
        .bs-shape {
          font-size: 32px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
        .bs-controls {
          display: flex;
          gap: 16px;
        }
        .bs-btn {
          font-size: 40px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          width: 80px;
          height: 80px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bs-btn:active { transform: scale(0.9); }
        .bs-question {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
        }
      </style>
      <div class="bs-arena">
        <div class="bs-scales" id="bs-scales"></div>
        <div class="bs-question">Кто тяжелее?</div>
        <div class="bs-controls" id="bs-controls"></div>
      </div>
    `;

    const scalesContainer = el.querySelector('#bs-scales') as HTMLElement;
    const controls = el.querySelector('#bs-controls') as HTMLElement;

    const shapes = ['🔴', '🟦', '⭐', '🔺', '🟩'];
    let currentTarget = '';
    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      scalesContainer.innerHTML = '';
      controls.innerHTML = '';
      
      const sh = [...shapes].sort(() => Math.random() - 0.5).slice(0, 3);
      // a > b > c
      const a = sh[0]; const b = sh[1]; const c = sh[2];

      // Scale 1: a vs b -> tilt-left
      // Scale 2: b vs c -> tilt-left
      const sc1 = document.createElement('div');
      sc1.className = 'bs-scale tilt-left';
      sc1.innerHTML = `<div class="bs-shape">${a}</div><div class="bs-shape">${b}</div>`;
      
      const sc2 = document.createElement('div');
      sc2.className = 'bs-scale tilt-left';
      sc2.innerHTML = `<div class="bs-shape">${b}</div><div class="bs-shape">${c}</div>`;

      // shuffle order of scales
      if (Math.random() > 0.5) {
        scalesContainer.appendChild(sc1); scalesContainer.appendChild(sc2);
      } else {
        scalesContainer.appendChild(sc2); scalesContainer.appendChild(sc1);
      }

      // We ask A vs C
      const options = Math.random() > 0.5 ? [a, c] : [c, a];
      currentTarget = a; // A is heaviest

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'bs-btn';
        btn.textContent = opt;
        btn.onclick = () => {
          rounds++;
          if (opt === currentTarget) correct++;
          rts.push(performance.now() - t0);
          startRound();
        };
        controls.appendChild(btn);
      });

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default balanceScalesModule;
