import { ExerciseModule, BlockResult } from './contract';

const numberSeriesModule: ExerciseModule = {
  manifest: {
    id: 'number-series',
    name: 'Ряд',
    domain: 'logic',
    skills: ['pattern_recognition', 'logical_reasoning'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите закономерность числового ряда и выберите пропущенное число.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ns-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .ns-series {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .ns-num {
          font-size: 40px;
          font-weight: bold;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
        }
        .ns-num.missing {
          background: transparent;
          border-style: dashed;
          border-color: var(--text);
          color: var(--accent);
        }
        .ns-controls {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .ns-btn {
          width: 100px;
          height: 80px;
          font-size: 28px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .ns-btn:active { transform: scale(0.95); }
      </style>
      <div class="ns-arena">
        <div class="ns-series" id="ns-series"></div>
        <div class="ns-controls" id="ns-controls"></div>
      </div>
    `;

    const seriesEl = el.querySelector('#ns-series') as HTMLElement;
    const controlsEl = el.querySelector('#ns-controls') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetAns = 0;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const type = Math.floor(Math.random() * (level > 3 ? 3 : 2)); 
      // 0: Add const, 1: Mult const, 2: Add increasing
      let seq: number[] = [];
      let start = Math.floor(Math.random() * 10) + 1;
      
      if (type === 0) {
        const step = Math.floor(Math.random() * 8) + 2;
        for (let i=0; i<5; i++) seq.push(start + i * step);
      } else if (type === 1) {
        start = Math.floor(Math.random() * 4) + 1;
        const mult = Math.floor(Math.random() * 2) + 2; // 2 or 3
        for (let i=0; i<5; i++) seq.push(start * Math.pow(mult, i));
      } else {
        const dStep = Math.floor(Math.random() * 3) + 1;
        let cur = start;
        for (let i=0; i<5; i++) {
          seq.push(cur);
          cur += (i+1)*dStep;
        }
      }

      const missingIdx = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      targetAns = seq[missingIdx];

      seriesEl.innerHTML = seq.map((num, i) => {
        if (i === missingIdx) return `<div class="ns-num missing">?</div>`;
        return `<div class="ns-num">${num}</div>`;
      }).join('');

      // Generate options
      let opts = [targetAns];
      while (opts.length < 4) {
        let fake = targetAns + (Math.floor(Math.random() * 10) - 5);
        if (fake !== targetAns && fake > 0 && !opts.includes(fake)) {
          opts.push(fake);
        }
      }
      opts.sort((a,b) => a - b);

      controlsEl.innerHTML = opts.map(o => `<button class="ns-btn">${o}</button>`).join('');

      const btns = controlsEl.querySelectorAll('.ns-btn');
      btns.forEach(b => {
        (b as HTMLElement).onclick = () => handleAns(parseInt(b.textContent || '0'), b as HTMLElement);
      });

      t0 = performance.now();
    };

    const handleAns = (ans: number, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ans === targetAns;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
        // fill missing
        const missingEl = seriesEl.querySelector('.missing');
        if (missingEl) missingEl.textContent = targetAns.toString();
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 600);
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

export default numberSeriesModule;
