import { ExerciseModule, BlockResult } from './contract';

const shellGameModule: ExerciseModule = {
  manifest: {
    id: 'shell-game',
    name: 'Напёрстки',
    domain: 'attention',
    skills: ['sustained_attention', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за шариком. После перемешивания укажите, под каким напёрстком он скрыт.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sg-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .sg-stage {
          position: relative;
          width: 320px;
          height: 120px;
        }
        .sg-shell {
          position: absolute;
          width: 80px;
          height: 80px;
          background: var(--surface);
          border: 4px solid var(--line);
          border-radius: 16px 16px 4px 4px;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          transition: transform 0.3s ease-in-out, border-color 0.2s;
          z-index: 2;
        }
        .sg-shell.clickable { cursor: pointer; }
        .sg-shell.clickable:hover { border-color: var(--accent); }
        .sg-ball {
          position: absolute;
          width: 32px;
          height: 32px;
          background: var(--danger);
          border-radius: 50%;
          bottom: 10px;
          z-index: 1;
        }
      </style>
      <div class="sg-arena">
        <div class="sg-stage" id="sg-stage"></div>
      </div>
    `;

    const stage = el.querySelector('#sg-stage') as HTMLElement;
    
    let t0 = performance.now();
    let phase = 'show';
    let targetIdx = 0;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'show';
      stage.innerHTML = '';

      const count = level > 5 ? 4 : 3;
      stage.style.width = `${count * 100}px`;

      targetIdx = Math.floor(Math.random() * count);
      let positions = Array.from({length: count}, (_, i) => i);
      
      const ball = document.createElement('div');
      ball.className = 'sg-ball';
      ball.style.left = `${targetIdx * 100 + 34}px`; // center in 80px shell (100px total slot)
      stage.appendChild(ball);

      const shells: HTMLElement[] = [];
      for (let i = 0; i < count; i++) {
        const shell = document.createElement('div');
        shell.className = 'sg-shell';
        shell.style.left = `${i * 100 + 10}px`; // 10px margin in 100px slot
        stage.appendChild(shell);
        shells.push(shell);
      }

      // Initial reveal
      shells[targetIdx].style.transform = 'translateY(-60px)';

      setTimeout(async () => {
        if (isGameOver) return;
        shells[targetIdx].style.transform = 'translateY(0)';
        
        await new Promise(r => setTimeout(r, 600));

        phase = 'shuffle';
        let shuffles = Math.max(3, 2 + Math.floor(level / 2));
        const speed = Math.max(150, 400 - level * 40);

        for (let s = 0; s < shuffles; s++) {
          if (isGameOver) return;
          
          let i1 = Math.floor(Math.random() * count);
          let i2;
          do { i2 = Math.floor(Math.random() * count); } while (i1 === i2);

          // swap positions
          const temp = positions[i1];
          positions[i1] = positions[i2];
          positions[i2] = temp;

          shells[i1].style.transition = `left ${speed}ms ease-in-out`;
          shells[i2].style.transition = `left ${speed}ms ease-in-out`;
          shells[i1].style.left = `${positions[i1] * 100 + 10}px`;
          shells[i2].style.left = `${positions[i2] * 100 + 10}px`;

          await new Promise(r => setTimeout(r, speed + 50));
        }

        if (isGameOver) return;
        phase = 'input';
        t0 = performance.now();

        shells.forEach((shell, originalIdx) => {
          shell.classList.add('clickable');
          shell.onclick = () => {
            if (phase !== 'input') return;
            phase = 'result';
            rounds++;
            rts.push(performance.now() - t0);

            // update ball position to where target is currently
            ball.style.left = `${positions[targetIdx] * 100 + 34}px`;
            
            // Lift clicked shell
            shell.style.transform = 'translateY(-60px)';
            
            if (originalIdx === targetIdx) {
              correct++;
              shell.style.borderColor = 'var(--ok)';
            } else {
              shell.style.borderColor = 'var(--danger)';
              // lift actual target too
              shells[targetIdx].style.transform = 'translateY(-60px)';
            }

            setTimeout(startRound, 1500);
          };
        });

      }, 1000);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default shellGameModule;
