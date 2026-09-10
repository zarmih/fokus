import { ExerciseModule, BlockResult } from './contract';

const balanceScaleModule: ExerciseModule = {
  manifest: {
    id: 'balance-scale',
    name: 'Весы',
    domain: 'logic',
    skills: ['estimation', 'logical_reasoning'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите, какая сторона весов перевесит (Масса × Расстояние).'
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
          gap: 60px;
        }
        .bs-scale {
          position: relative;
          width: 300px;
          height: 60px;
        }
        .bs-beam {
          position: absolute;
          top: 20px;
          left: 0;
          width: 100%;
          height: 8px;
          background: var(--text);
          border-radius: 4px;
        }
        .bs-fulcrum {
          position: absolute;
          top: 28px;
          left: 140px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 20px solid var(--text);
        }
        .bs-weight {
          position: absolute;
          top: -20px; /* rests on beam */
          width: 40px;
          height: 40px;
          background: var(--accent);
          border-radius: 8px;
          color: #fff;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateX(-50%);
        }
        .bs-controls {
          display: flex;
          gap: 40px;
        }
        .bs-btn {
          width: 140px;
          height: 80px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .bs-btn:active { transform: scale(0.95); }
      </style>
      <div class="bs-arena">
        <div class="bs-scale">
          <div class="bs-beam" id="bs-beam"></div>
          <div class="bs-fulcrum"></div>
          <div class="bs-weight" id="bs-w-left"></div>
          <div class="bs-weight" id="bs-w-right"></div>
        </div>
        <div class="bs-controls">
          <button class="bs-btn" id="bs-btn-left">Левая</button>
          <button class="bs-btn" id="bs-btn-right">Правая</button>
        </div>
      </div>
    `;

    const beam = el.querySelector('#bs-beam') as HTMLElement;
    const wLeft = el.querySelector('#bs-w-left') as HTMLElement;
    const wRight = el.querySelector('#bs-w-right') as HTMLElement;
    const btnLeft = el.querySelector('#bs-btn-left') as HTMLElement;
    const btnRight = el.querySelector('#bs-btn-right') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsLeft = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      beam.style.transform = 'rotate(0deg)';
      
      let wl, dl, wr, dr;
      let torqueL, torqueR;

      // Ensure they are never equal
      do {
        wl = Math.floor(Math.random() * 5) + 1; // mass 1-5
        dl = Math.floor(Math.random() * 4) + 1; // dist 1-4
        
        wr = Math.floor(Math.random() * 5) + 1;
        dr = Math.floor(Math.random() * 4) + 1;

        torqueL = wl * dl;
        torqueR = wr * dr;
      } while (torqueL === torqueR);

      targetIsLeft = torqueL > torqueR;

      wLeft.textContent = wl.toString();
      wRight.textContent = wr.toString();

      // scale: center is 150. Max dist is 4 = 120px. So 1 unit = 30px.
      const pxPerUnit = 35;
      const center = 150;

      wLeft.style.left = `${center - (dl * pxPerUnit)}px`;
      wRight.style.left = `${center + (dr * pxPerUnit)}px`;

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = choseLeft === targetIsLeft;

      if (isCorrect) {
        correct++;
        if (choseLeft) btnLeft.style.borderColor = 'var(--ok)';
        else btnRight.style.borderColor = 'var(--ok)';
      } else {
        if (choseLeft) btnLeft.style.borderColor = 'var(--danger)';
        else btnRight.style.borderColor = 'var(--danger)';
      }

      // animate beam
      beam.style.transition = 'transform 0.3s ease-in';
      beam.style.transform = targetIsLeft ? 'rotate(-10deg)' : 'rotate(10deg)';

      setTimeout(() => {
        if (isGameOver) return;
        beam.style.transition = 'none';
        startRound();
      }, 800);
    };

    btnLeft.onclick = () => handleAns(true);
    btnRight.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default balanceScaleModule;
