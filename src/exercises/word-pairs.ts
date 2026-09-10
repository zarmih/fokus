import { ExerciseModule, BlockResult } from './contract';

const wordPairsModule: ExerciseModule = {
  manifest: {
    id: 'word-pairs',
    name: 'Связки',
    domain: 'memory',
    skills: ['working_memory', 'sustained_attention'],
    metricModel: 'speed-accuracy', // can be speed-accuracy but accuracy is priority
    instruction: 'Запомните пары связанных объектов. Затем для предложенного объекта выберите его пару.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .wp-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .wp-pairs-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .wp-pair {
          display: flex;
          align-items: center;
          gap: 24px;
          background: rgba(255,255,255,0.05);
          padding: 16px 32px;
          border-radius: 16px;
          font-size: 40px;
        }
        .wp-question {
          font-size: 80px;
          margin-bottom: 24px;
        }
        .wp-controls {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .wp-btn {
          width: 120px;
          height: 120px;
          font-size: 48px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .wp-btn:active { transform: scale(0.95); }
      </style>
      <div class="wp-arena" id="wp-arena"></div>
    `;

    const arena = el.querySelector('#wp-arena') as HTMLElement;

    let t0 = performance.now();
    let phase = 'memorize';
    let targetAnswer = '';

    const items = ['🏠','🌳','🚗','⛽','🐶','🦴','🐱','🐟','🐭','🧀','🐰','🥕','🐒','🍌','🐝','🍯','🐔','🥚','🕷','🕸'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      
      const count = level > 5 ? 4 : (level > 2 ? 3 : 2);
      
      const pool = [...items].sort(() => Math.random() - 0.5);
      const pairs: {q: string, a: string}[] = [];
      for (let i = 0; i < count; i++) {
        pairs.push({ q: pool.pop()!, a: pool.pop()! });
      }

      arena.innerHTML = '<div class="wp-pairs-list" id="wp-pairs-list"></div>';
      const list = arena.querySelector('#wp-pairs-list') as HTMLElement;
      
      pairs.forEach(p => {
        const div = document.createElement('div');
        div.className = 'wp-pair';
        div.innerHTML = `<div>${p.q}</div> <div>—</div> <div>${p.a}</div>`;
        list.appendChild(div);
      });

      const memoTime = 3000 + count * 1000;

      setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        
        const targetPair = pairs[Math.floor(Math.random() * pairs.length)];
        const isReverse = Math.random() > 0.5;
        
        const question = isReverse ? targetPair.a : targetPair.q;
        targetAnswer = isReverse ? targetPair.q : targetPair.a;

        arena.innerHTML = `
          <div class="wp-question">${question}</div>
          <div class="wp-controls" id="wp-controls"></div>
        `;

        const controls = arena.querySelector('#wp-controls') as HTMLElement;
        
        const options = [targetAnswer];
        while(options.length < 4) {
          const fake = isReverse ? pairs[Math.floor(Math.random() * pairs.length)].q : pairs[Math.floor(Math.random() * pairs.length)].a;
          if(!options.includes(fake)) options.push(fake);
        }
        
        // if we couldn't find enough fakes from current pairs, use random items
        while(options.length < 4) {
          const fake = items[Math.floor(Math.random() * items.length)];
          if(!options.includes(fake)) options.push(fake);
        }

        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'wp-btn';
          btn.textContent = opt;
          btn.onclick = () => {
            if (phase !== 'input') return;
            phase = 'result';
            rounds++;
            rts.push(performance.now() - t0);

            if (opt === targetAnswer) {
              correct++;
              btn.style.borderColor = 'var(--ok)';
              btn.style.background = 'rgba(16, 185, 129, 0.2)';
            } else {
              btn.style.borderColor = 'var(--danger)';
              btn.style.background = 'rgba(239, 68, 68, 0.2)';
            }

            setTimeout(startRound, 1000);
          };
          controls.appendChild(btn);
        });

        t0 = performance.now();

      }, memoTime);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default wordPairsModule;
