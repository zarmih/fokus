import { ExerciseModule, BlockResult } from './contract';

const haloTraceModule: ExerciseModule = {
  manifest: {
    id: 'halo-trace',
    name: 'След ореола',
    domain: 'memory',
    skills: ['spatial_memory', 'sequential_memory' as any],
    metricModel: 'sequence-accuracy' as any,
    instruction: 'Запомните последовательность вспыхивающих ореолов и повторите её.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // level logic
    let span = Math.max(3, 2 + Math.floor(level / 2));
    let gridSize = level < 3 ? 3 : (level < 6 ? 4 : 5); // 3x3, 4x4, 5x5
    let flashTime = Math.max(200, 600 - level * 50);

    el.innerHTML = `
      <style>
        .ht-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .ht-grid {
          display: grid;
          gap: 12px;
        }
        .ht-pad {
          width: 60px;
          height: 60px;
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--line, #333);
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.1s, transform 0.1s, box-shadow 0.1s;
        }
        .ht-pad.halo {
          border-color: var(--accent, #3b82f6);
          box-shadow: 0 0 15px var(--accent, #3b82f6);
          background: rgba(59, 130, 246, 0.2);
        }
        .ht-pad.correct { background: var(--ok, #10b981); border-color: var(--ok, #10b981); }
        .ht-pad.wrong { background: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }
        .ht-pad:active { transform: scale(0.9); }
        .ht-msg { font-size: 24px; font-weight: bold; height: 32px; }
      </style>
      <div class="ht-arena">
        <div class="ht-msg" id="ht-msg"></div>
        <div class="ht-grid" id="ht-grid" style="grid-template-columns: repeat(${gridSize}, 60px);"></div>
      </div>
    `;

    const grid = el.querySelector('#ht-grid') as HTMLElement;
    const msg = el.querySelector('#ht-msg') as HTMLElement;
    const pads: HTMLElement[] = [];
    const totalPads = gridSize * gridSize;

    let isPlaying = false;
    let sequence: number[] = [];
    let userStep = 0;
    let t0 = performance.now();

    for (let i = 0; i < totalPads; i++) {
      const pad = document.createElement('div');
      pad.className = 'ht-pad';
      pad.onclick = () => onPadClick(i);
      pads.push(pad);
      grid.appendChild(pad);
    }

    const playSequence = async () => {
      isPlaying = true;
      userStep = 0;
      sequence = [];
      msg.textContent = 'Запоминайте...';
      msg.style.color = 'var(--text)';

      let last = -1;
      for (let i = 0; i < span; i++) {
        let n;
        do { n = Math.floor(Math.random() * totalPads); } while (n === last);
        last = n;
        sequence.push(n);
      }

      await new Promise(r => setTimeout(r, 800));
      if (isGameOver) return;

      for (let i = 0; i < sequence.length; i++) {
        if (isGameOver) return;
        const p = pads[sequence[i]];
        p.classList.add('halo');
        await new Promise(r => setTimeout(r, flashTime));
        p.classList.remove('halo');
        await new Promise(r => setTimeout(r, 200));
      }

      if (isGameOver) return;
      msg.textContent = 'Повторите!';
      msg.style.color = 'var(--accent, #3b82f6)';
      isPlaying = false;
      t0 = performance.now();
    };

    const onPadClick = (idx: number) => {
      if (isPlaying || isGameOver) return;

      const expected = sequence[userStep];
      const p = pads[idx];

      if (idx === expected) {
        p.classList.add('correct');
        setTimeout(() => p.classList.remove('correct'), 200);
        userStep++;

        if (userStep === sequence.length) {
          rounds++;
          correct++;
          rts.push(performance.now() - t0);
          msg.textContent = 'Отлично!';
          msg.style.color = 'var(--ok, #10b981)';
          
          if (correct % 2 === 0) {
             span++;
          }
          
          checkEnd();
        }
      } else {
        rounds++;
        rts.push(performance.now() - t0);
        p.classList.add('wrong');
        setTimeout(() => p.classList.remove('wrong'), 400);
        msg.textContent = 'Ошибка';
        msg.style.color = 'var(--danger, #ef4444)';
        
        span = Math.max(3, span - 1);
        checkEnd();
      }
    };

    const checkEnd = () => {
      isPlaying = true;
      if (isTimeUp()) {
        setTimeout(endBlock, 1000);
      } else {
        setTimeout(playSequence, 1000);
      }
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    playSequence();

    return () => { isGameOver = true; };
  }
};

export default haloTraceModule;
