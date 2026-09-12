import { ExerciseModule, BlockResult } from './contract';

const emberTapModule: ExerciseModule = {
  manifest: {
    id: 'ember-tap',
    name: 'Тлеющий',
    domain: 'attention',
    skills: ['selective_attention', 'reaction_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажмите на уголёк, когда он вспыхнет (станет ярким).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .et-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: var(--surface);
        }
        .et-ember {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #442222;
          box-shadow: 0 0 10px #220000;
          cursor: pointer;
          transition: background 0.1s, transform 0.1s;
        }
        .et-ember.glow {
          background: #ff4400;
          box-shadow: 0 0 40px #ff4400;
          transform: scale(1.1);
        }
      </style>
      <div class="et-arena">
        <div class="et-ember" id="et-ember"></div>
      </div>
    `;

    const ember = el.querySelector('#et-ember') as HTMLElement;
    
    let phase = 'wait';
    let t0 = 0;
    let timer: any;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'wait';
      ember.classList.remove('glow');
      
      const delay = 1000 + Math.random() * (3000 - level * 100);
      
      timer = setTimeout(() => {
        if (isGameOver) return;
        phase = 'glow';
        ember.classList.add('glow');
        t0 = performance.now();
        
        // Timeout to miss
        timer = setTimeout(() => {
          if (isGameOver) return;
          handleHit(false, 0);
        }, 1500 - level * 50);
      }, delay);
    };

    const handleHit = (hit: boolean, rt: number) => {
      clearTimeout(timer);
      if (phase !== 'glow') {
        // false start could be penalized, but we'll ignore or restart
        return;
      }
      phase = 'result';
      rounds++;
      
      if (hit) {
        correct++;
        rts.push(rt);
        ember.style.background = 'var(--ok)';
      } else {
        ember.style.background = 'var(--danger)';
      }
      
      setTimeout(() => {
        ember.style.background = '';
        startRound();
      }, 500);
    };

    ember.onpointerdown = () => {
      if (phase === 'glow') {
        handleHit(true, performance.now() - t0);
      } else if (phase === 'wait') {
        // penalty for early click
        clearTimeout(timer);
        phase = 'result';
        rounds++;
        ember.style.background = 'var(--danger)';
        setTimeout(() => {
          ember.style.background = '';
          startRound();
        }, 500);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        ember.onpointerdown?.(new PointerEvent('pointerdown'));
      }
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timer);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default emberTapModule;
