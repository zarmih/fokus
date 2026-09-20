import { ExerciseModule, BlockResult } from './contract';

const dualLabelModule: ExerciseModule = {
  manifest: {
    id: 'dual-label',
    name: 'Двойная метка',
    domain: 'flexibility',
    skills: ['task_switching', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Ориентируйтесь на верхнюю метку. Если "ФОРМА" — выбирайте форму, если "СЛОВО" — ориентируйтесь на значение слова.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const switchProb = Math.min(0.5, 0.2 + level * 0.05);

    el.innerHTML = `
      <style>
        .dl-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 32px;
        }
        .dl-cue {
          font-size: 32px;
          font-weight: bold;
          padding: 12px 32px;
          border-radius: 16px;
          background: rgba(255,255,255,0.1);
          border: 2px solid var(--line, #333);
          transition: transform 0.2s, background 0.2s;
        }
        .dl-card {
          width: 240px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 24px;
          background: var(--surface, #1e293b);
          border: 4px solid var(--line, #333);
          font-size: 40px;
          font-weight: bold;
          color: white;
          position: relative;
        }
        .dl-shape {
           position: absolute;
           font-size: 140px;
           opacity: 0.3;
           z-index: 1;
        }
        .dl-word {
           position: relative;
           z-index: 2;
           text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
        .dl-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 400px;
        }
        .dl-btn {
          padding: 16px 24px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--line, #333);
          cursor: pointer;
          transition: background 0.1s, transform 0.1s;
          color: var(--text, #fff);
          min-width: 120px;
        }
        .dl-btn:active { transform: scale(0.95); }
      </style>
      <div class="dl-arena">
        <div class="dl-cue" id="dl-cue">ФОРМА</div>
        <div class="dl-card" id="dl-card">
           <div class="dl-shape" id="dl-shape"></div>
           <div class="dl-word" id="dl-word"></div>
        </div>
        <div class="dl-controls" id="dl-controls"></div>
      </div>
    `;

    const cueEl = el.querySelector('#dl-cue') as HTMLElement;
    const shapeEl = el.querySelector('#dl-shape') as HTMLElement;
    const wordEl = el.querySelector('#dl-word') as HTMLElement;
    const controls = el.querySelector('#dl-controls') as HTMLElement;

    const shapes = ['КРУГ', 'КВАДРАТ', 'РОМБ'];
    const words = ['ЯБЛОКО', 'ДЕРЕВО', 'КОТ'];
    const shapeIcons: Record<string, string> = { 'КРУГ': '⬤', 'КВАДРАТ': '■', 'РОМБ': '◆' };

    let currentCue = 'ФОРМА';
    let t0 = performance.now();
    let phase = 'input';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';

      if (Math.random() < switchProb) {
        currentCue = currentCue === 'ФОРМА' ? 'СЛОВО' : 'ФОРМА';
      }

      cueEl.textContent = currentCue;
      cueEl.style.color = currentCue === 'ФОРМА' ? '#3b82f6' : '#eab308';
      cueEl.style.borderColor = currentCue === 'ФОРМА' ? '#3b82f6' : '#eab308';

      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const word = words[Math.floor(Math.random() * words.length)];

      shapeEl.textContent = shapeIcons[shape];
      wordEl.textContent = word;

      controls.innerHTML = '';
      
      const correctAns = currentCue === 'ФОРМА' ? shape : word;
      
      let options = new Set<string>();
      options.add(correctAns);
      options.add(currentCue === 'ФОРМА' ? word : shape);
      
      const pool = currentCue === 'ФОРМА' ? shapes : words;
      while(options.size < 3) {
        options.add(pool[Math.floor(Math.random() * pool.length)]);
      }

      const optsArr = Array.from(options).sort(() => Math.random() - 0.5);

      optsArr.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'dl-btn';
        btn.textContent = opt;
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (opt === correctAns) {
            correct++;
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
            btn.style.borderColor = '#10b981';
          } else {
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            btn.style.borderColor = '#ef4444';
          }

          setTimeout(startRound, 400);
        };
        controls.appendChild(btn);
      });

      t0 = performance.now();
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

export default dualLabelModule;
