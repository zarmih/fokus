import { ExerciseModule, BlockResult } from './contract';

const objectTrackingModule: ExerciseModule = {
  manifest: {
    id: 'object-tracking',
    name: 'Наперстки',
    domain: 'memory',
    skills: ['working_memory', 'sustained_attention'],
    metricModel: 'memory-span',
    instruction: 'Следите за стаканом, под которым спрятан шарик. Когда они остановятся — выберите его.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ot-arena {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ot-container {
          position: relative;
          width: 320px;
          height: 120px;
        }
        .ot-cup {
          position: absolute;
          width: 80px;
          height: 100px;
          background: var(--surface);
          border: 3px solid var(--line);
          border-radius: 16px 16px 4px 4px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 12px;
          transition: transform 0.3s ease-in-out, top 0.3s ease-in-out;
          cursor: pointer;
          z-index: 2;
        }
        .ot-cup.lifted {
          top: -40px;
        }
        .ot-ball {
          position: absolute;
          width: 30px;
          height: 30px;
          background: var(--accent);
          border-radius: 50%;
          bottom: 12px;
          z-index: 1;
          opacity: 0;
        }
        .ot-ball.visible {
          opacity: 1;
        }
      </style>
      <div class="ot-arena">
        <div class="ot-container" id="ot-container">
          <div class="ot-cup" id="cup-0" style="left: 0px; top: 0px;"></div>
          <div class="ot-cup" id="cup-1" style="left: 120px; top: 0px;"></div>
          <div class="ot-cup" id="cup-2" style="left: 240px; top: 0px;"></div>
          <div class="ot-ball" id="ot-ball" style="left: 25px;"></div>
        </div>
      </div>
    `;

    const cups = [
      el.querySelector('#cup-0') as HTMLElement,
      el.querySelector('#cup-1') as HTMLElement,
      el.querySelector('#cup-2') as HTMLElement
    ];
    const ball = el.querySelector('#ot-ball') as HTMLElement;

    let targetIdx = 1;
    let positions = [0, 1, 2]; // maps visual position (0,1,2) to cup object (0,1,2)
    let cupToPos = [0, 1, 2]; // maps cup object (0,1,2) to visual position (0,1,2)
    
    let t0 = performance.now();
    let phase = 'wait';

    const getXForPos = (pos: number) => pos * 120;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'wait';
      positions = [0, 1, 2];
      cupToPos = [0, 1, 2];

      cups.forEach((c, i) => {
        c.style.left = `${getXForPos(i)}px`;
        c.style.top = '0px';
        c.style.borderColor = 'var(--line)';
      });

      targetIdx = Math.floor(Math.random() * 3);
      ball.style.left = `${getXForPos(targetIdx) + 25}px`;
      ball.classList.add('visible');

      // Lift target cup
      setTimeout(() => {
        if (isGameOver) return;
        cups[targetIdx].classList.add('lifted');
        
        setTimeout(() => {
          if (isGameOver) return;
          cups[targetIdx].classList.remove('lifted');
          ball.classList.remove('visible');
          
          setTimeout(() => {
            if (isGameOver) return;
            startShuffling();
          }, 500);
        }, 1000);
      }, 500);
    };

    const startShuffling = () => {
      let swaps = 0;
      const totalSwaps = level > 5 ? 10 : (level > 2 ? 7 : 5);
      const speed = level > 5 ? 250 : 350;

      cups.forEach(c => c.style.transitionDuration = `${speed}ms`);

      const doSwap = () => {
        if (isGameOver) return;
        if (swaps >= totalSwaps) {
          phase = 'input';
          t0 = performance.now();
          cups.forEach(c => c.style.transitionDuration = '0.1s'); // reset
          return;
        }

        // pick two random different positions to swap
        let p1 = Math.floor(Math.random() * 3);
        let p2 = Math.floor(Math.random() * 3);
        while (p2 === p1) {
          p2 = Math.floor(Math.random() * 3);
        }

        const cup1 = positions[p1];
        const cup2 = positions[p2];

        // swap in arrays
        positions[p1] = cup2;
        positions[p2] = cup1;
        cupToPos[cup1] = p2;
        cupToPos[cup2] = p1;

        // visually swap
        cups[cup1].style.left = `${getXForPos(p2)}px`;
        cups[cup2].style.left = `${getXForPos(p1)}px`;

        swaps++;
        setTimeout(doSwap, speed + 50);
      };

      doSwap();
    };

    cups.forEach((c, i) => {
      c.onclick = () => {
        if (phase !== 'input' || isGameOver) return;
        phase = 'result';
        
        const pos = cupToPos[i];
        
        rounds++;
        rts.push(performance.now() - t0);

        ball.style.left = `${getXForPos(cupToPos[targetIdx]) + 25}px`;
        ball.classList.add('visible');
        cups[targetIdx].classList.add('lifted');

        if (i === targetIdx) {
          correct++;
          c.style.borderColor = 'var(--ok)';
        } else {
          c.style.borderColor = 'var(--danger)';
          cups[targetIdx].style.borderColor = 'var(--ok)';
          c.classList.add('lifted');
        }

        setTimeout(() => {
          if (isGameOver) return;
          cups.forEach(cup => cup.classList.remove('lifted'));
          ball.classList.remove('visible');
          setTimeout(startRound, 500);
        }, 1500);
      };
    });

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default objectTrackingModule;
