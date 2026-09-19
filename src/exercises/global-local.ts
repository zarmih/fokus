import { ExerciseModule, BlockResult } from './contract';

const globalLocalModule: ExerciseModule = {
  manifest: {
    id: 'global-local',
    name: 'Глобальный Фокус',
    domain: 'attention',
    skills: ['selective_attention', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите большую или маленькую фигуру (букву) в зависимости от задания.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .gl-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 2rem;
          font-family: system-ui, sans-serif;
        }
        .gl-prompt {
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem 2rem;
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        .gl-prompt.global { color: #60a5fa; box-shadow: 0 0 20px rgba(96, 165, 250, 0.2); border: 2px solid #3b82f6; }
        .gl-prompt.local { color: #f472b6; box-shadow: 0 0 20px rgba(244, 114, 182, 0.2); border: 2px solid #ec4899; }
        
        .gl-figure-container {
          background: rgba(0, 0, 0, 0.2);
          padding: 2rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: transform 0.2s;
        }
        
        .gl-grid {
          display: grid;
          grid-template-columns: repeat(5, 30px);
          grid-template-rows: repeat(5, 30px);
          gap: 4px;
        }
        
        .gl-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          color: #e2e8f0;
        }
        
        .gl-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }
        
        .gl-btn {
          padding: 1.2rem;
          font-size: 1.5rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .gl-btn:active {
          transform: scale(0.95);
        }
      </style>
      <div class="gl-arena">
        <div class="gl-prompt" id="gl-prompt"></div>
        <div class="gl-figure-container" id="gl-fig-container">
          <div class="gl-grid" id="gl-grid"></div>
        </div>
        <div class="gl-options" id="gl-options"></div>
      </div>
    `;

    const promptEl = el.querySelector('#gl-prompt') as HTMLElement;
    const gridEl = el.querySelector('#gl-grid') as HTMLElement;
    const optsEl = el.querySelector('#gl-options') as HTMLElement;
    const figContainer = el.querySelector('#gl-fig-container') as HTMLElement;

    type ShapePattern = number[];
    const patterns: Record<string, ShapePattern> = {
      'H': [
        1,0,0,0,1,
        1,0,0,0,1,
        1,1,1,1,1,
        1,0,0,0,1,
        1,0,0,0,1
      ],
      'X': [
        1,0,0,0,1,
        0,1,0,1,0,
        0,0,1,0,0,
        0,1,0,1,0,
        1,0,0,0,1
      ],
      'O': [
        1,1,1,1,1,
        1,0,0,0,1,
        1,0,0,0,1,
        1,0,0,0,1,
        1,1,1,1,1
      ],
      'C': [
        1,1,1,1,1,
        1,0,0,0,0,
        1,0,0,0,0,
        1,0,0,0,0,
        1,1,1,1,1
      ],
      'U': [
        1,0,0,0,1,
        1,0,0,0,1,
        1,0,0,0,1,
        1,0,0,0,1,
        0,1,1,1,0
      ]
    };

    const letters = Object.keys(patterns);
    let t0 = performance.now();
    let currentTarget = '';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      const bigLetter = letters[Math.floor(Math.random() * letters.length)];
      let smallLetter;
      do {
        smallLetter = letters[Math.floor(Math.random() * letters.length)];
      } while (smallLetter === bigLetter);

      // Mode: 'global' (big) or 'local' (small)
      // Switch probability increases with level
      const switchProb = 0.3 + Math.min(0.5, level * 0.05);
      const mode = Math.random() < switchProb ? 'local' : 'global';
      
      currentTarget = mode === 'global' ? bigLetter : smallLetter;

      promptEl.textContent = mode === 'global' ? 'БОЛЬШАЯ БУКВА' : 'МАЛЕНЬКАЯ БУКВА';
      promptEl.className = `gl-prompt ${mode}`;

      // Render grid
      const pattern = patterns[bigLetter];
      gridEl.innerHTML = pattern.map(v => 
        `<div class="gl-cell">${v ? smallLetter : ''}</div>`
      ).join('');

      // Render options
      const options = new Set<string>();
      options.add(currentTarget);
      
      // Add the other (distractor) letter to make it tricky
      options.add(mode === 'global' ? smallLetter : bigLetter);
      
      while(options.size < 4) {
        options.add(letters[Math.floor(Math.random() * letters.length)]);
      }
      
      const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

      optsEl.innerHTML = shuffledOptions.map(opt => 
        `<button class="gl-btn" data-val="${opt}">${opt}</button>`
      ).join('');

      const btns = optsEl.querySelectorAll('.gl-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = (e.target as HTMLElement).getAttribute('data-val');
          handleAns(val === currentTarget);
        });
      });

      t0 = performance.now();
    };

    const handleAns = (isCorrect: boolean) => {
      if (isGameOver) return;
      rounds++;
      
      if (isCorrect) {
        correct++;
        figContainer.style.background = 'rgba(16, 185, 129, 0.2)';
        figContainer.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      } else {
        errors++;
        figContainer.style.background = 'rgba(239, 68, 68, 0.2)';
        figContainer.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      }
      
      rts.push(performance.now() - t0);
      
      setTimeout(() => {
        if (!isGameOver) {
          figContainer.style.background = 'rgba(0, 0, 0, 0.2)';
          figContainer.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          startRound();
        }
      }, 150);
    };

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

export default globalLocalModule;
