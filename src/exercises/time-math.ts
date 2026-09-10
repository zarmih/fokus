import { ExerciseModule, BlockResult } from './contract';

const timeMathModule: ExerciseModule = {
  manifest: {
    id: 'time-math',
    name: 'Хронометр',
    domain: 'logic',
    skills: ['logical_reasoning', 'mental_calculation'],
    metricModel: 'logic-correctness',
    instruction: 'Определите ИТОГОВОЕ время после прибавления или вычитания указанных часов и минут.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .tm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .tm-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: rgba(255,255,255,0.05);
          padding: 32px 48px;
          border-radius: 24px;
          border: 2px solid var(--line);
        }
        .tm-start {
          font-size: 48px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .tm-delta {
          font-size: 24px;
          font-weight: 600;
          color: var(--accent);
        }
        .tm-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .tm-btn {
          padding: 16px 32px;
          font-size: 28px;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .tm-btn:active { transform: scale(0.95); }
      </style>
      <div class="tm-arena">
        <div class="tm-display" id="tm-display">
          <div class="tm-start" id="tm-start"></div>
          <div class="tm-delta" id="tm-delta"></div>
        </div>
        <div class="tm-controls" id="tm-controls"></div>
      </div>
    `;

    const startEl = el.querySelector('#tm-start') as HTMLElement;
    const deltaEl = el.querySelector('#tm-delta') as HTMLElement;
    const controls = el.querySelector('#tm-controls') as HTMLElement;

    let t0 = performance.now();
    let targetAns = '';
    let phase = 'input';

    const formatTime = (totalMin: number) => {
      let h = Math.floor(totalMin / 60) % 24;
      if (h < 0) h += 24;
      let m = totalMin % 60;
      if (m < 0) m += 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const startH = Math.floor(Math.random() * 24);
      const startM = Math.floor(Math.random() * 60);
      const startTotal = startH * 60 + startM;

      startEl.textContent = formatTime(startTotal);

      // Delta
      const isAdd = Math.random() > 0.5;
      const maxDeltaH = level > 4 ? 12 : 3;
      const deltaH = Math.floor(Math.random() * maxDeltaH);
      const deltaM = Math.floor(Math.random() * 60);
      
      const deltaTotal = deltaH * 60 + deltaM;
      
      let deltaStr = isAdd ? '+ ' : '- ';
      if (deltaH > 0) deltaStr += `${deltaH} ч `;
      if (deltaM > 0 || deltaH === 0) deltaStr += `${deltaM} мин`;
      
      deltaEl.textContent = deltaStr;
      deltaEl.style.color = isAdd ? 'var(--ok)' : 'var(--danger)';

      const ansTotal = isAdd ? startTotal + deltaTotal : startTotal - deltaTotal;
      targetAns = formatTime(ansTotal);

      controls.innerHTML = '';
      
      const options = [targetAns];
      while (options.length < 4) {
        // Generate plausible fakes (e.g. forgot carry over hour)
        const fakeTotal = ansTotal + (Math.floor(Math.random() * 120) - 60);
        const fakeStr = formatTime(fakeTotal);
        if (!options.includes(fakeStr)) options.push(fakeStr);
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'tm-btn';
        btn.textContent = opt;
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (opt === targetAns) {
            correct++;
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
          } else {
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            
            // find correct and highlight
            Array.from(controls.children).forEach((child: any) => {
              if (child.textContent === targetAns) {
                child.style.borderColor = 'var(--ok)';
              }
            });
          }

          setTimeout(startRound, 1200);
        };
        controls.appendChild(btn);
      });

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 5000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default timeMathModule;
