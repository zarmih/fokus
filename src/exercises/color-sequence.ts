import { ExerciseModule, BlockResult } from './contract';

const colorSequenceModule: ExerciseModule = {
  manifest: {
    id: 'color-sequence',
    name: 'Эхо',
    domain: 'memory',
    skills: ['working_memory', 'visual_memory'],
    metricModel: 'memory-span',
    instruction: 'Запоминайте последовательность вспышек и повторяйте её.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let sequence: number[] = [];
    let userStep = 0;
    let span = Math.max(3, Math.floor(level) + 2);
    let rts: number[] = [];
    
    const colors = ['#ef4444', '#3b82f6', '#eab308', '#10b981'];

    el.innerHTML = `
      <style>
        .cs-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .cs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .cs-pad {
          width: 100px;
          height: 100px;
          border-radius: 16px;
          cursor: pointer;
          opacity: 0.3;
          transition: opacity 0.1s, transform 0.1s;
        }
        .cs-pad.active {
          opacity: 1;
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255,255,255,0.2);
        }
        .cs-pad:active {
          transform: scale(0.95);
        }
      </style>
      <div class="cs-arena">
        <div class="cs-grid" id="cs-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#cs-grid') as HTMLElement;
    const pads: HTMLElement[] = [];
    
    colors.forEach((c, idx) => {
      const pad = document.createElement('div');
      pad.className = 'cs-pad';
      pad.style.background = c;
      pad.onclick = () => onPadClick(idx);
      pads.push(pad);
      grid.appendChild(pad);
    });

    let isPlaying = false;
    let t0 = performance.now();

    const playSequence = async () => {
      isPlaying = true;
      userStep = 0;
      sequence = [];
      
      let last = -1;
      for (let i = 0; i < span; i++) {
        let n;
        do { n = Math.floor(Math.random() * 4); } while(n === last && Math.random() > 0.3);
        last = n;
        sequence.push(n);
      }

      await new Promise(r => setTimeout(r, 800));
      if (isGameOver) return;

      for (let i = 0; i < sequence.length; i++) {
        if (isGameOver) return;
        const p = pads[sequence[i]];
        p.classList.add('active');
        await new Promise(r => setTimeout(r, 400));
        p.classList.remove('active');
        await new Promise(r => setTimeout(r, 200));
      }
      
      isPlaying = false;
      t0 = performance.now();
    };

    const onPadClick = (idx: number) => {
      if (isPlaying || isGameOver) return;
      
      const p = pads[idx];
      p.classList.add('active');
      setTimeout(() => p.classList.remove('active'), 200);
      
      if (sequence[userStep] === idx) {
        userStep++;
        if (userStep === sequence.length) {
          totalRounds++;
          correctRounds++;
          span++;
          rts.push(performance.now() - t0);
          checkEnd();
        }
      } else {
        // wrong
        totalRounds++;
        span = Math.max(3, span - 1);
        rts.push(performance.now() - t0);
        
        // flash red overlay or shake
        grid.style.transform = 'translateX(10px)';
        setTimeout(() => grid.style.transform = 'translateX(-10px)', 100);
        setTimeout(() => grid.style.transform = 'translateX(0)', 200);
        
        checkEnd();
      }
    };

    const checkEnd = () => {
      if (isTimeUp()) {
        endBlock();
      } else {
        setTimeout(playSequence, 800);
      }
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    playSequence();

    return () => { isGameOver = true; };
  }
};

export default colorSequenceModule;
